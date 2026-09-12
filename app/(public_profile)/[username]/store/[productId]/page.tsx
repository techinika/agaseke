export const revalidate = 300;

/* eslint-disable @typescript-eslint/no-explicit-any */
import { adminDb } from "@/db/firebaseAdmin";
import { Metadata } from "next";
import { baseUrl } from "@/lib/baseUrl";
import ProductDetailPage from "@/components/pages/public/ProductDetailPage";
import ProductSchema from "@/components/seo/ProductSchema";

async function getCreatorData(username: string) {
  try {
    const creatorSnap = await adminDb.collection("creators").doc(username).get();
    return creatorSnap.exists ? creatorSnap.data() : null;
  } catch { return null; }
}

async function getProduct(productId: string) {
  try {
    const snap = await adminDb.collection("storeProducts").doc(productId).get();
    return snap.exists ? { id: snap.id, ...snap.data() } : null;
  } catch { return null; }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string; productId: string }>;
}): Promise<Metadata> {
  const { username, productId } = await params;
  const [creator, product] = await Promise.all([getCreatorData(username), getProduct(productId)]);

  if (!creator || !product) {
    return { title: "Product | Not Found | Agaseke", robots: { index: false } };
  }

  const displayName = creator.name || username;
  const name = (product as any).name || "Product";
  const image = (product as any).imageUrl || `${baseUrl}/agaseke.png`;
  const currency = (product as any).currency === "USD" ? "USD" : "RWF";
  const price =
    currency === "USD"
      ? (product as any).priceUSD ?? (product as any).price ?? 0
      : (product as any).price ?? 0;

  return {
    title: `${name} | ${displayName} Store | Agaseke`,
    description: `Buy ${name} from ${displayName} on Agaseke.`,
    alternates: { canonical: `/${username}/store/${productId}` },
    keywords: [name, displayName, username, "digital product", "store", "Agaseke"],
    openGraph: {
      title: `${name} | ${displayName}`,
      description: `Buy ${name} from ${displayName}'s store.`,
      url: `${baseUrl}/${username}/store/${productId}`,
      siteName: "Agaseke",
      images: [{ url: image, width: 800, height: 800, alt: name }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${name} | ${displayName}`,
      description: `Buy ${name} from ${displayName}'s store.`,
      images: [image],
    },
    robots: { index: true, follow: true },
  };
}

async function page({ params }: { params: Promise<{ username: string; productId: string }> }) {
  const { username, productId } = await params;
  const [creator, product] = await Promise.all([getCreatorData(username), getProduct(productId)]);
  const displayName = creator?.name || username;
  const name = (product as any)?.name || "Product";
  const currency = (product as any)?.currency === "USD" ? "USD" : "RWF";
  const price =
    currency === "USD"
      ? (product as any)?.priceUSD ?? (product as any)?.price ?? 0
      : (product as any)?.price ?? 0;

  return (
    <>
      <ProductSchema
        name={name}
        description={(product as any)?.description || `Buy ${name} from ${displayName} on Agaseke.`}
        price={price}
        currency={currency}
        image={(product as any)?.imageUrl || `${baseUrl}/agaseke.png`}
        creatorName={displayName}
        creatorHandle={username}
        url={`/${username}/store/${productId}`}
      />
      <ProductDetailPage username={username} productId={productId} />
    </>
  );
}

export default page;
