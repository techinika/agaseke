import AuthGuard from "@/auth/AuthGuard";
import SupporterPostDetail from "@/components/pages/Dashboards/supporter/SupporterPostDetail";

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function Page({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  return (
    <AuthGuard>
      <SupporterPostDetail postId={postId} />
    </AuthGuard>
  );
}
