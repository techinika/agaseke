"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/parts/Navigation";
import {
  Wallet,
  Calendar,
  ShieldCheck,
  Banknote,
  ArrowRight,
  Loader2,
} from "lucide-react";
import Footer from "@/components/parts/Footer";
import { db } from "@/db/firebase";
import { collection, getDocs } from "firebase/firestore";
import { getCurrencySymbol } from "@/types/currency";

interface CurrencyData {
  code: string;
  name: string;
  payoutThreshold: number;
}

export default function PayoutPolicy() {
  const [currencies, setCurrencies] = useState<CurrencyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const snap = await getDocs(collection(db, "currencies"));
        const list = snap.docs.map((d) => ({
          code: d.data().code,
          name: d.data().name,
          payoutThreshold: d.data().payoutThreshold || 0,
        }));
        setCurrencies(list);
      } catch { /* silently fail */ }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const defaultThreshold = currencies.find((c) => c.code === "RWF")?.payoutThreshold || 10000;

  return (
    <div className="min-h-screen bg-card text-foreground pb-20">
      <Navbar />

      <main className="max-w-3xl mx-auto px-6 py-16">
        <header className="mb-12">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-green-600 mb-6">
            <Wallet size={28} />
          </div>
          <h1 className="text-4xl font-bold mb-4">Payout Policy</h1>
          <p className="text-muted-foreground font-medium">
            Ensuring transparent and timely transfers for our creators.
          </p>
        </header>

        <div className="space-y-12">
          {/* Standard Schedule */}
          <section className="bg-muted p-8 rounded-lg border border-border">
            <div className="flex items-center gap-3 mb-4 text-foreground">
              <Calendar size={24} />
              <h2 className="text-2xl font-bold m-0">
                Standard Payout Schedule
              </h2>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Agaseke processes all creator payouts once a month. Standard
              transfers occur
              <strong> between the 25th and 30th of each month</strong>.
            </p>
            {loading ? (
              <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
                <Loader2 size={14} className="animate-spin" />
                Loading thresholds...
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  Minimum Payout Threshold: {defaultThreshold.toLocaleString()} {getCurrencySymbol("RWF")}
                </div>
                {currencies.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {currencies.filter((c) => c.code !== "RWF").map((c) => (
                      <span
                        key={c.code}
                        className="text-[11px] bg-muted px-2.5 py-1 rounded-full font-bold text-muted-foreground"
                      >
                        {c.code}: {c.payoutThreshold.toLocaleString()} {getCurrencySymbol(c.code)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Early Request */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Banknote className="text-orange-600" size={24} />
              <h2 className="text-2xl font-bold m-0">Early Payout Requests</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              If your balance exceeds the minimum threshold for your currency and you
              require funds before the end-of-month cycle, you may submit a
              Payout Request through your dashboard.
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li>
                Requests are reviewed by our financial team within 48 hours.
              </li>
              <li>
                Once approved, funds are sent to your verified MoMo or Bank
                account.
              </li>
              <li>
                Frequent early requests may be subject to a small processing
                fee.
              </li>
            </ul>
          </section>

          {/* Verification Warning */}
          <section className="bg-red-50 p-8 rounded-lg border border-red-100">
            <div className="flex items-center gap-3 mb-4 text-red-900">
              <ShieldCheck size={24} />
              <h2 className="text-2xl font-bold m-0">
                Identity Verification Required
              </h2>
            </div>
            <p className="text-red-800/80 leading-relaxed">
              To comply with financial regulations and prevent fraud,
              <strong> unverified creators cannot receive payouts.</strong>
            </p>
            <p className="mt-4 text-sm text-red-900 font-medium">
              To get verified, you must provide:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2 text-sm text-red-800">
              <div className="flex items-center gap-2">
                <ArrowRight size={14} /> Valid Government-Issued ID
              </div>
              <div className="flex items-center gap-2">
                <ArrowRight size={14} /> Verified MoMo/Bank Account Name
              </div>
            </div>
          </section>

          {/* Payment Channels */}
          <section>
            <h2 className="text-2xl font-bold mb-4">Supported Channels</h2>
            <p className="text-muted-foreground mb-6">
              We currently support payouts to the following channels provided
              during your verification process:
            </p>
            <div className="flex gap-4">
              <span className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold uppercase tracking-widest">
                MTN MoMo
              </span>
              <span className="px-4 py-2 bg-red-100 text-red-800 rounded-full text-xs font-bold uppercase tracking-widest">
                Airtel Money
              </span>
              <span className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-xs font-bold uppercase tracking-widest">
                Local Bank Transfer
              </span>
            </div>
          </section>

          {/* Contact Support */}
          <section className="pt-10 border-t border-border text-center">
            <p className="text-muted-foreground text-sm mb-4">
              Questions about your specific payout?
            </p>
            <a
              href="mailto:agasekeforcreators@gmail.com"
              className="text-orange-600 font-bold hover:underline"
            >
              agasekeforcreators@gmail.com
            </a>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
