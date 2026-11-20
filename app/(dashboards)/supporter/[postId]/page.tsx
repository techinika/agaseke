import { redirect } from "next/navigation";

export default async function SupporterPostRedirectPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  redirect(`/explore/posts/${postId}`);
}