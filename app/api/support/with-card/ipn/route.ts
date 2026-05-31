import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { adminDb } from "@/db/firebaseAdmin";
import { createNotification } from "@/lib/adminNotifications";
import { transporter } from "@/lib/emailTransporter";

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function POST(req: Request) {
  try {
    const { OrderTrackingId, OrderMerchantReference, OrderNotificationType } =
      await req.json();

    if (OrderNotificationType !== "IPNCHANGE") {
      return NextResponse.json({
        orderNotificationType: OrderNotificationType,
        orderTrackingId: OrderTrackingId,
        orderMerchantReference: OrderMerchantReference,
        status: 200,
      });
    }

    const authRes = await fetch(
      `${process.env.PESAPAL_URL}/api/Auth/RequestToken`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consumer_key: process.env.PESAPAL_CONSUMER_KEY,
          consumer_secret: process.env.PESAPAL_CONSUMER_SECRET,
        }),
      },
    );
    const { token } = await authRes.json();

    const statusRes = await fetch(
      `${process.env.PESAPAL_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${OrderTrackingId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      },
    );
    const statusData = await statusRes.json();

    const txQuery = await adminDb
      .collection("transactions")
      .where("ref", "==", OrderMerchantReference)
      .limit(1)
      .get();

    if (txQuery.empty) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 },
      );
    }

    const txDoc = txQuery.docs[0];
    const txData = txDoc.data();

    if (txData.status === "successful" || txData.status === "success") {
      return NextResponse.json({ status: 200, message: "Already processed" });
    }

    if (statusData.payment_status_description === "Completed") {
      const totalAmount = Number(txData.amount);
      const txType = txData.type || "support";
      const batch = adminDb.batch();

      batch.update(txDoc.ref, {
        status: "successful",
        pesapal_tracking_id: OrderTrackingId,
        payment_method: statusData.payment_method || "card",
        successfulAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      if (txType === "store") {
        const platformFee = Number(txData.platformFee) || 0;
        const creatorEarnings = Number(txData.creatorEarnings) || 0;
        const referralEarnings = Number(txData.referralEarnings) || 0;
        const productId = txData.productId;
        const quantity = Number(txData.quantity) || 1;

        let productData = null;
        if (productId) {
          const productSnap = await adminDb
            .collection("storeProducts")
            .doc(productId)
            .get();
          productData = productSnap.data();
        }

        batch.set(adminDb.collection("platformIncome").doc(), {
          amount: platformFee,
          txRef: OrderMerchantReference,
          reason: "product_sale_platform_fee",
          productId: productId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        batch.set(adminDb.collection("creatorIncome").doc(), {
          creatorUid: txData.creatorUid,
          amount: creatorEarnings,
          txRef: OrderMerchantReference,
          reason: "product_sale",
          productId: productId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        if (referralEarnings > 0 && txData.referralUid) {
          batch.set(adminDb.collection("creatorIncome").doc(), {
            creatorUid: txData.referralUid,
            amount: referralEarnings,
            txRef: OrderMerchantReference,
            reason: "referral_commission",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          batch.update(adminDb.collection("creators").doc(txData.referralId), {
            totalEarnings: admin.firestore.FieldValue.increment(referralEarnings),
            pendingPayout: admin.firestore.FieldValue.increment(referralEarnings),
          });
        }

        const orderRef = adminDb.collection("storeOrders").doc();
        batch.set(orderRef, {
          orderId: orderRef.id,
          txRef: OrderMerchantReference,
          buyerId: txData.buyerId,
          buyerName: txData.buyerName || "",
          creatorId: txData.creatorId,
          creatorUid: txData.creatorUid,
          productId: productId,
          productName: txData.productName,
          selectedSize: txData.selectedSize || "",
          quantity: quantity,
          productPrice: txData.productPrice,
          platformFee: platformFee,
          totalAmount: totalAmount,
          platformFeePayer: txData.platformFeePayer || "buyer",
          status: "paid",
          paymentMethod: "card",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        batch.set(adminDb.collection("sales").doc(), {
          txRef: OrderMerchantReference,
          buyerId: txData.buyerId,
          buyerName: txData.buyerName || "",
          buyerEmail: txData.buyerEmail || "",
          creatorId: txData.creatorId,
          creatorUid: txData.creatorUid,
          productId: productId,
          productName: txData.productName,
          quantity: quantity,
          productPrice: txData.productPrice,
          totalAmount: totalAmount,
          platformFee: platformFee,
          creatorEarnings: creatorEarnings,
          referralEarnings: referralEarnings,
          referralUid: txData.referralUid || null,
          status: "completed",
          paymentMethod: "card",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        batch.update(adminDb.collection("creators").doc(txData.creatorId), {
          totalEarnings: admin.firestore.FieldValue.increment(creatorEarnings),
          pendingPayout: admin.firestore.FieldValue.increment(creatorEarnings),
        });

        if (productId && productData?.type === "physical" && productData?.stock !== undefined) {
          batch.update(adminDb.collection("storeProducts").doc(productId), {
            stock: admin.firestore.FieldValue.increment(-quantity),
          });
        }

        if (txData.buyerId) {
          batch.update(adminDb.collection("profiles").doc(txData.buyerId), {
            totalPurchases: admin.firestore.FieldValue.increment(1),
            totalSpent: admin.firestore.FieldValue.increment(totalAmount),
          });
        }

         if (txData.creatorUid) {
           await createNotification({
             userId: txData.creatorUid,
             type: "new_sale",
             title: "New Sale!",
             message: `${txData.buyerName || "Someone"} purchased ${txData.productName || "a product"} for ${totalAmount.toLocaleString()} RWF`,
             metadata: {
               txRef: OrderMerchantReference,
               productId: productId,
               productName: txData.productName,
               buyerName: txData.buyerName,
               buyerEmail: txData.buyerEmail,
               amount: totalAmount,
               creatorEarnings: creatorEarnings,
             },
             link: "/creator/sales",
             actorName: txData.buyerName || undefined,
             actorId: txData.buyerId || undefined,
           });
         }
        } else if (txType === "booking") {
          const bookingId = txData.bookingId;
          if (bookingId) {
            const platformSharePercentage = txData.includeReferral
              ? Number(process.env.NEXT_PUBLIC_PLATFORM_SHARE_WITH_REFERRAL)
              : Number(process.env.NEXT_PUBLIC_PLATFORM_SHARE);

            const platformShare = totalAmount * platformSharePercentage;
            const creatorShare = totalAmount * Number(process.env.NEXT_PUBLIC_CREATOR_SHARE);
            const referralShare = totalAmount * Number(process.env.NEXT_PUBLIC_REFERRAL_SHARE);

            batch.set(adminDb.collection("platformIncome").doc(), {
              amount: platformShare,
              txRef: OrderMerchantReference,
              reason: "booking_fee",
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            batch.set(adminDb.collection("creatorIncome").doc(), {
              creatorUid: txData.creatorUid,
              amount: creatorShare,
              txRef: OrderMerchantReference,
              reason: "booking_payment",
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            batch.update(adminDb.collection("creators").doc(txData.creatorId), {
              totalEarnings: admin.firestore.FieldValue.increment(creatorShare),
              pendingPayout: admin.firestore.FieldValue.increment(creatorShare),
            });

            if (txData.includeReferral && txData.referralUid) {
              batch.set(adminDb.collection("creatorIncome").doc(), {
                creatorUid: txData.referralUid,
                amount: referralShare,
                txRef: OrderMerchantReference,
                reason: "referral_commission",
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
              });

              batch.update(adminDb.collection("creators").doc(txData.referralId), {
                totalEarnings: admin.firestore.FieldValue.increment(referralShare),
                pendingPayout: admin.firestore.FieldValue.increment(referralShare),
              });
            }

            batch.update(adminDb.collection("bookingRequests").doc(bookingId), {
              paymentStatus: "paid",
              status: "pending",
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            const buyerId = txData.buyerId || txData.supporterId || "";
            if (buyerId && buyerId !== "anonymous") {
              batch.update(adminDb.collection("profiles").doc(buyerId), {
                totalSupport: admin.firestore.FieldValue.increment(totalAmount),
                totalSupportedCreators: admin.firestore.FieldValue.increment(1),
              });
            }

            if (txData.creatorUid) {
              await createNotification({
                userId: txData.creatorUid,
                type: "booking_paid",
                title: "Booking Payment Received!",
                message: `Booking payment of ${totalAmount.toLocaleString()} RWF received from ${txData.buyerName || "a client"}`,
                metadata: {
                  txRef: OrderMerchantReference,
                  bookingId,
                  amount: totalAmount,
                  creatorShare,
                },
                link: "/creator/bookings",
                actorName: txData.buyerName || undefined,
                actorId: txData.buyerId || undefined,
              });
            }

            // Notify buyer/supporter that payment was successful
            if (buyerId && buyerId !== "anonymous") {
              await createNotification({
                userId: buyerId,
                type: "booking_paid",
                title: "Payment Confirmed!",
                message: `Your payment of ${totalAmount.toLocaleString()} RWF for booking with ${txData.creatorName || "creator"} is confirmed.`,
                metadata: { txRef: OrderMerchantReference, bookingId, amount: totalAmount },
                link: `/${txData.creatorId}/booking`,
                actorName: txData.creatorName || undefined,
                actorId: txData.creatorUid || undefined,
              });
            }

            // Email to buyer if email is available
            if (txData.bookerEmail) {
              try {
                await transporter.sendMail({
                  from: `"Agaseke" <${process.env.SMTP_USER}>`,
                  to: txData.bookerEmail,
                  subject: `Payment confirmed for your booking with ${txData.creatorName || "creator"}`,
                  html: `
                    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
                      <h2 style="color: #22c55e;">Payment Received!</h2>
                      <p>Hi ${txData.buyerName || txData.bookerName || ""},</p>
                      <p>Your payment of <strong>${totalAmount.toLocaleString()} RWF</strong> for your booking with <strong>${txData.creatorName || "creator"}</strong> has been confirmed.</p>
                      <p>The creator will review and confirm your meeting shortly.</p>
                      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                      <p style="color: #64748b; font-size: 12px;">Agaseke Platform</p>
                    </div>
                  `,
                });
              } catch (emailErr) {
                console.error("Failed to send payment confirmation email to buyer:", emailErr);
              }
            }

            // Notify admin about the successful booking transaction
            try {
              const adminsSnap = await adminDb.collection("profiles").where("isAdmin", "==", true).get();
              for (const adminDoc of adminsSnap.docs) {
                await createNotification({
                  userId: adminDoc.id,
                  type: "new_transaction",
                  title: "Booking Payment Completed",
                  message: `Booking payment of ${totalAmount.toLocaleString()} RWF from ${txData.buyerName || "a client"} to ${txData.creatorName || "creator"}`,
                  link: "/admin/transactions",
                });
              }
            } catch (adminNotifErr) {
              console.error("Failed to notify admins:", adminNotifErr);
            }
          }
        } else {
         const platformSharePercentage = txData.includeReferral
           ? Number(process.env.NEXT_PUBLIC_PLATFORM_SHARE_WITH_REFERRAL)
           : Number(process.env.NEXT_PUBLIC_PLATFORM_SHARE);

         const platformShare = totalAmount * platformSharePercentage;
         const creatorShare = totalAmount * Number(process.env.NEXT_PUBLIC_CREATOR_SHARE);
         const referralShare = totalAmount * Number(process.env.NEXT_PUBLIC_REFERRAL_SHARE);

         batch.set(adminDb.collection("platformIncome").doc(), {
           amount: platformShare,
           txRef: OrderMerchantReference,
           reason: "card_payment_fee",
           createdAt: admin.firestore.FieldValue.serverTimestamp(),
         });

         batch.set(adminDb.collection("creatorIncome").doc(), {
           creatorUid: txData.creatorUid,
           amount: creatorShare,
           txRef: OrderMerchantReference,
           reason: "support",
           createdAt: admin.firestore.FieldValue.serverTimestamp(),
         });

         batch.set(adminDb.collection("supportedCreators").doc(), {
           creatorId: txData.creatorId,
           amount: totalAmount,
           supporterId: txData.supporterId || null,
           txRef: OrderMerchantReference,
           createdAt: admin.firestore.FieldValue.serverTimestamp(),
         });

         batch.update(adminDb.collection("creators").doc(txData.creatorId), {
           totalEarnings: admin.firestore.FieldValue.increment(creatorShare),
           totalSupporters: admin.firestore.FieldValue.increment(1),
           pendingPayout: admin.firestore.FieldValue.increment(creatorShare),
         });

         if (txData.includeReferral && txData.referralUid) {
           batch.set(adminDb.collection("creatorIncome").doc(), {
             creatorUid: txData.referralUid,
             amount: referralShare,
             txRef: OrderMerchantReference,
             reason: "referral_commission",
             createdAt: admin.firestore.FieldValue.serverTimestamp(),
           });

           batch.update(adminDb.collection("creators").doc(txData.referralId), {
             totalEarnings: admin.firestore.FieldValue.increment(referralShare),
             pendingPayout: admin.firestore.FieldValue.increment(referralShare),
           });
         }

         if (txData.supporterId && txData.supporterId !== "anonymous") {
           batch.update(adminDb.collection("profiles").doc(txData.supporterId), {
             totalSupport: admin.firestore.FieldValue.increment(totalAmount),
             totalSupportedCreators: admin.firestore.FieldValue.increment(1),
           });
         }

          if (txData.creatorUid) {
            await createNotification({
              userId: txData.creatorUid,
              type: "support_received",
              title: "New Support Received!",
              message: `You received ${totalAmount.toLocaleString()} RWF in support${txData.supporterId && txData.supporterId !== "anonymous" ? "" : " from an anonymous supporter"}`,
              metadata: {
                txRef: OrderMerchantReference,
                amount: totalAmount,
                creatorShare: creatorShare,
              },
              link: "/creator/supporters",
              actorId: txData.supporterId !== "anonymous" ? txData.supporterId : undefined,
            });
          }
        }

       await batch.commit();
    } else {
      await txDoc.ref.update({
        status: "failed",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json({
      orderNotificationType: OrderNotificationType,
      orderTrackingId: OrderTrackingId,
      orderMerchantReference: OrderMerchantReference,
      status: 200,
    });
  } catch (error: any) {
    console.error("CRITICAL_IPN_ERROR:", error.message);
    return NextResponse.json(
      { error: "Internal processing error" },
      { status: 500 },
    );
  }
}