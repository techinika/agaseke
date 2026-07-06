"use client";

import React, { useState } from "react";
import {
  Home,
  Compass,
  MessageSquare,
  Shield,
  Loader,
  X,
  Send,
  Heart,
  Share2,
} from "lucide-react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/db/firebase";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";
import Link from "next/link";
import { GrDashboard } from "react-icons/gr";

export default function MobileBottomBar() {
  const auth = useAuth();
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState({
    referralLikelihood: 0,
    loveScale: 0,
    message: "",
  });
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  if (!auth.isLoggedIn) return null;

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (feedback.referralLikelihood === 0 || feedback.loveScale === 0) {
      toast.error("Please provide a rating for both scales!");
      return;
    }
    setFeedbackLoading(true);
    try {
      await addDoc(collection(db, "userFeedback"), {
        creatorId: auth.creator?.uid || "unknown",
        handle: auth.creator?.handle || "unknown",
        ...feedback,
        createdAt: serverTimestamp(),
      });
      toast.success("Feedback received! Thank you for helping Agaseke grow.");
      setShowFeedback(false);
      setFeedback({ referralLikelihood: 0, loveScale: 0, message: "" });
    } catch {
      toast.error("Could not send feedback. Try again later.");
    } finally {
      setFeedbackLoading(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-background border-t border-border pb-2 pt-1">
        <div className="flex items-center justify-around">
          <Link
            href="/supporter"
            className="flex flex-col items-center py-2 w-full text-muted-foreground"
          >
            <Home size={18} />
            <span className="text-[10px] mt-1 font-medium">Feed</span>
          </Link>
          <Link
            href={auth?.isCreator ? "/creator" : "/onboarding"}
            className="flex flex-col items-center py-2 w-full text-muted-foreground"
          >
            <GrDashboard size={18} />
            <span className="text-[10px] mt-1 font-medium">Creator</span>
          </Link>
          <Link
            href="/explore"
            className="flex flex-col items-center py-2 w-full text-muted-foreground"
          >
            <Compass size={18} />
            <span className="text-[10px] mt-1 font-medium">Discover</span>
          </Link>
          {auth.isAdmin && (
            <Link
              href="/admin"
              className="flex flex-col items-center py-2 w-full text-muted-foreground"
            >
              <Shield size={18} />
              <span className="text-[10px] mt-1 font-medium">Admin</span>
            </Link>
          )}
          <button
            onClick={() => setShowFeedback(true)}
            className="flex flex-col items-center py-2 w-full text-muted-foreground"
          >
            <MessageSquare size={18} />
            <span className="text-[10px] mt-1 font-medium">Feedback</span>
          </button>
        </div>
      </div>

      {showFeedback && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4 md:p-0 bg-foreground/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="fixed inset-0"
            onClick={() => setShowFeedback(false)}
          />
          <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl relative z-10 overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
            <header className="p-6 border-b border-border flex items-center justify-between bg-muted/50">
              <div>
                <h3 className="font-bold text-foreground">Help us improve</h3>
                <p className="text-xs text-muted-foreground">
                  Your ideas shape the future of Agaseke.
                </p>
              </div>
              <button
                onClick={() => setShowFeedback(false)}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <X size={20} />
              </button>
            </header>
            <form onSubmit={handleFeedbackSubmit} className="p-6 space-y-6">
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
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
                          : "bg-muted text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
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
                          : "bg-muted text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Suggestions & Appreciations
                </label>
                <textarea
                  required
                  placeholder="Tell us what's on your mind... (Feature requests, bugs, or just a hello!)"
                  className="w-full h-32 p-4 bg-muted border border-border rounded-xl text-sm resize-none focus:outline-none focus:border-orange-500 transition-colors"
                  value={feedback.message}
                  onChange={(e) =>
                    setFeedback({ ...feedback, message: e.target.value })
                  }
                />
              </div>
              <button
                type="submit"
                disabled={feedbackLoading}
                className="w-full py-4 bg-foreground text-background rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-orange-600 transition-all disabled:opacity-50"
              >
                {feedbackLoading ? (
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
