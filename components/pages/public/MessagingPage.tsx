"use client";

import { useAuth } from "@/auth/AuthContext";
import { CreatorSubpage } from "@/components/shell/CreatorSubpage";
import { MessageTab } from "@/components/parts/public/MessageTab";
import { useCreatorSubpageData } from "@/features/creator-page/hooks/useCreatorSubpageData";
import { t } from "@/lib/i18n";

export default function MessagingPage({ username }: { username: string }) {
  const { user, isLoggedIn } = useAuth();
  const data = useCreatorSubpageData(username);

  return (
    <CreatorSubpage
      username={username}
      title={t("creator.message")}
      description={t("creatorSubpage.messagingDescription", {
        name: data.creatorName,
      })}
      data={data}
    >
      {({ openSupport }) =>
        data.creator && (
          <MessageTab
            isLoggedIn={isLoggedIn}
            isSupporter={data.isSupporter}
            setIsModalOpen={openSupport}
            name={data.creatorName}
            handle={username}
            creatorId={data.creator.uid}
            currentUserId={user?.uid}
            currentUserName={user?.displayName || undefined}
            creatorData={data.creator}
            messagingEnabled={data.creator.messagingEnabled !== false}
            messagingAllowAll={data.creator.messagingAllowAll !== false}
            messagingMinAmount={data.creator.messagingMinAmount || 0}
            userTotalSupport={(data.profile?.totalSupport as number) || 0}
          />
        )
      }
    </CreatorSubpage>
  );
}
