import PostDetailPage, {
  type PostDetailPageProps,
} from "@/components/pages/public/PostDetailPage";

export default function ExplorePostDetailPage(
  props: PostDetailPageProps,
) {
  return (
    <PostDetailPage
      backHref="/explore/posts"
      backLabel="All posts"
      {...props}
    />
  );
}
