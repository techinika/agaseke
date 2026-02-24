"use client";

import React, { useState } from "react";
import { MessageSquare, X, Send, Heart, Share2, Loader } from "lucide-react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/db/firebase";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";

export default function FeedbackFAB() {
  const { creator } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [feedback, setFeedback] = useState({
    referralLikelihood: 0,
    loveScale: 0,
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (feedback.referralLikelihood === 0 || feedback.loveScale === 0) {
      toast.error("Please provide a rating for both scales!");
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, "userFeedback"), {
        creatorId: creator?.uid || "unknown",
        handle: creator?.handle || "unknown",
        ...feedback,
        createdAt: serverTimestamp(),
      });

      toast.success("Feedback received! Thank you for helping Agaseke grow.");
      setIsOpen(false);
      setFeedback({ referralLikelihood: 0, loveScale: 0, message: "" });
    } catch (error) {
      console.error(error);
      toast.error("Could not send feedback. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-[50] bg-white border border-slate-200 text-slate-600 p-3 rounded-full shadow-lg hover:bg-slate-50 hover:text-orange-600 transition-all active:scale-95 group"
      >
        <MessageSquare size={24} />
        <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap uppercase tracking-widest">
          Feedback
        </span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4 md:p-0 bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="fixed inset-0"
            onClick={() => !loading && setIsOpen(false)}
          />

          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl relative z-10 overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
            <header className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-900">Help us improve</h3>
                <p className="text-xs text-slate-500">
                  Your ideas shape the future of Agaseke.
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={20} />
              </button>
            </header>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Scale 1: Referral */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Share2 size={14} /> Would you recommend Agaseke?
                </label>
                <div className="flex justify-between gap-2">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() =>
                        setFeedback({ ...feedback, referralLikelihood: num })
                      }
                      className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                        feedback.referralLikelihood === num
                          ? "bg-orange-600 text-white shadow-md shadow-orange-100 scale-105"
                          : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scale 2: Love */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Heart size={14} /> How much do you love Agaseke?
                </label>
                <div className="flex justify-between gap-2">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() =>
                        setFeedback({ ...feedback, loveScale: num })
                      }
                      className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                        feedback.loveScale === num
                          ? "bg-orange-600 text-white shadow-md shadow-orange-100 scale-105"
                          : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Suggestions & Appreciations
                </label>
                <textarea
                  required
                  placeholder="Tell us what's on your mind... (Feature requests, bugs, or just a hello!)"
                  className="w-full h-32 p-4 bg-slate-50 border border-slate-100 rounded-xl text-sm resize-none focus:outline-none focus:border-orange-500 transition-colors"
                  value={feedback.message}
                  onChange={(e) =>
                    setFeedback({ ...feedback, message: e.target.value })
                  }
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-orange-600 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <Loader className="animate-spin" size={20} />
                ) : (
                  <>
                    <Send size={18} /> Send Feedback
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
