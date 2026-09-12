import JsonLd from "@/components/seo/JsonLd";
import { getProductSchema, getBreadcrumbSchema } from "@/lib/schemas";

interface ProductSchemaProps {
  name: string;
  description: string;
  price: number;
  currency: string;
  image: string;
  creatorName: string;
  creatorHandle: string;
  url: string;
}

export default function ProductSchema({
  name,
  description,
  price,
  currency,
  image,
  creatorName,
  creatorHandle,
  url,
}: ProductSchemaProps) {
  const product = getProductSchema(
    name,
    description,
    price,
    currency,
    image,
    creatorName,
    url
  );

  const breadcrumbs = getBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: creatorName, url: `/${creatorHandle}` },
    { name: "Store", url: `/${creatorHandle}/store` },
    { name, url },
  ]);

  return (
    <>
      <JsonLd data={product} />
      <JsonLd data={breadcrumbs} />
    </>
  );
}