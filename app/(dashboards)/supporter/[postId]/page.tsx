import AuthGuard from "@/auth/AuthGuard";
import Navbar from "@/components/parts/Navigation";
import Footer from "@/components/parts/Footer";
import SupporterPostDetail from "@/components/pages/Dashboards/supporter/SupporterPostDetail";
import ArticleReaderPage from "@/components/pages/public/ArticleReaderPage";
import {
  getArticlePost,
  getCreatorByHandle,
  serializeReaderArticle,
  serializeReaderCreator,
} from "@/lib/articleReader";

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function Page({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const post = await getArticlePost(postId);

  if (post) {
    const creatorHandle = (post as { creatorId?: string }).creatorId || "";
    const creator = creatorHandle ? await getCreatorByHandle(creatorHandle) : null;

    return (
      <AuthGuard>
        <Navbar />
        <ArticleReaderPage
          article={serializeReaderArticle(post)}
          creator={serializeReaderCreator(creator, creatorHandle)}
          backHref="/supporter"
          backLabel="Back to My Feed"
        />
        <Footer />
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <SupporterPostDetail postId={postId} />
    </AuthGuard>
  );
}