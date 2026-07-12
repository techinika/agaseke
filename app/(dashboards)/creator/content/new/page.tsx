import { Metadata } from "next";
import PostForm from "@/components/parts/dashboard/PostForm";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function NewPostPage() {
  return <PostForm />;
}
