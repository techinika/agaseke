"use client";

import { CheckCircle2, Copy, X } from "lucide-react";
import { useState } from "react";

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
  const profileUrl = `https://agaseke.me/${username}`;
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy!", err);
    }
  };
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 border border-slate-100 animate-in zoom-in-95 duration-300">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg text-slate-900">Share Profile</h3>
          <button
            onClick={() => setIsShareModalOpen(false)}
            className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-slate-500 mb-4">
          Copy this link to share {name.split(" ")[0]}'s Agaseke with your
          community.
        </p>

        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-2 rounded-xl">
          <div className="flex-1 px-2 text-sm font-medium text-slate-600 truncate">
            {profileUrl}
          </div>
          <button
            onClick={copyToClipboard}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-all ${
              copySuccess
                ? "bg-green-500 text-white"
                : "bg-slate-900 text-white hover:bg-orange-600"
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
          className="w-full mt-6 text-slate-400 text-xs font-bold uppercase tracking-widest hover:text-slate-600 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};
