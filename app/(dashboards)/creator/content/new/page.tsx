import { Metadata } from "next";
import { StepComposer } from "@/features/content";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function NewPostPage() {
  return <StepComposer />;
}
