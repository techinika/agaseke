import Link from "next/link";
import {
  FaInstagram,
  FaLinkedin,
  FaTwitter,
  FaWhatsapp,
  FaYoutube,
} from "react-icons/fa";
import { ArrowUpRight } from "lucide-react";
import { getNavItems, isNavLink } from "@/config/navigation";
import { t, type TranslationKey } from "@/lib/i18n";

interface FooterLink {
  href: string;
  labelKey: TranslationKey;
  external?: boolean;
}

interface FooterGroup {
  titleKey: TranslationKey;
  links: FooterLink[];
}

const PLATFORM_LINKS: FooterLink[] = [
  ...getNavItems({ surface: "public", role: "guest", slot: "desktop" })
    .filter(isNavLink)
    .map((item) => ({
      href: item.href,
      labelKey: item.labelKey,
      external: item.external,
    })),
  { href: "/changelog", labelKey: "nav.changelog" },
];

const GROUPS: FooterGroup[] = [
  { titleKey: "footer.platform", links: PLATFORM_LINKS },
  {
    titleKey: "footer.legal",
    links: [
      { href: "/privacy", labelKey: "footer.privacy" },
      { href: "/terms", labelKey: "footer.terms" },
      { href: "/content-guidelines", labelKey: "footer.contentGuidelines" },
      { href: "/payout-policy", labelKey: "footer.payoutPolicy" },
    ],
  },
  {
    titleKey: "footer.community",
    links: [
      {
        href: "https://whatsapp.com/channel/0029Vb9AemqFy72CiwMyQf06",
        labelKey: "footer.whatsappChannel",
        external: true,
      },
      {
        href: "https://chat.whatsapp.com/DSLKCybSApGKrEmn0HvlLx",
        labelKey: "footer.whatsappGroup",
        external: true,
      },
      {
        href: "https://instagram.com/agaseke_support",
        labelKey: "footer.instagram",
        external: true,
      },
    ],
  },
];

const SOCIALS = [
  {
    labelKey: "footer.instagram" as const,
    href: "https://instagram.com/agaseke_support",
    icon: FaInstagram,
  },
  {
    labelKey: "footer.x" as const,
    href: "https://x.com/agaseke_support",
    icon: FaTwitter,
  },
  {
    labelKey: "footer.linkedin" as const,
    href: "https://linkedin.com/company/agaseke",
    icon: FaLinkedin,
  },
  {
    labelKey: "footer.youtube" as const,
    href: "https://www.youtube.com/channel/UCeLwxQrpnxYip5G-jXyTRBQ",
    icon: FaYoutube,
  },
  {
    labelKey: "footer.whatsapp" as const,
    href: "https://whatsapp.com/channel/0029Vb9AemqFy72CiwMyQf06",
    icon: FaWhatsapp,
  },
];

export function PublicFooter() {
  return (
    <footer className="border-t border-line bg-surface-sunken">
      <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="max-w-sm">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center text-title font-black uppercase tracking-tight text-fg outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface-sunken"
            >
              agaseke<span className="text-brand-strong">.me</span>
            </Link>
            <p className="mt-4 text-label leading-relaxed text-muted-fg">
              {t("footer.description")}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-1">
              {SOCIALS.map(({ labelKey, href, icon: Icon }) => (
                <a
                  key={labelKey}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={t(labelKey)}
                  title={t(labelKey)}
                  className="inline-flex size-11 items-center justify-center rounded-control text-muted-fg outline-none transition-colors hover:bg-surface-raised hover:text-brand-strong focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface-sunken"
                >
                  <Icon size={18} aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          {GROUPS.map((group) => (
            <div key={group.titleKey}>
              <h2 className="text-label font-bold uppercase tracking-wide text-fg">
                {t(group.titleKey)}
              </h2>
              <ul className="mt-4 space-y-1">
                {group.links.map((link) => (
                  <li key={`${group.titleKey}-${link.href}`}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-11 items-center gap-1 text-label font-medium text-muted-fg outline-none transition-colors hover:text-brand-strong focus-visible:ring-2 focus-visible:ring-focus"
                      >
                        {t(link.labelKey)}
                        <ArrowUpRight className="size-3.5" aria-hidden="true" />
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="inline-flex min-h-11 items-center text-label font-medium text-muted-fg outline-none transition-colors hover:text-brand-strong focus-visible:ring-2 focus-visible:ring-focus"
                      >
                        {t(link.labelKey)}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-line pt-6 text-caption text-muted-fg sm:flex-row sm:items-center sm:justify-between">
          <p>{t("footer.madeIn")}</p>
          <p>
            {t("footer.poweredBy")}{" "}
            <Link
              href="https://techinika.co.rw"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center font-semibold text-fg underline-offset-4 hover:text-brand-strong hover:underline"
            >
              Techinika
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
