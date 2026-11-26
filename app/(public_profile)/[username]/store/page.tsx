import { redirect } from "next/navigation";

export default async function CreatorStoreRedirectPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  redirect(`/${username}?tab=store`);
}
