import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { t } from "@/lib/i18n";

export interface CreatorTrustRowProps {
  name: string;
  photoURL?: string | null;
  verified?: boolean;
  subtitle?: string;
}

export function CreatorTrustRow({
  name,
  photoURL,
  verified,
  subtitle,
}: CreatorTrustRowProps) {
  return (
    <div className="flex items-center gap-3 rounded-control border border-line bg-surface-raised p-3">
      <Avatar src={photoURL} name={name} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-body font-semibold text-fg">{name}</p>
        {subtitle && <p className="truncate text-caption text-muted-fg">{subtitle}</p>}
      </div>
      {verified && (
        <Badge tone="success" className="shrink-0">
          {t("creator.verified")}
        </Badge>
      )}
    </div>
  );
}
