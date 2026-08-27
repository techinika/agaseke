import { Metadata } from "next";
import ArticleForm from "@/components/parts/dashboard/ArticleForm";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ articleId: string }>;
}) {
  const { articleId } = await params;
  return <ArticleForm articleId={articleId} />;
}