/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { CheckCircle2, Copy, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";

export const ShareModal = ({
  setIsShareModalOpen,
  name,
  username,
}: {
  setIsShareModalOpen: any;
  name: string;
  username: string;
}) => {
  const [copySuccess, setCopySuccess] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const profileUrl = `https://agaseke.me/${username}`;
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopySuccess(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy!", err);
    }
  };
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-foreground/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-card w-full max-w-sm rounded-2xl shadow-2xl p-6 border border-border animate-in zoom-in-95 duration-300">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg text-foreground">Share Profile</h3>
          <button
            onClick={() => setIsShareModalOpen(false)}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Copy this link to share {name.split(" ")[0]}&apos;s Agaseke with your
          community.
        </p>

        <div className="flex items-center gap-2 bg-muted border border-border p-2 rounded-xl">
          <div className="flex-1 px-2 text-sm font-medium text-muted-foreground truncate">
            {profileUrl}
          </div>
          <button
            onClick={copyToClipboard}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-all ${
              copySuccess
                ? "bg-green-500 text-white"
                : "bg-foreground text-background hover:bg-orange-600"
            }`}
          >
            {copySuccess ? (
              <>
                <CheckCircle2 size={14} /> Copied
              </>
            ) : (
              <>
                <Copy size={14} /> Copy
              </>
            )}
          </button>
        </div>

        <button
          onClick={() => setIsShareModalOpen(false)}
          className="w-full mt-6 text-muted-foreground text-xs font-bold uppercase tracking-widest hover:text-foreground transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};
