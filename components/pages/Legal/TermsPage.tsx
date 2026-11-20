import React from "react";
import { Mail, Instagram, Twitter, MessageCircle } from "lucide-react";

export default function TermsPage() {
  const lastUpdated = "May 24, 2026";

  return (
    <article className="mx-auto max-w-3xl px-6 py-16 pb-20 text-fg">
        <header className="mb-12">
          <h1 className="text-display font-bold mb-4">Terms of Service</h1>
          <p className="text-muted-fg font-medium">Last updated: {lastUpdated}</p>
        </header>

        <div className="max-w-none space-y-10">
          <section>
            <h2 className="text-heading font-bold mb-4">1. Acceptance of Terms</h2>
            <p className="leading-relaxed text-muted-fg">
              By accessing or using Agaseke, you agree to be bound by these Terms of
              Service. Agaseke is a platform designed to facilitate community support for
              Rwandan creators. If you do not agree to these terms, please do not use our
              services.
            </p>
          </section>

          <section>
            <h2 className="text-heading font-bold mb-4">
              2. The &quot;Support&quot; Model
            </h2>
            <p className="leading-relaxed text-muted-fg">
              Agaseke facilitates direct support from Supporters to Creators.
              <strong>
                {" "}
                All contributions made via Mobile Money (MoMo) or other payment methods
                are voluntary and non-refundable.
              </strong>{" "}
              Support is not a purchase of goods or services unless explicitly stated by
              the creator in a specific gathering or content tier.
            </p>
          </section>

          <section>
            <h2 className="text-heading font-bold mb-4">3. Platform Fee</h2>
            <p className="leading-relaxed text-muted-fg">
              Agaseke charges a <strong>10% platform fee</strong> on all transactions
              processed through the platform, including but not limited to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-fg mt-4">
              <li>Support contributions (tips/gifts) from supporters to creators.</li>
              <li>Store purchases made through creator storefronts.</li>
              <li>Paid event or gathering RSVPs.</li>
              <li>
                Any other payments facilitated via Agaseke&apos;s payment infrastructure.
              </li>
            </ul>
            <p className="leading-relaxed text-muted-fg mt-4">
              The remaining <strong>90%</strong> is disbursed to the creator. This fee
              covers payment processing, platform maintenance, and operational costs. The
              platform fee is deducted at the time of transaction and is non-refundable.
            </p>
          </section>

          <section>
            <h2 className="text-heading font-bold mb-4">4. Creator Responsibilities</h2>
            <p className="leading-relaxed text-muted-fg">
              Creators are responsible for the content they post and the gatherings they
              organize. By using Agaseke, creators agree to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-fg">
              <li>Provide accurate information on their profiles.</li>
              <li>Fulfill any promises made during &quot;Gatherings&quot; (events).</li>
              <li>
                Ensure all content uploaded respects Rwandan laws and intellectual
                property rights.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-heading font-bold mb-4">5. Gatherings & RSVPs</h2>
            <p className="leading-relaxed text-muted-fg">
              When a Supporter RSVPs for a Gathering, Agaseke shares the Supporter’s
              contact information (Name and Phone Number) with the Creator to facilitate
              the event. Agaseke is not liable for the conduct of any user during physical
              or virtual gatherings.
            </p>
          </section>

          <section>
            <h2 className="text-heading font-bold mb-4">6. Prohibited Conduct</h2>
            <p className="leading-relaxed text-muted-fg text-label bg-surface-sunken p-4 rounded-control">
              Users may not use Agaseke to:
              <br />• Post hate speech, explicit content, or illegal material.
              <br />• Scam or defraud supporters.
              <br />• Impersonate other creators or public figures.
            </p>
          </section>

          <section className="bg-brand-soft p-8 rounded-control border border-brand/20">
            <h2 className="text-heading font-bold mb-4 text-fg">7. Support & Contact</h2>
            <p className="mb-6 text-muted-fg">
              Need help? Whether you are a creator or a supporter, our team is here to
              assist you through any of these channels:
            </p>
            <div className="space-y-4">
              <a
                href="mailto:hello@agaseke.me"
                className="flex min-h-11 items-center gap-3 text-brand-strong font-bold hover:underline"
              >
                <Mail size={20} /> hello@agaseke.me
              </a>
              <a
                href="https://instagram.com/agaseke_support"
                className="flex min-h-11 items-center gap-3 text-brand-strong font-bold hover:underline"
              >
                <Instagram size={20} /> @agaseke_support
              </a>
              <a
                href="https://x.com/agaseke_support"
                className="flex min-h-11 items-center gap-3 text-brand-strong font-bold hover:underline"
              >
                <Twitter size={20} /> @agaseke_support
              </a>
              <a
                href="https://whatsapp.com/channel/0029Vb9AemqFy72CiwMyQf06"
                className="flex min-h-11 items-center gap-3 text-brand-strong font-bold hover:underline"
              >
                <MessageCircle size={20} /> Announcements on WhatsApp
              </a>
            </div>
          </section>
        </div>
      </article>
  );
}
