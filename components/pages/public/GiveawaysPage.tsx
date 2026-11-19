"use client";

import { useAuth } from "@/auth/AuthContext";
import { CreatorSubpage } from "@/components/shell/CreatorSubpage";
import { GiveawayTab } from "@/components/parts/public/GiveawayTab";
import { useCreatorSubpageData } from "@/features/creator-page/hooks/useCreatorSubpageData";
import { t } from "@/lib/i18n";

export default function GiveawaysPage({ username }: { username: string }) {
  const { user, isLoggedIn } = useAuth();
  const data = useCreatorSubpageData(username);

  return (
    <CreatorSubpage
      username={username}
      title={t("creator.giveaways")}
      description={t("creatorSubpage.giveawaysDescription", {
        name: data.creatorName,
      })}
      data={data}
    >
      {({ openSupport }) =>
        data.creator && (
          <GiveawayTab
            creatorId={data.creator.uid}
            creatorName={data.creatorName}
            creatorHandle={username}
            isLoggedIn={isLoggedIn}
            isSupporter={data.isSupporter}
            userTotalSupport={(data.profile?.totalSupport as number) || 0}
            setIsModalOpen={openSupport}
            currentUserId={user?.uid}
            creatorCurrency={data.creator.currency}
          />
        )
      }
    </CreatorSubpage>
  );
}
