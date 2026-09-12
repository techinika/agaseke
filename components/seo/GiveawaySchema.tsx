import JsonLd from "@/components/seo/JsonLd";
import { getGiveawaySchema, getBreadcrumbSchema } from "@/lib/schemas";
import { baseUrl } from "@/lib/baseUrl";

interface GiveawaySchemaProps {
  title: string;
  description: string;
  url: string;
  organizerName: string;
  organizerUrl?: string;
  startDate?: Date;
  endDate?: Date;
  prizeValue?: number;
}

export default function GiveawaySchema({
  title,
  description,
  url,
  organizerName,
  organizerUrl,
  startDate,
  endDate,
  prizeValue,
}: GiveawaySchemaProps) {
  const giveaways = [
    {
      ...getGiveawaySchema(
        title,
        description,
        organizerName,
        `${baseUrl}${organizerUrl || `/${organizerName}`}`,
        startDate || new Date(),
        endDate || new Date(),
        prizeValue
      ),
      url: `${baseUrl}${url}`,
    },
    getBreadcrumbSchema([
      { name: "Home", url: "/" },
      { name: organizerName, url: organizerUrl || `/${organizerName}` },
      { name: "Giveaways", url: `${organizerUrl || `/${organizerName}`}/giveaways` },
      { name: title, url },
    ]),
  ];

  return (
    <>
      {giveaways.map((data, index) => (
        <JsonLd key={index} data={data} />
      ))}
    </>
  );
}