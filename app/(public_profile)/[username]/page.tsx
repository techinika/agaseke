import PublicProfile from "@/components/pages/PublicProfile";
import { Metadata } from "next";
import { baseUrl } from "@/app/sitemap";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;

  return {
    title: `${username} | Agaseke`,
    description: `Support ${username} on Agaseke. Fueling Rwandan creativity.`,
    keywords: [username, "creator", "Rwandan creator", "support creator", "Agaseke"],
    alternates: {
      canonical: `/${username}`,
      languages: { "en-RW": `/${username}` },
    },
    openGraph: {
      title: `${username} | Agaseke`,
      description: `Support ${username} on Agaseke.`,
      url: `${baseUrl}/${username}`,
      siteName: "Agaseke",
      type: "profile",
      username: username,
    },
    twitter: {
      card: "summary",
      title: `${username} | Agaseke`,
    },
    robots: { index: true, follow: true },
    other: { "theme-color": "#ea580c" },
  };
}

export async function generateStaticParams() {
  return [];
}

async function page({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return (
    <div>
      <PublicProfile username={username} />
    </div>
  );
}

export default page;