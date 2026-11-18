"use client";

import { useAuth } from "@/auth/AuthContext";
import { CreatorSubpage } from "@/components/shell/CreatorSubpage";
import { StoreTab } from "@/components/parts/public/StoreTab";
import { useCreatorSubpageData } from "@/features/creator-page/hooks/useCreatorSubpageData";
import { t } from "@/lib/i18n";

export default function StorePage({ username }: { username: string }) {
  const { isLoggedIn } = useAuth();
  const data = useCreatorSubpageData(username);

  return (
    <CreatorSubpage
      username={username}
      title={t("creator.store")}
      description={t("creatorSubpage.storeDescription", { name: data.creatorName })}
      data={data}
    >
      {({ openSupport }) =>
        data.creator && (
          <StoreTab
            creatorId={data.creator.uid}
            creatorName={data.creatorName}
            creatorHandle={username}
            storePublic={data.creator.storePublic !== false}
            isLoggedIn={isLoggedIn}
            isSupporter={data.isSupporter}
            setIsModalOpen={openSupport}
          />
        )
      }
    </CreatorSubpage>
  );
}
