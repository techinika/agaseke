"use client";

import { useParams, useRouter } from "next/navigation";
import { CommunityChatView } from "@/components/parts/community/CommunityChatView";

export default function SubscriberChatPage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  const tierId = params.tierId as string;

  return (
    <CommunityChatView
      creatorHandle={username}
      tierId={tierId}
      tierName=""
      isCreator={false}
      onBack={() => router.push(`/${username}/community`)}
    />
  );
}
