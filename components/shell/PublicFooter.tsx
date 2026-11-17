import Link from "next/link";
import {
  FaInstagram,
  FaLinkedin,
  FaTwitter,
  FaWhatsapp,
  FaYoutube,
} from "react-icons/fa";
import { ArrowUpRight } from "lucide-react";

const GROUPS = [
  {
    title: "Platform",
    links: [
      { label: "Explore creators", href: "/explore" },
      { label: "For creators", href: "/for-creators" },
      { label: "For supporters", href: "/for-supporters" },
      { label: "For brands", href: "/for-brands" },
      { label: "Help center", href: "/help-center" },
      { label: "Changelog", href: "/changelog" },
      {
        label: "Blog",
        href: "https://medium.com/@agasekeforcreators",
        external: true,
      },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Content guidelines", href: "/content-guidelines" },
      { label: "Payout policy", href: "/payout-policy" },
    ],
  },
  {
    title: "Community",
    links: [
      {
        label: "WhatsApp channel",
        href: "https://whatsapp.com/channel/0029Vb9AemqFy72CiwMyQf06",
        external: true,
      },
      {
        label: "WhatsApp group",
        href: "https://chat.whatsapp.com/DSLKCybSApGKrEmn0HvlLx",
        external: true,
      },
      {
        label: "Instagram",
        href: "https://instagram.com/agaseke_support",
        external: true,
      },
    ],
  },
];

const SOCIALS = [
  {
    label: "Instagram",
    href: "https://instagram.com/agaseke_support",
    icon: FaInstagram,
  },
  { label: "X", href: "https://x.com/agaseke_support", icon: FaTwitter },
  { label: "LinkedIn", href: "https://linkedin.com/company/agaseke", icon: FaLinkedin },
  {
    label: "YouTube",
    href: "https://www.youtube.com/channel/UCeLwxQrpnxYip5G-jXyTRBQ",
    icon: FaYoutube,
  },
  {
    label: "WhatsApp",
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
              The private community platform for creators, artists, podcasters, writers,
              and community leaders. Fans support your work directly.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-1">
              {SOCIALS.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  title={label}
                  className="inline-flex size-11 items-center justify-center rounded-control text-muted-fg outline-none transition-colors hover:bg-surface-raised hover:text-brand-strong focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface-sunken"
                >
                  <Icon size={18} aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          {GROUPS.map((group) => (
            <div key={group.title}>
              <h2 className="text-label font-bold uppercase tracking-wide text-fg">
                {group.title}
              </h2>
              <ul className="mt-4 space-y-1">
                {group.links.map((link) => (
                  <li key={link.label}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-11 items-center gap-1 text-label font-medium text-muted-fg outline-none transition-colors hover:text-brand-strong focus-visible:ring-2 focus-visible:ring-focus"
                      >
                        {link.label}
                        <ArrowUpRight className="size-3.5" aria-hidden="true" />
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="inline-flex min-h-11 items-center text-label font-medium text-muted-fg outline-none transition-colors hover:text-brand-strong focus-visible:ring-2 focus-visible:ring-focus"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-line pt-6 text-caption text-muted-fg sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Agaseke. Made with care in Kigali.</p>
          <p>
            Powered by{" "}
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
