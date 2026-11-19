import {
  Mail,
  Instagram,
  Twitter,
  MessageCircle,
  HelpCircle,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { buttonClasses } from "@/components/ui/Button";

const faqs = [
  {
    category: "For supporters",
    questions: [
      {
        q: "How do I support a creator?",
        a: "Visit a creator's profile, choose Support, and enter the amount you want to contribute. You finish the payment through Mobile Money or card.",
      },
      {
        q: "Is my payment secure?",
        a: "Yes. Payments go through standard gateways (PayPack, Pesapal). Agaseke does not store your private financial PINs.",
      },
      {
        q: "Can I get a refund?",
        a: "Support contributions are voluntary and non-refundable because they go directly to the creator.",
      },
    ],
  },
  {
    category: "For creators",
    questions: [
      {
        q: "How do I get paid?",
        a: "Payouts are processed monthly between the 25th and 30th. You need a minimum balance of 10,000 RWF and a verified account.",
      },
      {
        q: "What is verification?",
        a: "Verification confirms your identity using your National ID so funds can move safely and legally.",
      },
      {
        q: "How do I create a gathering?",
        a: "Open your dashboard, choose New Gathering, add the event details, and it appears on your public profile for supporters to RSVP.",
      },
    ],
  },
];

const CONTACTS = [
  {
    icon: Mail,
    title: "Email support",
    detail: "Response within 24 hours",
    href: "mailto:hello@agaseke.me",
    label: "hello@agaseke.me",
    tone: "bg-info-bg text-info",
  },
  {
    icon: Instagram,
    title: "Instagram DM",
    detail: "Quick community help",
    href: "https://instagram.com/agaseke_support",
    label: "@agaseke_support",
    tone: "bg-brand-soft text-brand-strong",
  },
  {
    icon: Twitter,
    title: "X (Twitter)",
    detail: "Real-time updates",
    href: "https://x.com/agaseke_support",
    label: "@agaseke_support",
    tone: "bg-surface-raised text-fg",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp channel",
    detail: "Updates and creator highlights",
    href: "https://whatsapp.com/channel/0029Vb9AemqFy72CiwMyQf06",
    label: "Join the channel",
    tone: "bg-success-bg text-success",
  },
];

export default function HelpCenter() {
  const allQuestions = faqs.flatMap((section) => section.questions);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: allQuestions.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <div className="bg-canvas pb-20 text-fg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="border-b border-line bg-surface-sunken px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <Badge tone="brand" className="mb-4 px-3 py-1">
            <HelpCircle className="size-3.5" aria-hidden="true" />
            Help center
          </Badge>
          <h1 className="text-display font-black text-fg sm:text-hero">
            How can we help?
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-body-lg text-muted-fg">
            Find quick answers, reach the team, or join the community.
          </p>
        </div>
      </section>

      <main className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="-mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CONTACTS.map(({ icon: Icon, title, detail, href, label, tone }) => (
            <Card key={title} className="flex flex-col items-center p-6 text-center">
              <span
                className={`flex size-11 items-center justify-center rounded-control ${tone}`}
              >
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <h2 className="mt-4 text-body font-bold text-fg">{title}</h2>
              <p className="mt-1 text-caption text-muted-fg">{detail}</p>
              <Link
                href={href}
                target={href.startsWith("http") ? "_blank" : undefined}
                rel={href.startsWith("http") ? "noreferrer" : undefined}
                className="mt-3 inline-flex min-h-11 items-center text-label font-semibold text-brand-strong hover:underline"
              >
                {label}
              </Link>
            </Card>
          ))}
        </div>

        <Card className="mt-6 flex flex-col items-center justify-between gap-5 border-success/20 bg-success-bg p-6 sm:flex-row">
          <div className="flex items-center gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-control bg-surface text-success">
              <MessageCircle className="size-6" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-body-lg font-bold text-fg">Join the community</h2>
              <p className="text-label text-muted-fg">
                Get quick support and meet other creators and supporters.
              </p>
            </div>
          </div>
          <a
            href="https://chat.whatsapp.com/DSLKCybSApGKrEmn0HvlLx"
            target="_blank"
            rel="noreferrer"
            className={buttonClasses({ variant: "primary", size: "md" })}
          >
            Join on WhatsApp
          </a>
        </Card>

        <div className="mx-auto mt-16 max-w-3xl">
          <div className="flex items-center gap-3">
            <HelpCircle className="size-6 text-brand-strong" aria-hidden="true" />
            <h2 className="text-heading font-black text-fg">
              Frequently asked questions
            </h2>
          </div>

          <div className="mt-8 space-y-10">
            {faqs.map((section) => (
              <section key={section.category}>
                <h3 className="text-caption font-bold uppercase tracking-wide text-muted-fg">
                  {section.category}
                </h3>
                <div className="mt-3 space-y-3">
                  {section.questions.map((item) => (
                    <details
                      key={item.q}
                      className="group overflow-hidden rounded-card border border-line bg-surface"
                    >
                      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-3 text-body font-semibold text-fg">
                        {item.q}
                        <ChevronRight
                          className="size-5 shrink-0 text-muted-fg transition-transform group-open:rotate-90"
                          aria-hidden="true"
                        />
                      </summary>
                      <div className="px-5 pb-5 text-label leading-relaxed text-muted-fg">
                        {item.a}
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
