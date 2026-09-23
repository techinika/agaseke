import Link from "next/link";
import { Metadata } from "next";
import MarketingPageSchema from "@/components/seo/MarketingPageSchema";
import {
  Heart,
  Gift,
  Users,
  CalendarCheck,
  CalendarDays,
  ShoppingBag,
  Sparkles,
  MessageSquare,
} from "lucide-react";

const PAGE_URL = "/for-supporters";
const PAGE_NAME = "For Supporters";

const faqs = [
  {
    question: "What is a supporter on Agaseke?",
    answer:
      "A supporter is anyone who follows and backs creators they like — contributing to them, joining their communities, entering their giveaways, and attending their events.",
  },
  {
    question: "How do I support a creator on Agaseke?",
    answer:
      "You can make a one-time contribution with a personal message, subscribe to a creator's paid community membership, buy from their store, or book one-on-one time with them.",
  },
  {
    question: "Can I take part in creator giveaways?",
    answer:
      "Yes. Creators run giveaways on their profiles, and supporters can enter and win prizes their favourite creators curate for their audience.",
  },
  {
    question: "Can I attend private gatherings?",
    answer:
      "Yes. Creators organise private gatherings and events for their community, and supporters can attend and take part.",
  },
  {
    question: "How do I get started as a supporter?",
    answer:
      "Create an account on Agaseke, then explore creators, follow their profiles, and support the work you care about.",
  },
];

export const metadata: Metadata = {
  title: "For Supporters | Agaseke for Creators",
  description:
    "What it means to be a supporter on Agaseke for Creators. Back the creators you believe in — through support, memberships, giveaways, private gatherings, bookings and more.",
  alternates: {
    canonical: PAGE_URL,
    languages: { en: PAGE_URL },
  },
  keywords: [
    "Agaseke for supporters",
    "support creators Africa",
    "creator fan community",
    "back your favourite creators",
    "creator membership",
    "fan support platform",
    "creator giveaways",
    "private creator gatherings",
  ],
  openGraph: {
    title: "For Supporters | Agaseke for Creators",
    description:
      "Back the creators you love — through support, memberships, giveaways, private gatherings, bookings and more.",
    url: process.env.NEXT_PUBLIC_BASE_URL || `https://agaseke.me${PAGE_URL}`,
    siteName: "Agaseke",
    images: [
      {
        url: "/agaseke.png",
        width: 1200,
        height: 630,
        alt: "Agaseke for Supporters",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "For Supporters | Agaseke for Creators",
    description:
      "Back the creators you love — through support, memberships, giveaways, private gatherings, bookings and more.",
    images: ["/agaseke.png"],
  },
};

const features = [
  {
    icon: Heart,
    title: "Support creators you like",
    text: "Contribute to the creators you believe in, whenever you want, with a personal message they'll see.",
  },
  {
    icon: Users,
    title: "Join their community",
    text: "Subscribe to membership tiers and unlock content and posts made just for supporters.",
  },
  {
    icon: Sparkles,
    title: "Exclusive content",
    text: "See the posts, articles and behind-the-scenes work creators share with their community.",
  },
  {
    icon: Gift,
    title: "Participate in giveaways",
    text: "Take part in your favourite creators' giveaways and win prizes they curate for their audience.",
  },
  {
    icon: CalendarDays,
    title: "Attend private gatherings",
    text: "Join intimate, private events and gatherings that creators organise for those closest to them.",
  },
  {
    icon: CalendarCheck,
    title: "Book their time",
    text: "Reserve a one-on-one meeting, consultation or session with the creators you follow.",
  },
  {
    icon: ShoppingBag,
    title: "Shop their store",
    text: "Buy merchandise and digital products creators sell directly from their profiles.",
  },
  {
    icon: MessageSquare,
    title: "Connect directly",
    text: "Message creators, follow their work and stay close to everything they're building.",
  },
];

export default function ForSupportersPage() {
  return (
    <>
      <MarketingPageSchema
        pageUrl={PAGE_URL}
        pageName={PAGE_NAME}
        pageDescription="What it means to be a supporter on Agaseke — back creators through support, memberships, giveaways, private gatherings, bookings and more."
        faqs={faqs}
      />
      <div className="max-w-5xl mx-auto px-4 py-16">
      <section className="text-center mb-16">
        <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-orange-100 text-orange-700 text-xs font-black uppercase tracking-wide rounded-full mb-6">
          <Heart size={14} /> For Supporters
        </span>
        <h1 className="text-4xl md:text-5xl font-black text-foreground mb-4">
          Agaseke is made for supporters too
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          A place to back the creators you believe in — and get closer to their
          work, their community, and them.
        </p>
      </section>

      <section className="grid md:grid-cols-2 gap-6 mb-16">
        <div className="bg-card border border-border rounded-3xl p-8">
          <Heart size={32} className="text-orange-500 mb-4" />
          <h2 className="text-2xl font-black mb-3">What is a supporter on Agaseke?</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            A supporter is anyone who follows and backs the creators they like.
            It could be one creator you really believe in, or a whole community
            of talent across music, art, sports, education and more.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            You support what matters to you, join communities and events, take
            part in giveaways, and build a following of your own in return.
          </p>
        </div>
        <div className="bg-card border border-border rounded-3xl p-8">
          <Sparkles size={32} className="text-orange-500 mb-4" />
          <h2 className="text-2xl font-black mb-3">What we mean by &quot;supporter&quot;</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            On Agaseke, a supporter is someone who joins creators they appreciate
            — financially and socially. Support can be a small contribution on a
            creator&apos;s profile, a paid membership, a store order, or booking
            their time.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            It&apos;s also being part of the circle: entering their giveaways,
            attending their private gatherings, and seeing the exclusive content
            they share only with their community.
          </p>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="text-3xl font-black text-center mb-10">
          Everything a supporter can do
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
        <h2 className="text-3xl font-black mb-3">Start supporting</h2>
        <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
          Create an account and start backing the creators you love — explore
          their profiles, join their communities, and take part in what they
          build.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/login"
            className="px-6 py-3 bg-orange-600 text-white text-sm font-bold rounded-lg hover:bg-orange-700 transition"
          >
            Get started
          </Link>
          <Link
            href="/explore"
            className="px-6 py-3 text-sm font-bold text-foreground border border-border rounded-lg hover:bg-muted transition"
          >
            Explore creators
          </Link>
        </div>
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
          href="/for-brands"
          className="px-3 py-1 font-bold text-muted-foreground border border-border rounded-full hover:text-foreground hover:bg-muted transition"
        >
          For Brands
        </Link>
      </section>
      </div>
    </>
  );
}