import ContentGuidelinesPage from "@/components/pages/Legal/ContentGuidelinesPage";
import { Metadata } from "next";
import { baseUrl } from "@/lib/baseUrl";

export const metadata: Metadata = {
  title: "Content Guidelines | Agaseke",
  description:
    "Learn what we allow and expect on Agaseke. Our content guidelines protect originality, accuracy, and supporter trust — for articles, posts, store products, events, and giveaways.",
  keywords: [
    "content guidelines",
    "community guidelines",
    "creator content rules",
    "Agaseke guidelines",
    "article guidelines",
    "prohibited content",
    "copyright policy",
    "African creator platform rules",
  ],
  alternates: {
    canonical: "/content-guidelines",
  },
  openGraph: {
    title: "Content Guidelines | Agaseke",
    description:
      "Learn what we allow and expect on Agaseke for articles, posts, store products, events, and giveaways.",
    url: `${baseUrl}/content-guidelines`,
    siteName: "Agaseke",
    images: [
      {
        url: "/agaseke.png",
        width: 1200,
        height: 630,
        alt: "Agaseke Content Guidelines",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Content Guidelines | Agaseke",
    description:
      "Learn what we allow and expect on Agaseke for articles, posts, store products, events, and giveaways.",
    images: ["/agaseke.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function page() {
  return <ContentGuidelinesPage />;
}