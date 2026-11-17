"use client";

import { useParams, useRouter } from "next/navigation";
import { CommunityChatView } from "@/components/parts/community/CommunityChatView";
import { useAuth } from "@/auth/AuthContext";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/db/firebase";

export default function CreatorChatPage() {
  const params = useParams();
  const router = useRouter();
  const { creator } = useAuth();
  const [fetchedHandle, setFetchedHandle] = useState("");
  const tierId = params.tierId as string;

  useEffect(() => {
    if (creator?.handle) return;
    if (creator?.uid) {
      const lookup = async () => {
        const snap = await getDoc(doc(db, "profiles", creator.uid));
        if (snap.exists() && snap.data().creatorHandle) {
          setFetchedHandle(snap.data().creatorHandle);
        }
      };
      lookup();
    }
  }, [creator]);

  const handle = creator?.handle || fetchedHandle;
  if (!handle) return null;

  return (
    <CommunityChatView
      creatorHandle={handle}
      tierId={tierId}
      tierName=""
      isCreator={true}
      onBack={() => router.push("/creator/community")}
    />
  );
}
