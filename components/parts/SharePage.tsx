"use client";

import React, { useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { toPng } from "html-to-image";
import { Download, X, Share2, Heart, Loader } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthContext";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SharePageModal({ isOpen, onClose }: ShareModalProps) {
  const { creator, profile } = useAuth();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen) return null;

  const shareUrl = `https://agaseke.me/${creator?.handle}`;

  // FIX: Using a proxy to bypass CORS issues for external images
  const safeProfileImage = creator?.profilePicture
    ? creator?.profilePicture
    : profile?.photoURL
      ? `https://images.weserv.nl/?url=${encodeURIComponent(profile.photoURL)}&w=200&h=200&fit=cover&mask=circle`
      : null;

  const handleDownload = async () => {
    if (cardRef.current === null) return;

    setIsDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 3, // High-res export
        backgroundColor: "#ffffff",
      });

      const link = document.createElement("a");
      link.download = `support-${creator?.handle}-agaseke.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Social flier ready!");
    } catch (err) {
      console.error("Export Error:", err);
      toast.error("Failed to generate image.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div className="bg-white rounded-lg w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <div className="p-6 border-b border-slate-200 border-shadow flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Share2 size={20} className="text-orange-600" />
            </div>
            <h3 className="font-black text-slate-800 tracking-tight">
              Social Share Picture
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-8 flex flex-col items-center">
          <div
            ref={cardRef}
            className="w-[360px] h-[480px] bg-white relative overflow-hidden border border-slate-100 shadow-xl flex flex-col"
          >
            <div className="bg-orange-600 p-4 text-center relative">
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-lg mb-3">
                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span className="text-[10px] font-black text-white uppercase tracking-widest">
                  Live on Agaseke
                </span>
              </div>
              <h2 className="text-2xl font-black text-white leading-tight tracking-tighter">
                Support My Creative Journey
              </h2>
            </div>

            <div className="flex justify-evenly items-center px-8 -mt-4 relative z-10">
              <div className="w-20 h-20 bg-white p-1.5 rounded-lg shadow-2xl border border-slate-50">
                {safeProfileImage ? (
                  <img
                    src={safeProfileImage}
                    alt=""
                    className="w-full h-full rounded-[1.2rem] object-cover"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="w-full h-full rounded-[1.2rem] bg-slate-900 flex items-center justify-center text-white text-3xl font-black">
                    {creator?.name?.charAt(0)}
                  </div>
                )}
              </div>

              <div className="text-center mt-4 space-y-1">
                <h4 className="text-xl font-black text-slate-900 tracking-tighter">
                  {creator?.name}
                </h4>
                <p className="text-orange-600 font-bold text-sm">
                  agaseke.me/{creator?.handle}
                </p>
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center px-8 pb-6 pt-2">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                <QRCodeCanvas
                  value={shareUrl}
                  size={140}
                  level={"H"}
                  fgColor="#000000"
                  marginSize={1}
                />
              </div>
              <div className="mt-4 flex items-center gap-2 text-slate-400">
                <Heart size={12} className="fill-orange-600 stroke-none" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                  Scan to support
                </span>
              </div>
            </div>

            <div className="py-2 border-t border-slate-50 text-center bg-slate-50/50">
              <span className="text-lg font-bold text-orange-200">
                agaseke.me
              </span>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4 w-full">
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="col-span-2 bg-orange-600 text-white py-4 rounded-lg font-black text-lg shadow-xl shadow-orange-100 hover:bg-orange-700 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isDownloading ? (
                <Loader className="animate-spin" size={24} />
              ) : (
                <>
                  <Download size={24} /> Download Share Picture
                </>
              )}
            </button>

            <button
              onClick={() => {
                navigator.clipboard.writeText(shareUrl);
                toast.success("Link copied!");
              }}
              className="bg-slate-50 text-slate-600 py-3 rounded-lg font-bold text-sm hover:bg-slate-100 transition-all border border-slate-100"
            >
              Copy Link
            </button>
            <button
              onClick={onClose}
              className="bg-slate-50 text-slate-600 py-3 rounded-lg font-bold text-sm hover:bg-slate-100 transition-all border border-slate-100"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
