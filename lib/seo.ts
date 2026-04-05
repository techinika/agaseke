import { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://agaseke.me";
const SITE_NAME = "Agaseke";
const SITE_DESCRIPTION =
  "The premier platform for Rwandan creators to monetize their content and grow their community through support from fans.";
const DEFAULT_IMAGE = "/agaseke.png";

export interface SEOMetadataOptions {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: "website" | "article" | "profile";
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
  tags?: string[];
  noIndex?: boolean;
  noFollow?: boolean;
}

export function generateMetadata(options: SEOMetadataOptions): Metadata {
  const {
    title,
    description,
    image = DEFAULT_IMAGE,
    url,
    type = "website",
    publishedTime,
    modifiedTime,
    authors,
    tags,
    noIndex = false,
    noFollow = false,
  } = options;

  const fullUrl = url ? `${SITE_URL}${url}` : SITE_URL;
  const fullImage = image.startsWith("http") ? image : `${SITE_URL}${image}`;

  return {
    title,
    description,
    authors: authors ? [{ name: authors.join(", ") }] : undefined,
    keywords: tags,
    alternates: {
      canonical: fullUrl,
    },
    openGraph: {
      title,
      description,
      url: fullUrl,
      siteName: SITE_NAME,
      images: [
        {
          url: fullImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: "en_RW",
      type,
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [fullImage],
      site: "@Agaseke_support",
    },
    robots: {
      index: !noIndex,
      follow: !noFollow,
      googleBot: {
        index: !noIndex,
        follow: !noFollow,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

export function generateCreatorMetadata(
  creatorName: string,
  handle: string,
  bio: string,
  image: string,
  verified: boolean = false
): Metadata {
  const title = verified
    ? `✓ ${creatorName} (@${handle}) | Agaseke`
    : `${creatorName} (@${handle}) | Agaseke`;
  const description =
    bio ||
    `Support ${creatorName} on Agaseke. Fueling Rwandan creativity one contribution at a time.`;

  return generateMetadata({
    title,
    description,
    image,
    url: `/${handle}`,
    type: "profile",
  });
}

export function generateProductMetadata(
  productName: string,
  creatorName: string,
  price: number,
  currency: string = "RWF",
  image?: string
): Metadata {
  return generateMetadata({
    title: `${productName} by ${creatorName} | Agaseke Store`,
    description: `Get ${productName} from ${creatorName}. Price: ${price.toLocaleString()} ${currency}`,
    image,
    type: "article",
  });
}

export function generateGiveawayMetadata(
  giveawayTitle: string,
  creatorName: string,
  description: string,
  endDate?: Date
): Metadata {
  return generateMetadata({
    title: `${giveawayTitle} by ${creatorName} | Agaseke Giveaways`,
    description,
    type: "article",
    ...(endDate && { modifiedTime: endDate.toISOString() }),
    tags: ["giveaway", "contest", "Rwanda"],
  });
}
