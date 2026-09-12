import React from "react";
import Navbar from "@/components/parts/Navigation";
import { Mail, Instagram, Twitter, BookOpen, ShieldAlert } from "lucide-react";
import Footer from "@/components/parts/Footer";

export default function ContentGuidelinesPage() {
  const lastUpdated = "September 12, 2026";

  return (
    <div className="min-h-screen bg-card text-foreground pb-20">
      <Navbar />

      <main className="max-w-3xl mx-auto px-6 py-16">
        <header className="mb-12">
          <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600 mb-6">
            <BookOpen size={28} />
          </div>
          <h1 className="text-4xl font-bold mb-4">Content Guidelines</h1>
          <p className="text-muted-foreground font-medium">
            Last updated: {lastUpdated}
          </p>
        </header>

        <div className="prose prose-slate prose-orange max-w-none space-y-10">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Our Commitment</h2>
            <p className="leading-relaxed text-muted-foreground">
              Agaseke is built to help African creators build genuine, valuable
              communities — through long-form articles, community posts, digital
              products, gatherings, giveaways, and direct supporter
              interactions. These guidelines exist to keep the platform
              authentic, safe, and legally sound for both creators and
              supporters. They apply to{" "}
              <strong>all content published on Agaseke</strong>, including
              articles, community posts, store products, event listings,
              giveaway entries, messages, and profile details.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. Originality & Copyright</h2>
            <p className="leading-relaxed text-muted-foreground">
              Content you publish must be your own work, or you must have the
              clear right to publish it. By publishing, you confirm that you own
              the rights or have obtained permission for every text, image,
              video, audio, and resource you share.
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-4">
              <li>
                Do not republish articles, photos, videos, or products taken
                from other creators or websites without authorization.
              </li>
              <li>
                Do not use trademarks or brand assets in ways that imply
                endorsement or affiliation.
              </li>
              <li>
                Respect licenses — if you reuse Creative Commons or otherwise
                licensed material, provide proper attribution.
              </li>
              <li>
                Repeat offenders who repost stolen content will have their
                content removed and may be suspended.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">
              3. Accuracy & Long-Form Articles
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              As we publish longer articles and in-depth stories, we expect
              factual responsibility from creators. Articles should be honest,
              well-researched, and clearly distinguish fact from opinion.
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-4">
              <li>
                Do not publish false, misleading, or fabricated information as
                fact — including fake news, health myths, and manipulated media.
              </li>
              <li>
                Clearly label opinion pieces, sponsored content, and satire so
                readers are not deceived.
              </li>
              <li>
                Do not use clickbait titles or descriptions that misrepresent
                the actual content of the article.
              </li>
              <li>
                When using AI assistance, disclose it meaningfully and keep
                editorial responsibility for the final content you publish.
              </li>
              <li>
                Update or remove outdated information that is materially
                inaccurate.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Community Posts & Interactions</h2>
            <p className="leading-relaxed text-muted-foreground">
              Community posts are a direct channel between you and your
              supporters. They must respect the safety and dignity of every
              reader and fellow creator.
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-4">
              <li>
                Do not post hate speech, harassment, doxxing, or targeted abuse
                of individuals or groups.
              </li>
              <li>
                Do not share intimate or private content without explicit
                consent.
              </li>
              <li>
                Do not publish content that promotes violence, self-harm,
                terrorism, or illegal activity.
              </li>
              <li>
                Keep adult content clearly labeled and age-appropriate; explicit
                sexual content is not permitted on public pages.
              </li>
              <li>
                Respect community chat spaces — charged harassment or spam is
                grounds for removal.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Digital Products & Store Items</h2>
            <p className="leading-relaxed text-muted-foreground">
              Everything you sell through your store must be delivered exactly
              as described, on time, and legally yours to sell.
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-4">
              <li>
                Do not sell counterfeit goods, stolen digital files, or content
                you do not have distribution rights for.
              </li>
              <li>
                Product descriptions must accurately reflect what buyers receive
                — including format, delivery method, and access terms.
              </li>
              <li>
                Fulfil digital and physical orders promptly and honour any
                guarantees you advertise.
              </li>
              <li>
                Do not sell prohibited items such as weapons, drugs, or
                regulated substances.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. Gatherings, Giveaways & Bookings</h2>
            <p className="leading-relaxed text-muted-foreground">
              Events and giveaways must deliver real value and honour every
              commitment you make to supporters.
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-4">
              <li>
                Only list gatherings you genuinely intend to hold, with accurate
                dates, times, locations, and prices.
              </li>
              <li>
                Giveaways must have real prizes, clear rules, and winners
                selected transparently and announced promptly.
              </li>
              <li>
                Do not run fake raffles, “bait-and-switch” discounts, or
                misleading prize campaigns.
              </li>
              <li>
                Honour booking commitments and clearly communicate rescheduling
                or cancellation to supporters.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">
              7. Monetization & Supporter Trust
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              Support on Agaseke is voluntary, but it must never be built on
              deception. Protect your supporters’ trust:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-4">
              <li>
                Do not misrepresent what supporters receive for tips,
                subscriptions, or purchases.
              </li>
              <li>
                Do not pressure, guilt, or manipulate supporters — especially
                minors — into paying.
              </li>
              <li>
                Do not advertise guarantees of financial returns or other
                investment-style promises.
              </li>
              <li>
                Any paid tier or exclusive content must be delivered as
                advertised, or supporters must be clearly refunded.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8. Enforcement</h2>
            <p className="leading-relaxed text-muted-foreground">
              We review reported content and may also proactively scan published
              material. Depending on the severity and history of a violation, we
              may:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-4">
              <li>Remove the offending content or product.</li>
              <li>Warn the creator and require corrective action.</li>
              <li>Temporarily restrict posting, selling, or fundraising.</li>
              <li>
                Suspend or permanently ban accounts for severe or repeated
                violations (including illegal content).
              </li>
            </ul>
            <p className="leading-relaxed text-muted-foreground mt-4 mb-4">
              <strong>Appeals:</strong> If you believe content of yours was
              removed in error, contact us and we will review the decision
              within 5 business days.
            </p>
            <div className="flex items-start gap-3 bg-muted p-4 rounded-lg">
              <ShieldAlert className="shrink-0 text-orange-600 mt-1" size={18} />
              <p className="text-sm text-muted-foreground">
                Content that violates Rwandan law — including defamation, fraud,
                or illegal material — will be reported to the relevant
                authorities as required.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">9. Reporting & Contact</h2>
            <p className="leading-relaxed text-muted-foreground">
              Supporters and creators can report content directly from the
              platform or reach our team through any channel below. We review
              every report promptly and confidentially.
            </p>
            <div className="space-y-4 mt-6">
              <a
                href="mailto:hello@agaseke.me"
                className="flex items-center gap-3 text-orange-700 font-bold hover:underline"
              >
                <Mail size={20} /> hello@agaseke.me
              </a>
              <a
                href="https://instagram.com/agaseke_support"
                className="flex items-center gap-3 text-orange-700 font-bold hover:underline"
              >
                <Instagram size={20} /> @agaseke_support
              </a>
              <a
                href="https://x.com/agaseke_support"
                className="flex items-center gap-3 text-orange-700 font-bold hover:underline"
              >
                <Twitter size={20} /> @agaseke_support
              </a>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}