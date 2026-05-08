import PublicProfile from "@/components/pages/PublicProfile";
import { Metadata } from "next";
import { baseUrl } from "@/app/sitemap";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  
  // Simple SEO fallback - will be updated client-side when data loads
  const title = `${username} | Agaseke`;
  const description = `Support ${username} on Agaseke. Fueling Rwandan creativity one contribution at a time.`;
  
  return {
    title,
    description,
    keywords: [username, "Rwandan creator", "content creator", "support creator", "Agaseke"],
    alternates: {
      canonical: `/${username}`,
      languages: { "en-RW": `/${username}` },
    },
    openGraph: {
      title,
      description,
      url: `${baseUrl}/${username}`,
      siteName: "Agaseke",
      type: "profile",
      username: username,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
    robots: { index: true, follow: true },
    other: { "theme-color": "#ea580c" },
  };
}

async function page({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return <PublicProfile username={username} />;
}

export default page;