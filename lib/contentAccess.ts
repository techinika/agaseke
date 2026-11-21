export type PostVisibility = "public" | "supporters" | "members" | "tier";

export interface PostAccessInput {
  isPrivate?: boolean;
  visibility?: string;
  requiredTierIds?: string[];
  requiredTierNames?: string[];
}

export function resolvePostVisibility(post: PostAccessInput | null | undefined): PostVisibility {
  if (!post) return "public";
  const v = post.visibility;
  if (v === "public" || v === "supporters" || v === "members" || v === "tier") {
    return v;
  }
  if (Array.isArray(post.requiredTierIds) && post.requiredTierIds.length > 0) {
    return "tier";
  }
  return post.isPrivate ? "supporters" : "public";
}

export function isGatedVisibility(post: PostAccessInput | null | undefined): boolean {
  return resolvePostVisibility(post) !== "public";
}

export function formatVisibilityLabel(
  visibility: PostVisibility,
  requiredTierNames?: string[],
): string {
  switch (visibility) {
    case "public":
      return "Public";
    case "supporters":
      return "Supporters only";
    case "members":
      return "Community members";
    case "tier":
      return requiredTierNames?.length
        ? `${requiredTierNames.join(" / ")} members`
        : "Tier members";
  }
}

export function isSubscriptionActive(sub: Record<string, unknown>): boolean {
  if (!sub || sub.status !== "active") return false;
  const exp = sub.expiresAt as
    | { toDate?: () => Date; seconds?: number }
    | string
    | number
    | undefined;
  if (!exp) return true;
  let ms = 0;
  if (typeof exp === "object" && typeof exp.toDate === "function") {
    ms = exp.toDate().getTime();
  } else if (typeof exp === "object" && typeof exp.seconds === "number") {
    ms = exp.seconds * 1000;
  } else if (typeof exp === "string" || typeof exp === "number") {
    ms = new Date(exp).getTime();
  }
  if (!ms || Number.isNaN(ms)) return true;
  return ms > Date.now();
}

export function canViewerAccessPost({
  post,
  isOwner,
  isAdmin,
  isSupporter,
  activeTierIds,
}: {
  post: PostAccessInput;
  isOwner: boolean;
  isAdmin?: boolean;
  isSupporter: boolean;
  activeTierIds: string[] | Set<string>;
}): boolean {
  if (isOwner || isAdmin) return true;
  const visibility = resolvePostVisibility(post);
  if (visibility === "public") return true;

  const tiers =
    activeTierIds instanceof Set ? activeTierIds : new Set(activeTierIds);

  if (visibility === "supporters") {
    return isSupporter || tiers.size > 0;
  }

  if (visibility === "members") {
    return tiers.size > 0;
  }

  if (visibility === "tier") {
    const required = Array.isArray(post.requiredTierIds)
      ? post.requiredTierIds
      : [];
    if (required.length === 0) return tiers.size > 0;
    return required.some((tierId) => tiers.has(tierId));
  }

  return false;
}
