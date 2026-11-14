"use client";

import { Building2, ExternalLink } from "lucide-react";
import { MediaImage } from "@/components/ui/MediaImage";
import { t } from "@/lib/i18n";
import type { CreatorPagePartner } from "../types";

export interface PartnerSectionProps {
  partners: CreatorPagePartner[];
}

export function PartnerSection({ partners }: PartnerSectionProps) {
  if (partners.length === 0) return null;

  return (
    <section className="mx-auto max-w-2xl px-4 py-8" aria-labelledby="partners-heading">
      <div className="mb-4 flex items-center gap-2">
        <Building2 className="size-4 text-brand-strong" aria-hidden="true" />
        <h2
          id="partners-heading"
          className="text-caption font-bold uppercase tracking-widest text-muted-fg"
        >
          {t("creator.partners")}
        </h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {partners.map((partner) => {
          const href = partner.website || undefined;
          const content = (
            <>
              <div className="size-14 shrink-0 overflow-hidden rounded-control border border-line bg-surface-raised">
                {partner.logo ? (
                  <MediaImage
                    src={partner.logo}
                    alt={partner.name ?? ""}
                    className="size-full"
                    sizes="56px"
                  />
                ) : (
                  <span className="flex size-full items-center justify-center text-muted-fg">
                    <Building2 className="size-6" aria-hidden="true" />
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-fg">{partner.name}</p>
                {partner.description && (
                  <p className="mt-0.5 line-clamp-1 text-label text-muted-fg">
                    {partner.description}
                  </p>
                )}
                {href && (
                  <span className="mt-1 flex items-center gap-1 text-caption font-semibold text-brand-strong">
                    {t("creator.visitWebsite")}
                    <ExternalLink className="size-3" aria-hidden="true" />
                  </span>
                )}
              </div>
            </>
          );

          const className =
            "flex min-h-20 items-center gap-4 rounded-card border border-line bg-surface p-4 shadow-sm transition-colors";

          return href ? (
            <a
              key={partner.id}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={`${className} hover:border-line-strong hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface`}
            >
              {content}
            </a>
          ) : (
            <div key={partner.id} className={className}>
              {content}
            </div>
          );
        })}
      </div>
    </section>
  );
}
