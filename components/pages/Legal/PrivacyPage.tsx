import React from "react";
import Navbar from "@/components/parts/Navigation";
import { ShieldCheck, Eye, Share2, Lock, Mail } from "lucide-react";
import Footer from "@/components/parts/Footer";

export default function PrivacyPage() {
  const lastUpdated = "February 02, 2026";

  return (
    <div className="min-h-screen bg-white text-slate-900 pb-20">
      <Navbar />

      <main className="max-w-3xl mx-auto px-6 py-16">
        <header className="mb-12">
          <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 mb-6">
            <ShieldCheck size={28} />
          </div>
          <h1 className="text-4xl font-black mb-4">Privacy Policy</h1>
          <p className="text-slate-500 font-medium">
            Last updated: {lastUpdated}
          </p>
        </header>

        <div className="prose prose-slate max-w-none space-y-12">
          <section>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-2xl font-bold m-0">
                1. Information We Collect
              </h2>
            </div>
            <p className="text-slate-600 leading-relaxed">
              To provide a seamless experience for creators and supporters in
              Rwanda, we collect:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-slate-600">
              <li>
                <strong>Account Information:</strong> Your name, email address,
                and profile photo when you sign up via Google or Email.
              </li>
              <li>
                <strong>Supporter Data:</strong> Your phone number (for MoMo
                identification) and your display name.
              </li>
              <li>
                <strong>Creator Content:</strong> Any bio, images, or gathering
                details you post to your public profile.
              </li>
            </ul>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-2xl font-bold m-0">
                2. How We Share Your Data
              </h2>
            </div>
            <p className="text-slate-600 leading-relaxed">
              We value your privacy. We do not sell your data. However, data
              sharing occurs in the following instances:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-slate-600">
              <li>
                <strong>Creator-Supporter Connection:</strong> When you RSVP for
                a gathering, your name and phone number are shared{" "}
                <strong>only</strong> with that specific creator so they can
                contact you regarding the event.
              </li>
              <li>
                <strong>Public Profiles:</strong> Information on creator
                profiles is visible to anyone visiting the platform to
                facilitate discovery.
              </li>
            </ul>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-2xl font-bold m-0">3. Data Security</h2>
            </div>
            <p className="text-slate-600 leading-relaxed">
              We use industry-standard encryption and Firebase Security Rules to
              ensure that your private data (like your total support impact or
              account settings) is only accessible by you.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Your Rights</h2>
            <p className="text-slate-600 leading-relaxed">
              Under Rwandan data protection laws, you have the right to access
              your data, request corrections, or ask for the deletion of your
              account. To exercise these rights, please contact us at the email
              below.
            </p>
          </section>

          <section className="bg-slate-900 text-white p-8 rounded-3xl">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              Contact Privacy Team
            </h2>
            <p className="text-slate-400 mb-6">
              For any questions regarding your data privacy, account deletion,
              or security concerns:
            </p>
            <div className="space-y-2">
              <p className="font-bold">agasekeforcreators@gmail.com</p>
              <p className="text-sm text-slate-500">Subject: Privacy Inquiry</p>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
