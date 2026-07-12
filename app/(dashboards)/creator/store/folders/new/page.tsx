import { Metadata } from "next";
import FolderForm from "@/components/parts/dashboard/FolderForm";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function NewFolderPage() {
  return <FolderForm />;
}
