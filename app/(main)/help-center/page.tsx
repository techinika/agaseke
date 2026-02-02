import HelpCenter from "@/components/pages/HelpCenterPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help Center | Agaseke for Creators",
  description:
    "Find answers and get support for Agaseke for Creators creators and supporters.",
};

export default function page() {
  return <HelpCenter />;
}
