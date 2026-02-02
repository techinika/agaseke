import React from "react";
import Navbar from "@/components/parts/Navigation";
import {
  Search,
  Mail,
  Instagram,
  Twitter,
  MessageCircle,
  HelpCircle,
  ChevronRight,
} from "lucide-react";

const faqs = [
  {
    category: "For Supporters",
    questions: [
      {
        q: "How do I support a creator?",
        a: "Simply visit a creator's profile, click 'Support', and enter the amount you wish to contribute. You will be prompted to complete the transaction via MoMo.",
      },
      {
        q: "Is my payment secure?",
        a: "Yes. We use standard mobile money gateways and do not store your private financial PINs. Transactions are processed directly through your service provider.",
      },
      {
        q: "Can I get a refund?",
        a: "As stated in our terms, support contributions are voluntary and non-refundable as they are sent directly to the creator.",
      },
    ],
  },
  {
    category: "For Creators",
    questions: [
      {
        q: "How do I get paid?",
        a: "Payouts are processed monthly between the 25th and 30th. You must have a minimum balance of 10,000 RWF and a verified account.",
      },
      {
        q: "What is 'Verification'?",
        a: "Verification is the process of confirming your identity using your National ID (Indangamuntu) to ensure safe and legal fund transfers.",
      },
      {
        q: "How do I create a Gathering?",
        a: "Go to your dashboard, click 'New Gathering', add your event details, and it will automatically appear on your public profile for supporters to RSVP.",
      },
    ],
  },
];

export default function HelpCenter() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      <div className="bg-orange-600 pt-20 pb-32 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-6">
            How can we help?
          </h1>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 -mt-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
              <Mail size={24} />
            </div>
            <h3 className="font-bold mb-2">Email Support</h3>
            <p className="text-sm text-slate-500 mb-4">
              Response within 24 hours
            </p>
            <a
              href="mailto:agasekeforcreators@gmail.com"
              className="text-orange-600 font-bold hover:underline text-sm"
            >
              agasekeforcreators@gmail.com
            </a>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center mb-4">
              <Instagram size={24} />
            </div>
            <h3 className="font-bold mb-2">Instagram DM</h3>
            <p className="text-sm text-slate-500 mb-4">Quick community help</p>
            <a
              href="https://instagram.com/agaseke_support"
              className="text-orange-600 font-bold hover:underline text-sm"
            >
              @agaseke_support
            </a>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-slate-100 text-slate-900 rounded-full flex items-center justify-center mb-4">
              <Twitter size={24} />
            </div>
            <h3 className="font-bold mb-2">X (Twitter)</h3>
            <p className="text-sm text-slate-500 mb-4">Real-time updates</p>
            <a
              href="https://x.com/agaseke_support"
              className="text-orange-600 font-bold hover:underline text-sm"
            >
              @agaseke_support
            </a>
          </div>
        </div>

        {/* FAQs */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-black mb-10 flex items-center gap-3">
            <HelpCircle className="text-orange-600" size={32} /> Frequently
            Asked Questions
          </h2>

          <div className="space-y-12">
            {faqs.map((section) => (
              <div key={section.category}>
                <h3 className="text-sm uppercase tracking-widest font-black text-slate-400 mb-6">
                  {section.category}
                </h3>
                <div className="space-y-4">
                  {section.questions.map((item, i) => (
                    <details
                      key={i}
                      className="group bg-white rounded-2xl border border-slate-200 overflow-hidden"
                    >
                      <summary className="flex items-center justify-between p-6 cursor-pointer list-none font-bold text-slate-800">
                        {item.q}
                        <ChevronRight
                          className="group-open:rotate-90 transition-transform text-slate-400"
                          size={20}
                        />
                      </summary>
                      <div className="px-6 pb-6 text-slate-600 leading-relaxed">
                        {item.a}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
