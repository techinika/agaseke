import { Metadata } from "next";
import ArticleForm from "@/components/parts/dashboard/ArticleForm";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function NewArticlePage() {
  return <ArticleForm />;
}