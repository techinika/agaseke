import ExplorePostsPage from "@/components/pages/ExplorePostsPage";
import ExplorePostsSchema from "@/components/seo/ExplorePostsSchema";
import { Metadata } from "next";
import { baseUrl } from "@/lib/baseUrl";
import { adminDb } from "@/db/firebaseAdmin";
import { isGatedVisibility, resolvePostVisibility } from "@/lib/contentAccess";
import { estimateReadingMinutes } from "@/lib/readingTime";

export const revalidate = 120;

async function getInitialExplorePosts() {
  try {
    let docs: FirebaseFirestore.QueryDocumentSnapshot[];
    try {
      const snap = await adminDb
        .collection("creatorContent")
        .where("isPrivate", "==", false)
        .orderBy("createdAt", "desc")
        .limit(12)
        .get();
      docs = snap.docs;
    } catch {
      const fallbackSnap = await adminDb
        .collection("creatorContent")
        .where("isPrivate", "==", false)
        .limit(50)
        .get();
      docs = [...fallbackSnap.docs].sort((a, b) => {
        const bMs =
          b.data().publishedAt?.toMillis?.() ?? b.data().createdAt?.toMillis?.() ?? 0;
        const aMs =
          a.data().publishedAt?.toMillis?.() ?? a.data().createdAt?.toMillis?.() ?? 0;
        return bMs - aMs;
      });
    }

    const rawDocs = docs
      .filter((doc) => {
        const d = doc.data();
        return d.status !== "draft" && !isGatedVisibility(d);
      })
      .slice(0, 10)
      .map((doc) => {
        const data = doc.data();
        const type = String(data.type || "text");
        return {
          id: doc.id,
          ...data,
          visibility: resolvePostVisibility(data),
          readingMinutes:
            type === "article"
              ? estimateReadingMinutes(
                  String(data.htmlContent || data.shortDescription || data.description || ""),
                )
              : undefined,
          createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? null,
          publishedAt: data.publishedAt?.toDate?.()?.toISOString() ?? null,
        };
      });

    const creatorIds = Array.from(
      new Set(
        rawDocs
          .map((d: Record<string, unknown>) => String(d.creatorId || d.creatorUid || ""))
          .filter(Boolean),
      ),
    ).slice(0, 10);

    const creatorEntries: Array<
      [string, { name: string; handle: string; uid?: string; photoURL: string | null }]
    > = [];

    await Promise.all(
      creatorIds.map(async (cid) => {
        try {
          const directSnap = await adminDb.collection("creators").doc(cid).get();
          const docSnap = directSnap.exists
            ? directSnap
            : (
                await adminDb
                  .collection("creators")
                  .where("uid", "==", cid)
                  .limit(1)
                  .get()
              ).docs[0];
          if (!docSnap?.exists) return;
          const data = docSnap.data();
          const entry = {
            name: String(data?.name || docSnap.id),
            handle: docSnap.id,
            uid: data?.uid ? String(data.uid) : undefined,
            photoURL: (data?.profilePicture || data?.photoURL || null) as string | null,
          };
          creatorEntries.push([docSnap.id, entry]);
          if (entry.uid) creatorEntries.push([entry.uid, entry]);
        } catch {
          // Ignore single creator lookup failure
        }
      }),
    );

    const creatorMap = new Map(creatorEntries);
    const posts = rawDocs.map((data: Record<string, unknown>) => {
      const creatorId = String(data.creatorId || data.creatorUid || "");
      const creator =
        creatorMap.get(creatorId) ||
        creatorMap.get(String(data.creatorUid || "")) ||
        creatorMap.get(String(data.creatorId || ""));
      return JSON.parse(
        JSON.stringify({
          ...data,
          authorName: creator?.name || creatorId.substring(0, 8) || "Unknown",
          authorHandle: creator?.handle || creatorId,
          authorPhoto: creator?.photoURL || null,
        }),
      );
    });

    return { posts, creatorEntries };
  } catch (error) {
    console.error("Error fetching initial public posts:", error);
    return { posts: [], creatorEntries: [] };
  }
}

export const metadata: Metadata = {
  title: "Discover Public Posts from African Creators | Agaseke",
  description:
    "Browse public posts from Africa's most talented creators. Read stories, watch videos, view images, and discover the content shaping the continent's creative landscape.",
  keywords: [
    "African creators",
    "public posts Africa",
    "creator content",
    "discover creators",
    "African stories",
    "creator platform Africa",
    "Agaseke posts",
    "African videos",
    "African art",
    "Rwanda content",
  ],
  alternates: {
    canonical: "/explore/posts",
    languages: {
      "en-RW": "/explore/posts",
    },
  },
  openGraph: {
    title: "Discover Public Posts from African Creators | Agaseke",
    description:
      "Browse public posts from Africa's most talented creators. Read stories, watch videos, view images, and discover the content shaping the continent's creative landscape.",
    url: `${baseUrl}/explore/posts`,
    siteName: "Agaseke",
    images: [
      {
        url: "/agaseke.png",
        width: 1200,
        height: 630,
        alt: "Discover Posts on Agaseke | African Creator Content",
      },
    ],
    locale: "en_RW",
    type: "website",
    countryName: "Rwanda",
  },
  twitter: {
    card: "summary_large_image",
    title: "Discover Public Posts from African Creators | Agaseke",
    description:
      "Browse public posts from Africa's most talented creators.",
    images: ["/agaseke.png"],
    site: "@Agaseke_support",
    creator: "@Agaseke_support",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  },
};

export default async function Page() {
  const { posts, creatorEntries } = await getInitialExplorePosts();
  return (
    <>
      <ExplorePostsSchema />
      <ExplorePostsPage
        initialPosts={posts}
        initialCreatorEntries={creatorEntries}
      />
    </>
  );
}
