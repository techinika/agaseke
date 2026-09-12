import JsonLd from "@/components/seo/JsonLd";
import { getEventSchema, getBreadcrumbSchema } from "@/lib/schemas";
import { baseUrl } from "@/lib/baseUrl";

interface EventSchemaProps {
  name: string;
  description: string;
  image: string;
  url: string;
  organizerName: string;
  organizerUrl?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
}

export default function EventSchema({
  name,
  description,
  image,
  url,
  organizerName,
  organizerUrl,
  startDate,
  endDate,
  location,
}: EventSchemaProps) {
  const event = getEventSchema({
    name,
    description,
    image,
    url: `${baseUrl}${url}`,
    organizerName,
    organizerUrl: organizerUrl ? `${baseUrl}${organizerUrl}` : undefined,
    startDate,
    endDate,
    location,
  });

  const breadcrumbs = getBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: organizerName, url: organizerUrl || `/${organizerName}` },
    { name: "Events", url: `${organizerUrl || `/${organizerName}`}/gatherings` },
    { name, url },
  ]);

  return (
    <>
      <JsonLd data={event} />
      <JsonLd data={breadcrumbs} />
    </>
  );
}