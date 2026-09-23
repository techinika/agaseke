import Link from "next/link";
import { Metadata } from "next";
import MarketingPageSchema from "@/components/seo/MarketingPageSchema";
import {
  Megaphone,
  Users,
  Wallet,
  Target,
  TrendingUp,
  PieChart,
  ShieldCheck,
  HandCoins,
} from "lucide-react";

const PAGE_URL = "/for-brands";
const PAGE_NAME = "For Brands";
const ENROLL_URL = "https://brands.agaseke.me";

const faqs = [
  {
    question: "How do brand campaigns work on Agaseke?",
    answer:
      "You set up a campaign, choose your budget, decide how many creators can participate, and creators who fit the campaign join it. They run the campaign to their audiences, and at the end the budget is divided between them by performance.",
  },
  {
    question: "Can brands with small budgets run campaigns?",
    answer:
      "Yes. Agaseke is open to brands of any size — you decide what to spend, and there is no minimum bar. Small and growing brands can fund campaigns that fit their budget.",
  },
  {
    question: "How is the budget divided among creators?",
    answer:
      "Participating creators divide the campaign budget based on how each one performed, so your money follows actual results rather than a flat fee. Creators earn what they delivered.",
  },
  {
    question: "Who can participate in a brand campaign?",
    answer:
      "You set the number of creators who can participate, and creators across niches — musicians, artists, athletes, educators, and more — join with audiences relevant to your campaign.",
  },
  {
    question: "How do I enroll my brand?",
    answer:
      "Enroll directly at brands.agaseke.me — it only takes a few minutes to set up your brand, choose a budget, and open your first campaign.",
  },
];

export const metadata: Metadata = {
  title: "For Brands | Agaseke for Creators",
  description:
    "Run creator marketing campaigns with Agaseke for Brands. Set your budget, open the campaign to a number of creators, and let creators divide the budget by performance — no matter your budget size.",
  alternates: {
    canonical: PAGE_URL,
    languages: { en: PAGE_URL },
  },
  keywords: [
    "Agaseke for brands",
    "creator marketing platform",
    "run campaigns with creators",
    "creator campaigns Africa",
    "influencer marketing platform Africa",
    "performance-based creator payouts",
    "brand creator collaboration",
    "marketing budget for creators",
  ],
  openGraph: {
    title: "For Brands | Agaseke for Creators",
    description:
      "Set your budget, open the campaign to a number of creators, and let them divide the budget by performance. Enroll at brands.agaseke.me.",
    url: process.env.NEXT_PUBLIC_BASE_URL || `https://agaseke.me${PAGE_URL}`,
    siteName: "Agaseke",
    images: [
      {
        url: "/agaseke.png",
        width: 1200,
        height: 630,
        alt: "Agaseke for Brands",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "For Brands | Agaseke for Creators",
    description:
      "Set your budget, open the campaign to a number of creators, and let them divide the budget by performance. Enroll at brands.agaseke.me.",
    images: ["/agaseke.png"],
  },
};

const steps = [
  {
    icon: Wallet,
    title: "Set your budget",
    text: "Decide what you want to spend on the campaign — any budget, big or small. You stay in control of the spend.",
  },
  {
    icon: Users,
    title: "Open it to creators",
    text: "Set how many creators can participate. Creators you fit with — across niches, sizes and audiences — join the campaign.",
  },
  {
    icon: TrendingUp,
    title: "Creators perform",
    text: "Participating creators run the campaign to their audiences: posts, content, events and more — whatever the campaign calls for.",
  },
  {
    icon: HandCoins,
    title: "Budget divided by performance",
    text: "When the campaign ends, creators who participated divide your budget based on how each one performed. Clear and fair.",
  },
];

const features = [
  {
    icon: Target,
    title: "No matter the budget",
    text: "Start with what you can afford. Campaigns aren't gated by big-brand budgets — small and growing brands can participate too.",
  },
  {
    icon: Users,
    title: "Connect to multiple creators",
    text: "One campaign reaches many creators instead of negotiating one deal at a time.",
  },
  {
    icon: PieChart,
    title: "Performance-based split",
    text: "Your budget goes where it worked hardest — creators divide it by the results they delivered.",
  },
  {
    icon: ShieldCheck,
    title: "You set the terms",
    text: "You control the budget and the number of participating creators, so nothing is spent outside your plan.",
  },
  {
    icon: Megaphone,
    title: "Real creator audiences",
    text: "Reach audiences that already trust the creators they follow, not cold ad inventory.",
  },
  {
    icon: TrendingUp,
    title: "Fair to creators too",
    text: "Creators earn from real work based on performance — no fixed fee, no hidden cuts for anyone.",
  },
];

export default function ForBrandsPage() {
  return (
    <>
      <MarketingPageSchema
        pageUrl={PAGE_URL}
        pageName={PAGE_NAME}
        pageDescription="Run marketing campaigns with multiple creators at any budget — set the budget, open it to a number of creators, and let them divide it by performance."
        faqs={faqs}
      />
      <div className="max-w-5xl mx-auto px-4 py-16">
      <section className="text-center mb-16">
        <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-orange-100 text-orange-700 text-xs font-black uppercase tracking-wide rounded-full mb-6">
          <Megaphone size={14} /> For Brands
        </span>
        <h1 className="text-4xl md:text-5xl font-black text-foreground mb-4">
          Marketing campaigns with creators
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Connect to multiple creators for your campaigns, no matter your budget.
          Set what you want to spend, open it to creators, and let performance
          decide how the budget is shared.
        </p>
        <div className="flex justify-center mt-8">
          <a
            href={ENROLL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-orange-600 text-white text-sm font-bold rounded-lg hover:bg-orange-700 transition"
          >
            Enroll your brand at brands.agaseke.me
          </a>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="text-3xl font-black text-center mb-3">How campaigns work</h2>
        <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-10">
          Four steps between your brand and a room full of creators&apos;
          audiences.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((s, i) => (
            <div key={s.title} className="bg-card border border-border rounded-3xl p-6 relative">
              <span className="absolute top-4 right-4 text-xs font-black text-orange-500 bg-orange-100 rounded-full w-6 h-6 flex items-center justify-center">
                {i + 1}
              </span>
              <s.icon size={24} className="text-orange-500 mb-3" />
              <h3 className="font-black mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-6 mb-16">
        <div className="bg-card border border-border rounded-3xl p-8">
          <Target size={32} className="text-orange-500 mb-4" />
          <h2 className="text-2xl font-black mb-3">Set your budget</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            You decide what a campaign costs before anything starts. There&apos;s
            no minimum bar — whether you&apos;re a small local brand or a
            national one, you can fund a campaign that fits your budget.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            You also set how many creators can participate, so the campaign
            stays exactly as wide as you want it to be.
          </p>
        </div>
        <div className="bg-card border border-border rounded-3xl p-8">
          <PieChart size={32} className="text-orange-500 mb-4" />
          <h2 className="text-2xl font-black mb-3">Creators divide it by performance</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            The creators who join your campaign split the budget based on how
            each of them performed — so your money follows results instead of
            guesses.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Nobody gets paid for showing up; they get paid for what they
            delivered. That&apos;s fair for you, and fair for creators who
            actually moved the needle.
          </p>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="text-3xl font-black text-center mb-10">Why brands choose Agaseke</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <div key={f.title} className="bg-card border border-border rounded-3xl p-6">
              <f.icon size={24} className="text-orange-500 mb-3" />
              <h3 className="font-black mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="text-center bg-card border border-border rounded-3xl p-10">
        <h2 className="text-3xl font-black mb-3">Ready to run your first campaign?</h2>
        <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
          Enroll your brand, set a budget, and let the creators do the rest.
          It only takes a few minutes to get started.
        </p>
        <a
          href={ENROLL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-6 py-3 bg-orange-600 text-white text-sm font-bold rounded-lg hover:bg-orange-700 transition"
        >
          Enroll your brand at brands.agaseke.me
        </a>
<p className="text-xs text-muted-foreground mt-4">
            Prefer to look around first?{" "}
            <Link href="/for-creators" className="font-bold text-orange-600 hover:underline">
              See what we do for creators
            </Link>
          </p>
      </section>

      <section className="flex flex-wrap items-center justify-center gap-2 text-sm mt-10">
        <span className="text-muted-foreground font-bold">Also on Agaseke:</span>
        <Link
          href="/for-creators"
          className="px-3 py-1 font-bold text-muted-foreground border border-border rounded-full hover:text-foreground hover:bg-muted transition"
        >
          For Creators
        </Link>
        <Link
          href="/for-supporters"
          className="px-3 py-1 font-bold text-muted-foreground border border-border rounded-full hover:text-foreground hover:bg-muted transition"
        >
          For Supporters
        </Link>
      </section>
      </div>
    </>
  );
}