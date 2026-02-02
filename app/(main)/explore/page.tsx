import ExplorePage from "@/components/pages/ExplorePage";
import { Metadata } from "next";
import { baseUrl } from "@/app/sitemap";

export const metadata: Metadata = {
  title: "Explore Rwandan Creators | Agaseke for Creators",
  description:
    "Browse and discover the most talented artists, musicians, and thinkers in Rwanda. Support their journey.",
  alternates: {
    canonical: "/explore",
  },
  openGraph: {
    title: "Discover the Best of Rwandan Creativity",
    description: "Find and support creators across Kigali and beyond.",
    url: baseUrl + "/explore",
    images: [
      {
        url: "/agaseke.png",
        width: 1200,
        height: 630,
        alt: "Discover Creators on Agaseke",
      },
    ],
  },
};

function page() {
  return (
    <div>
      <ExplorePage />
    </div>
  );
}

export default page;
