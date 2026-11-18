"use client";

import { CreatorSubpage } from "@/components/shell/CreatorSubpage";
import { GatheringsTab } from "@/components/parts/public/GatheringsTab";
import { useCreatorSubpageData } from "@/features/creator-page/hooks/useCreatorSubpageData";
import { t } from "@/lib/i18n";

export default function GatheringsPage({ username }: { username: string }) {
  const data = useCreatorSubpageData(username);

  return (
    <CreatorSubpage
      username={username}
      title={t("creator.events")}
      description={t("creatorSubpage.gatheringsDescription", {
        name: data.creatorName,
      })}
      data={data}
    >
      {data.creator && (
        <GatheringsTab
          creatorId={data.creator.uid}
          creatorHandle={username}
          isSupporter={data.isSupporter}
        />
      )}
    </CreatorSubpage>
  );
}
