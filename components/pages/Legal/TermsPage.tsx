"use client";

import React from "react";
import Navbar from "@/components/parts/Navigation";
import { Mail, Instagram, Twitter } from "lucide-react";
import Footer from "@/components/parts/Footer";

export default function TermsPage() {
  const lastUpdated = "February 02, 2026";

  return (
    <div className="min-h-screen bg-white text-slate-900 pb-20">
      <Navbar />

      <main className="max-w-3xl mx-auto px-6 py-16">
        <header className="mb-12">
          <h1 className="text-4xl font-black mb-4">Terms of Service</h1>
          <p className="text-slate-500 font-medium">
            Last updated: {lastUpdated}
          </p>
        </header>

        <div className="prose prose-slate prose-orange max-w-none space-y-10">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
            <p className="leading-relaxed text-slate-600">
              By accessing or using Agaseke, you agree to be bound by these
              Terms of Service. Agaseke is a platform designed to facilitate
              community support for Rwandan creators. If you do not agree to
              these terms, please do not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. The "Support" Model</h2>
            <p className="leading-relaxed text-slate-600">
              Agaseke facilitates direct support from Supporters to Creators.
              <strong>
                {" "}
                All contributions made via Mobile Money (MoMo) or other payment
                methods are voluntary and non-refundable.
              </strong>{" "}
              Support is not a purchase of goods or services unless explicitly
              stated by the creator in a specific gathering or content tier.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">
              3. Creator Responsibilities
            </h2>
            <p className="leading-relaxed text-slate-600">
              Creators are responsible for the content they post and the
              gatherings they organize. By using Agaseke, creators agree to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-slate-600">
              <li>Provide accurate information on their profiles.</li>
              <li>Fulfill any promises made during "Gatherings" (events).</li>
              <li>
                Ensure all content uploaded respects Rwandan laws and
                intellectual property rights.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Gatherings & RSVPs</h2>
            <p className="leading-relaxed text-slate-600">
              When a Supporter RSVPs for a Gathering, Agaseke shares the
              Supporter’s contact information (Name and Phone Number) with the
              Creator to facilitate the event. Agaseke is not liable for the
              conduct of any user during physical or virtual gatherings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Prohibited Conduct</h2>
            <p className="leading-relaxed text-slate-600 text-sm bg-slate-50 p-4 rounded-lg">
              Users may not use Agaseke to:
              <br />• Post hate speech, explicit content, or illegal material.
              <br />• Scam or defraud supporters.
              <br />• Impersonate other creators or public figures.
            </p>
          </section>

          <section className="bg-orange-50 p-8 rounded-3xl border border-orange-100">
            <h2 className="text-2xl font-bold mb-4 text-orange-950">
              6. Support & Contact
            </h2>
            <p className="mb-6 text-orange-900/80">
              Need help? Whether you are a creator or a supporter, our team is
              here to assist you through any of these channels:
            </p>
            <div className="space-y-4">
              <a
                href="mailto:agasekeforcreators@gmail.com"
                className="flex items-center gap-3 text-orange-700 font-bold hover:underline"
              >
                <Mail size={20} /> agasekeforcreators@gmail.com
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
