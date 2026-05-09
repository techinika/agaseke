import ChangelogPage from "@/components/pages/ChangelogPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Changelog | Agaseke",
  description:
    "Track Agaseke's progress. See current features and what's coming next.",
};

export default function page() {
  return <ChangelogPage />;
}
