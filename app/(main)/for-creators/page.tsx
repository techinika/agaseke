import Link from "next/link";
import { Metadata } from "next";
import {
  UserRound,
  Users,
  Heart,
  ShoppingBag,
  CalendarCheck,
  CalendarDays,
  BarChart3,
  Wallet,
  Sparkles,
} from "lucide-react";

export const metadata: Metadata = {
  title: "For Creators | Agaseke for Creators",
  description:
    "What it means to be a creator on Agaseke for Creators. Get a public profile, earn through subscriptions, support, your store, bookings and gatherings — with secure, reliable payouts.",
  openGraph: {
    title: "For Creators | Agaseke for Creators",
    description:
      "What it means to be a creator on Agaseke for Creators — earn through subscriptions, support, store, bookings and gatherings.",
    url: process.env.NEXT_PUBLIC_BASE_URL || "https://agaseke.me/for-creators",
    siteName: "Agaseke",
    images: [
      {
        url: "/agaseke.png",
        width: 1200,
        height: 630,
        alt: "Agaseke for Creators",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "For Creators | Agaseke for Creators",
    description:
      "What it means to be a creator on Agaseke for Creators — earn through subscriptions, support, store, bookings and gatherings.",
    images: ["/agaseke.png"],
  },
};

const features = [
  {
    icon: Users,
    title: "Recurring community subscriptions",
    text: "Offer paid membership tiers and keep a community that supports your work month after month.",
  },
  {
    icon: Heart,
    title: "Support and tips",
    text: "Let supporters contribute whatever they want whenever they want, with clear messaging included.",
  },
  {
    icon: ShoppingBag,
    title: "Your own store",
    text: "Sell physical or digital products directly from your profile with secure checkout.",
  },
  {
    icon: CalendarCheck,
    title: "Bookable meetings",
    text: "Set your availability and offer paid 1-on-1 meetings, consultations or sessions.",
  },
  {
    icon: CalendarDays,
    title: "Gatherings and events",
    text: "Create, promote and sell tickets to events, gatherings and launches.",
  },
  {
    icon: Sparkles,
    title: "Content, giveaways and more",
    text: "Publish articles and posts, run giveaways, send notices and connect with your audience.",
  },
  {
    icon: BarChart3,
    title: "Insights",
    text: "See how your supporters engage and what your work is achieving.",
  },
  {
    icon: Wallet,
    title: "Reliable payouts",
    text: "Withdraw what you've earned through supported payment methods in your chosen currency.",
  },
];

export default function ForCreatorsPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      <section className="text-center mb-16">
        <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-orange-100 text-orange-700 text-xs font-black uppercase tracking-wide rounded-full mb-6">
          <Sparkles size={14} /> For Creators
        </span>
        <h1 className="text-4xl md:text-5xl font-black text-foreground mb-4">
          Agaseke is made for creators
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          A place where your audience can support your work, follow what you
          create, and connect with you — and where you get paid for it.
        </p>
      </section>

      <section className="grid md:grid-cols-2 gap-6 mb-16">
        <div className="bg-card border border-border rounded-3xl p-8">
          <UserRound size={32} className="text-orange-500 mb-4" />
          <h2 className="text-2xl font-black mb-3">What is a creator on Agaseke?</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            A creator is anyone whose work people want to follow and support —
            a musician, artist, photographer, writer, educator, athlete,
            comedian, journalist, model, entrepreneur, or community leader.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            You don&apos;t need a huge following. If you have a talent, a skill, a
            story, or a community, Agaseke gives you a public home to share it
            and a way for people to back it.
          </p>
        </div>
        <div className="bg-card border border-border rounded-3xl p-8">
          <Sparkles size={32} className="text-orange-500 mb-4" />
          <h2 className="text-2xl font-black mb-3">What we mean by &quot;creator&quot;</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            On Agaseke, a creator is someone who chooses a public handle on the
            platform and uses it to share their work and build an audience.
            Supporters join their community, buy from their store, book their
            time, and attend their gatherings.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Being a creator here means owning your page: you pick your username,
            set up your profile, choose what to offer, and decide what matters to
            you.
          </p>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="text-3xl font-black text-center mb-10">
          Everything a creator needs
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
        <h2 className="text-3xl font-black mb-3">Claim your handle</h2>
        <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
          Create your public page in minutes, set what you offer, and start
          building a community that supports you. It&apos;s free to start.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/onboarding"
            className="px-6 py-3 bg-orange-600 text-white text-sm font-bold rounded-lg hover:bg-orange-700 transition"
          >
            Become a creator
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 text-sm font-bold text-foreground border border-border rounded-lg hover:bg-muted transition"
          >
            Create an account
          </Link>
        </div>
      </section>
    </div>
  );
}