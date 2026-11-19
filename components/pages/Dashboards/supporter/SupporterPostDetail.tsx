import PostDetailPage from "@/components/pages/public/PostDetailPage";

export default function SupporterPostDetail({ postId }: { postId: string }) {
  return (
    <PostDetailPage
      postId={postId}
      backHref="/supporter"
      backLabel="Back to My Feed"
    />
  );
}
