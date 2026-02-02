import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/db/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  addDoc,
  serverTimestamp,
  increment,
} from "firebase/firestore";

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

  if (req.method === "HEAD") return new Response(null, { status: 200 });
  if (hash !== signature)
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

  const payload = JSON.parse(body);
  const { ref, status, client } = payload.data;

  const txRef = collection(db, "transactions");
  const q = query(txRef, where("ref", "==", ref));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty)
    return NextResponse.json({ error: "Tx not found" }, { status: 404 });

  const txDoc = querySnapshot.docs[0];
  const txData = txDoc.data();

  if (txData.status === "successful") {
    console.log(
      `Transaction ${ref} already processed. Ignoring duplicate webhook.`,
    );
    return NextResponse.json({ received: true, note: "Already processed" });
  }

  if (status === "successful") {
    const totalAmount = Number(txData.amount);
    const platformShare = totalAmount * 0.1; // 10%
    const creatorShare = totalAmount * 0.9; // 90%

    await updateDoc(doc(db, "transactions", txDoc.id), {
      status: "successful",
      successfulAt: serverTimestamp(),
    });

    await addDoc(collection(db, "platformIncome"), {
      amount: platformShare,
      txRef: ref,
      createdAt: serverTimestamp(),
    });

    await addDoc(collection(db, "creatorIncome"), {
      creatorUid: txData.creatorUid,
      amount: creatorShare,
      txRef: ref,
      createdAt: serverTimestamp(),
    });

    await addDoc(collection(db, "supportedCreators"), {
      creatorId: txData.creatorId,
      amount: totalAmount,
      supporterId: txData.supporterId,
      supporterPhoneNumber: client,
      txRef: ref,
      createdAt: serverTimestamp(),
    });

    await updateDoc(doc(db, "creators", txData.creatorId), {
      totalEarnings: increment(creatorShare),
      totalSupporters: increment(1),
      pendingPayout: increment(creatorShare),
    });
    if (txData.supporterId) {
      await updateDoc(doc(db, "profiles", txData.supporterId), {
        totalSupport: increment(totalAmount),
        totalSupportedCreators: increment(1),
      });
    }
  } else {
    await updateDoc(doc(db, "transactions", txDoc.id), { status: "failed" });
  }

  return NextResponse.json({ received: true });
}
