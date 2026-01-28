"use client";

import React from "react";
import { Smartphone, Lock, Globe, Code } from "lucide-react"; // Basic icons

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">      

      {/* --- Hero Section --- */}
      <header className="px-6 py-16 md:py-28 max-w-5xl mx-auto text-center">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
          From your fans' hearts <br />
          <span className="text-orange-600">to your MoMo wallet.</span>
        </h1>
        <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto">
          The first platform built specifically for Rwandan creators. Get
          supported, share exclusive content, and withdraw instantly to your
          mobile money.
        </p>
        <div className="flex flex-col md:flex-row justify-center gap-4">
          <div className="flex items-center bg-slate-100 p-2 rounded-lg border border-slate-200">
            <span className="px-3 text-slate-500">agaseke.me/</span>
            <input
              type="text"
              placeholder="yourname"
              className="bg-transparent outline-none font-medium w-32"
            />
          </div>
          <button className="bg-orange-600 text-white px-8 py-4 rounded-lg font-bold hover:bg-orange-700 shadow-lg shadow-orange-200 transition">
            Claim Your Link
          </button>
        </div>
      </header>

      {/* --- Core Features --- */}
      <section className="bg-slate-50 py-20 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <FeatureCard
            icon={<Smartphone className="text-orange-600" />}
            title="MoMo Payouts"
            desc="No more PayPal hurdles. Withdraw your earnings directly to MTN or Airtel MoMo instantly."
          />

          <FeatureCard
            icon={<Lock className="text-orange-600" />}
            title="Private Content"
            desc="Share BTS, early access, or digital files only with your verified supporters."
          />

          <FeatureCard
            icon={<Globe className="text-orange-600" />}
            title="Short Links"
            desc="Share your ags.ke/name link in your Instagram or X bio. It's clean and professional."
          />

          <FeatureCard
            icon={<Code className="text-orange-600" />}
            title="Embeddable Widget"
            desc="Add a 'Support me on Agaseke' button to your own website with a simple line of code."
          />
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-slate-600 leading-relaxed">{desc}</p>
    </div>
  );
}
