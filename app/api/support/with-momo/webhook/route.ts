import { NextResponse } from "next/server";
import crypto from "crypto";
import admin from "firebase-admin";
import { adminDb } from "@/db/firebaseAdmin";
import { createNotification } from "@/lib/adminNotifications";
import { transporter } from "@/lib/emailTransporter";

export async function HEAD() {
  return new Response(null, { status: 200 });
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("x-paypack-signature");
  const secret = process.env.PAYPACK_WEBHOOK_SECRET!;

  const hash = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("base64");

  if (hash !== signature) {
    await adminDb.collection("activityLogs").add({
      level: "error",
      category: "payment",
      message: "Momo webhook: Invalid signature",
      metadata: { signature, expectedHash: hash },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(body);
  const { ref, status, client } = payload.data;

  const txQuery = await adminDb
    .collection("transactions")
    .where("ref", "==", ref)
    .limit(1)
    .get();

  if (txQuery.empty) {
    await adminDb.collection("activityLogs").add({
      level: "error",
      category: "payment",
      message: "Momo webhook: Transaction not found",
      metadata: { ref },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ error: "Tx not found" }, { status: 404 });
  }

  const txDoc = txQuery.docs[0];
  const txData = txDoc.data();

  if (txData.status === "successful") {
    return NextResponse.json({ received: true, note: "Already processed" });
  }

  if (status === "successful") {
    const totalAmount = Number(txData.amount);
    const txType = txData.type || "support";
    const batch = adminDb.batch();

    batch.update(txDoc.ref, {
      status: "successful",
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
        txRef: ref,
        reason: "product_sale_platform_fee",
        productId: productId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      batch.set(adminDb.collection("creatorIncome").doc(), {
        creatorUid: txData.creatorUid,
        amount: creatorEarnings,
        txRef: ref,
        reason: "product_sale",
        productId: productId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      if (referralEarnings > 0 && txData.referralUid) {
        batch.set(adminDb.collection("creatorIncome").doc(), {
          creatorUid: txData.referralUid,
          amount: referralEarnings,
          txRef: ref,
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
        txRef: ref,
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
        paymentMethod: "momo",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      batch.set(adminDb.collection("sales").doc(), {
        txRef: ref,
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
        paymentMethod: "momo",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      batch.update(adminDb.collection("creators").doc(txData.creatorId), {
        totalEarnings: admin.firestore.FieldValue.increment(creatorEarnings),
        pendingPayout: admin.firestore.FieldValue.increment(creatorEarnings),
      });

      if (
        productId &&
        productData?.type === "physical" &&
        productData?.stock !== undefined
      ) {
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
            txRef: ref,
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
        const creatorShare =
          totalAmount * Number(process.env.NEXT_PUBLIC_CREATOR_SHARE);
        const referralShare =
          totalAmount * Number(process.env.NEXT_PUBLIC_REFERRAL_SHARE);

        batch.set(adminDb.collection("platformIncome").doc(), {
          amount: platformShare,
          txRef: ref,
          reason: "booking_fee",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        batch.set(adminDb.collection("creatorIncome").doc(), {
          creatorUid: txData.creatorUid,
          amount: creatorShare,
          txRef: ref,
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
            txRef: ref,
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
              txRef: ref,
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
            metadata: { txRef: ref, bookingId, amount: totalAmount },
            link: `/${txData.creatorId}/booking`,
            actorName: txData.creatorName || undefined,
            actorId: txData.creatorUid || undefined,
          });
        }

        // Email to creator — booking request notification after payment confirmed
        console.log(
          `[WEBHOOK_MOMO_EMAIL] Processing creator email for bookingId=${bookingId}, creatorUid=${txData.creatorUid}`,
        );
        if (txData.creatorUid) {
          try {
            const profileSnap = await adminDb
              .collection("profiles")
              .doc(txData.creatorUid)
              .get();
            if (!profileSnap.exists) {
              console.log(
                `[WEBHOOK_MOMO_EMAIL] No profile doc for creatorUid=${txData.creatorUid}`,
              );
            }
            const creatorProfileEmail = profileSnap.exists
              ? profileSnap.data()?.email || ""
              : "";
            console.log(
              `[WEBHOOK_MOMO_EMAIL] Resolved email="${creatorProfileEmail}" for creatorUid=${txData.creatorUid}`,
            );
            if (!creatorProfileEmail) {
              console.log(
                `[WEBHOOK_MOMO_EMAIL] No email found for creatorUid=${txData.creatorUid}, skipping email`,
              );
            } else {
              let bookingDate = "";
              let bookingTime = "";
              let bookingType = "";
              let bookingReason = "";
              try {
                const bookingSnap = await adminDb
                  .collection("bookingRequests")
                  .doc(bookingId)
                  .get();
                if (bookingSnap.exists) {
                  const bd = bookingSnap.data();
                  bookingDate = bd?.preferredDate || "";
                  bookingTime = bd?.preferredTime || "";
                  bookingType = bd?.preferredType || "both";
                  bookingReason = bd?.reason || "";
                }
              } catch (bookingFetchErr) {
                console.error(
                  `[WEBHOOK_MOMO_EMAIL] Failed to fetch booking details for ${bookingId}:`,
                  bookingFetchErr,
                );
                await adminDb.collection("activityLogs").add({
                  level: "error",
                  category: "payment",
                  message: `Momo webhook: Failed to fetch booking details for ${bookingId}`,
                  metadata: { ref, bookingId, errorData: JSON.stringify(bookingFetchErr, Object.getOwnPropertyNames(bookingFetchErr)).slice(0, 5000) },
                  createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });
              }

              try {
                const info = await transporter.sendMail({
                  from: `"Agaseke" <${process.env.SMTP_USER}>`,
                  to: creatorProfileEmail,
                  subject: `New booking request from ${txData.buyerName || txData.bookerName || "a client"}`,
                  html: `
                      <!DOCTYPE html>
                      <html>
                        <head>
                          <style>
                            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; }
                            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                            .header { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
                            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; }
                            .booking-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f97316; }
                            .booking-card p { margin: 8px 0; }
                            .reason { background: #fff7ed; padding: 15px; border-radius: 8px; margin: 20px 0; }
                            .cta { display: inline-block; background: #f97316; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 10px 5px; }
                            .footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
                          </style>
                        </head>
                        <body>
                          <div class="container">
                            <div class="header">
                              <h1 style="margin: 0; font-size: 24px;">New Booking Request</h1>
                            </div>
                            <div class="content">
                              <p>Hi ${txData.creatorName || "Creator"},</p>
                              <p><strong>${txData.buyerName || txData.bookerName || "A client"}</strong> has booked a meeting with you!</p>
                              <div class="booking-card">
                                <p><strong>Name:</strong> ${txData.buyerName || txData.bookerName || "N/A"}</p>
                                <p><strong>Email:</strong> ${txData.bookerEmail || "N/A"}</p>
                                <p><strong>Date:</strong> ${bookingDate || "N/A"}</p>
                                <p><strong>Time:</strong> ${bookingTime || "N/A"}</p>
                                <p><strong>Type:</strong> ${bookingType === "online" ? "Online" : bookingType === "physical" ? "In Person" : "Either"}</p>
                                <p><strong>Paid:</strong> ${totalAmount.toLocaleString()} RWF</p>
                              </div>
                              ${bookingReason ? `<div class="reason"><strong>Message:</strong><br>${bookingReason}</div>` : ""}
                              <p>Please log in to your dashboard to accept or decline this request.</p>
                              <div style="text-align: center; margin-top: 20px;">
                                <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://agaseke.me"}/creator/bookings" class="cta">Manage Bookings</a>
                              </div>
                              <div class="footer">
                                <p>This email was sent by Agaseke Platform</p>
                                <p>© ${new Date().getFullYear()} Agaseke. All rights reserved.</p>
                              </div>
                            </div>
                          </div>
                        </body>
                      </html>
                    `,
                });
                console.log(
                  `[WEBHOOK_MOMO_EMAIL] Email sent successfully to "${creatorProfileEmail}", messageId=${info.messageId}`,
                );
              } catch (sendErr) {
                console.error(
                  `[WEBHOOK_MOMO_EMAIL] transporter.sendMail failed for "${creatorProfileEmail}":`,
                  sendErr,
                );
                await adminDb.collection("activityLogs").add({
                  level: "error",
                  category: "payment",
                  message: `Momo webhook: Failed to send creator email for booking ${bookingId}`,
                  metadata: { ref, bookingId, creatorEmail: creatorProfileEmail, error: String(sendErr) },
                  createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });
              }
            }
          } catch (emailErr) {
            console.error(
              "[WEBHOOK_MOMO_EMAIL] Unexpected error in creator email block:",
              emailErr,
            );
            await adminDb.collection("activityLogs").add({
              level: "error",
              category: "payment",
              message: `Momo webhook: Unexpected error in creator email block for ref ${ref}`,
              metadata: { ref, bookingId, error: String(emailErr) },
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
        } else {
          console.log(
            `[WEBHOOK_MOMO_EMAIL] No creatorUid in txData, cannot send creator email`,
          );
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
            console.error(
              "Failed to send payment confirmation email to buyer:",
              emailErr,
            );
            await adminDb.collection("activityLogs").add({
              level: "error",
              category: "payment",
              message: `Momo webhook: Failed to send buyer email for ref ${ref}`,
              metadata: { ref, bookingId, bookerEmail: txData.bookerEmail, error: String(emailErr) },
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
        }

        // Notify admin about the successful booking transaction
        try {
          const adminsSnap = await adminDb
            .collection("profiles")
            .where("isAdmin", "==", true)
            .get();
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
          await adminDb.collection("activityLogs").add({
            level: "error",
            category: "payment",
            message: `Momo webhook: Failed to notify admins for ref ${ref}`,
            metadata: { ref, bookingId, error: String(adminNotifErr) },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }
    } else if (txType === "gathering") {
      const platformSharePercentage = txData.includeReferral
        ? Number(process.env.NEXT_PUBLIC_PLATFORM_SHARE_WITH_REFERRAL)
        : Number(process.env.NEXT_PUBLIC_PLATFORM_SHARE);
      const platformShare = totalAmount * platformSharePercentage;
      const creatorShare =
        totalAmount * Number(process.env.NEXT_PUBLIC_CREATOR_SHARE);
      const referralShare =
        totalAmount * Number(process.env.NEXT_PUBLIC_REFERRAL_SHARE);

      batch.set(adminDb.collection("platformIncome").doc(), {
        amount: platformShare,
        txRef: ref,
        reason: "gathering_ticket",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      batch.set(adminDb.collection("creatorIncome").doc(), {
        creatorUid: txData.creatorUid,
        amount: creatorShare,
        txRef: ref,
        reason: "gathering_ticket",
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
          txRef: ref,
          reason: "referral_commission",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        batch.update(adminDb.collection("creators").doc(txData.referralId), {
          totalEarnings: admin.firestore.FieldValue.increment(referralShare),
          pendingPayout: admin.firestore.FieldValue.increment(referralShare),
        });
      }

      batch.set(adminDb.collection("gatheringsAttendance").doc(), {
        gatheringId: txData.gatheringId,
        supporterId: txData.supporterId || "anonymous",
        supporterName: txData.attendeeName || "Anonymous",
        supporterEmail: txData.attendeeEmail || "",
        supporterPhoto: txData.attendeePhoto || "",
        creatorHandle: txData.creatorId,
        paid: true,
        amount: totalAmount,
        paymentRef: ref,
        checkedIn: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      batch.update(adminDb.collection("creatorGatherings").doc(txData.gatheringId), {
        attendeesCount: admin.firestore.FieldValue.increment(1),
      });

      if (txData.creatorUid) {
        await createNotification({
          userId: txData.creatorUid,
          type: "new_gathering",
          title: "New Ticket Sale!",
          message: `${txData.attendeeName || "Someone"} purchased a ticket for your gathering`,
          metadata: { txRef: ref, gatheringId: txData.gatheringId, amount: totalAmount, creatorShare },
          link: "/creator/gatherings",
          actorName: txData.attendeeName || undefined,
        });
      }

      try {
        const adminsSnap = await adminDb.collection("profiles").where("isAdmin", "==", true).get();
        for (const adminDoc of adminsSnap.docs) {
          await createNotification({
            userId: adminDoc.id,
            type: "new_transaction",
            title: "Ticket Sale",
            message: `Ticket sale of ${totalAmount.toLocaleString()} RWF from ${txData.attendeeName || "someone"}`,
            link: "/admin/transactions",
          });
        }
      } catch (adminNotifErr) {
        console.error("Failed to notify admins:", adminNotifErr);
      }

      // Send ticket confirmation email to attendee
      if (txData.attendeeEmail) {
        try {
          const gatheringSnap = await adminDb.collection("creatorGatherings").doc(txData.gatheringId).get();
          const gData = gatheringSnap.exists ? gatheringSnap.data() : null;
          const creatorProfileSnap = await adminDb.collection("profiles").doc(txData.creatorUid).get();
          const creatorName = creatorProfileSnap.exists ? creatorProfileSnap.data()?.displayName || txData.creatorId : txData.creatorId;

          await transporter.sendMail({
            from: `"Agaseke" <${process.env.SMTP_USER}>`,
            to: txData.attendeeEmail,
            subject: `Your Ticket for ${gData?.title || "Event"} - Confirmed!`,
            html: `
              <!DOCTYPE html>
              <html>
                <head>
                  <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; }
                    .container { max-width: 480px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
                    .content { background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; }
                    .event-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e; }
                    .event-card p { margin: 8px 0; }
                    .cta { display: inline-block; background: #f97316; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 20px; }
                    .footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h1 style="margin: 0; font-size: 24px;">Ticket Confirmed! 🎫</h1>
                    </div>
                    <div class="content">
                      <p>Hi ${txData.attendeeName || "there"},</p>
                      <p>Your ticket for <strong>${gData?.title || "the event"}</strong> has been confirmed!</p>
                      <div class="event-card">
                        <p><strong>Event:</strong> ${gData?.title || "N/A"}</p>
                        <p><strong>Date:</strong> ${gData?.date || "N/A"}</p>
                        <p><strong>Time:</strong> ${gData?.time || "N/A"}</p>
                        <p><strong>Location:</strong> ${gData?.location || "N/A"}</p>
                        <p><strong>Ticket:</strong> ${totalAmount.toLocaleString()} RWF</p>
                        <p><strong>Hosted by:</strong> ${creatorName}</p>
                      </div>
                      <p style="text-align: center;">
                        <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://agaseke.me"}/${txData.creatorId}/gatherings/${txData.gatheringId}" class="cta">View Your Ticket</a>
                      </p>
                      <p style="font-size: 13px; color: #64748b;">Please show your QR code ticket at the event for check-in. You can access it from the event page.</p>
                      <div class="footer">
                        <p>This email was sent by Agaseke Platform</p>
                        <p>© ${new Date().getFullYear()} Agaseke. All rights reserved.</p>
                      </div>
                    </div>
                  </div>
                </body>
              </html>
            `,
          });
        } catch (emailErr) {
          console.error("Failed to send ticket confirmation email:", emailErr);
          await adminDb.collection("activityLogs").add({
            level: "error",
            category: "payment",
            message: `Momo webhook: Failed to send ticket email for ref ${ref}`,
            metadata: { ref, gatheringId: txData.gatheringId, attendeeEmail: txData.attendeeEmail, error: String(emailErr) },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }
    } else {
      const platformSharePercentage = txData.includeReferral
        ? Number(process.env.NEXT_PUBLIC_PLATFORM_SHARE_WITH_REFERRAL)
        : Number(process.env.NEXT_PUBLIC_PLATFORM_SHARE);
      const platformShare = totalAmount * platformSharePercentage;
      const creatorShare =
        totalAmount * Number(process.env.NEXT_PUBLIC_CREATOR_SHARE);
      const referralShare =
        totalAmount * Number(process.env.NEXT_PUBLIC_REFERRAL_SHARE);

      batch.set(adminDb.collection("platformIncome").doc(), {
        amount: platformShare,
        txRef: ref,
        reason: "flat_fee",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      batch.set(adminDb.collection("creatorIncome").doc(), {
        creatorUid: txData.creatorUid,
        amount: creatorShare,
        txRef: ref,
        reason: "support",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      batch.set(adminDb.collection("supportedCreators").doc(), {
        creatorId: txData.creatorId,
        amount: totalAmount,
        supporterId: txData.supporterId || null,
        supporterPhoneNumber: client,
        txRef: ref,
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
          txRef: ref,
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
            txRef: ref,
            amount: totalAmount,
            creatorShare: creatorShare,
          },
          link: "/creator/supporters",
          actorId:
            txData.supporterId !== "anonymous" ? txData.supporterId : undefined,
        });
      }
    }

    await batch.commit();
  } else {
    await txDoc.ref.update({ status: "failed" });
  }

  return NextResponse.json({ received: true });
}
