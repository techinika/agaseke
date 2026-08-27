export const revalidate = 300;

/* eslint-disable @typescript-eslint/no-explicit-any */
import { adminDb } from "@/db/firebaseAdmin";
import { Metadata } from "next";
import { baseUrl } from "@/lib/baseUrl";
import PostDetailPage from "@/components/pages/public/PostDetailPage";

async function getCreatorData(username: string) {
  try {
    const snap = await adminDb.collection("creators").doc(username).get();
    return snap.exists ? snap.data() : null;
  } catch { return null; }
}

async function getPost(postId: string) {
  try {
    const snap = await adminDb.collection("creatorContent").doc(postId).get();
    return snap.exists ? { id: snap.id, ...snap.data() } : null;
  } catch { return null; }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string; postId: string }>;
}): Promise<Metadata> {
  const { username, postId } = await params;
  const [creator, post] = await Promise.all([getCreatorData(username), getPost(postId)]);

  if (!creator || !post) {
    return { title: "Post | Not Found | Agaseke", robots: { index: false } };
  }

  const displayName = creator.name || username;
  const title = (post as any).title || "Post";
  const image = (post as any).contentUrl || `${baseUrl}/agaseke.png`;
  const description =
    (post as any).shortDescription ||
    `View "${title}" by ${displayName} on Agaseke.`;
  const canonical =
    (post as any).type === "article" && (post as any).slug
      ? `/articles/${(post as any).slug}`
      : `/${username}/community/${postId}`;

  return {
    title: `${title} | ${displayName} Community | Agaseke`,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${title} | ${displayName}`,
      description,
      url: `${baseUrl}${canonical}`,
      siteName: "Agaseke",
      images: [{ url: image, width: 800, height: 800, alt: title }],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${displayName}`,
      description,
      images: [image],
    },
    robots: { index: true, follow: true },
  };
}

async function page({ params }: { params: Promise<{ username: string; postId: string }> }) {
  const { username, postId } = await params;
  return <PostDetailPage username={username} postId={postId} />;
}

export default page;
