"use client";

import React, { useRef, useState, useEffect } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { toPng } from "html-to-image";
import { Download, X, Share2, Heart, Loader, Palette, Type } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthContext";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function getLightVariant(hexColor: string, opacity: number = 0.2): string {
  return hexColor + Math.round(opacity * 255).toString(16).padStart(2, "0");
}

const PRESET_COLORS = [
  { name: "Orange", color: "#f97316" },
  { name: "Red", color: "#ef4444" },
  { name: "Pink", color: "#ec4899" },
  { name: "Purple", color: "#a855f7" },
  { name: "Blue", color: "#3b82f6" },
  { name: "Teal", color: "#14b8a6" },
  { name: "Green", color: "#22c55e" },
  { name: "Yellow", color: "#eab308" },
  { name: "Black", color: "#18181b" },
  { name: "Slate", color: "#64748b" },
];

const PRESET_TEXT_COLORS = [
  { name: "White", color: "#ffffff" },
  { name: "Black", color: "#000000" },
  { name: "Orange", color: "#f97316" },
  { name: "Red", color: "#ef4444" },
  { name: "Pink", color: "#ec4899" },
  { name: "Purple", color: "#a855f7" },
  { name: "Blue", color: "#3b82f6" },
  { name: "Teal", color: "#14b8a6" },
  { name: "Green", color: "#22c55e" },
  { name: "Yellow", color: "#eab308" },
];

export default function SharePageModal({ isOpen, onClose }: ShareModalProps) {
  const { creator, profile } = useAuth();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [accentColor, setAccentColor] = useState("#f97316");
  const [textColor, setTextColor] = useState("#ffffff");
  const [customColor, setCustomColor] = useState("");
  const [headline, setHeadline] = useState("Support My Creative Journey");

  const lightVariant = getLightVariant(accentColor, 0.15);

  useEffect(() => {
    if (!isOpen) {
      setHeadline("Support My Creative Journey");
      setAccentColor("#f97316");
      setTextColor("#ffffff");
      setCustomColor("");
    }
  }, [isOpen]);

  const handleColorSelect = (color: string) => {
    setAccentColor(color);
    setCustomColor(color);
  };

  const handleTextColorSelect = (color: string) => {
    setTextColor(color);
  };

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomColor(value);
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      setAccentColor(value);
    }
  };

  const handleHeadlineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= 30) {
      setHeadline(value);
    }
  };

  if (!isOpen) return null;

  const shareUrl = `https://agaseke.me/${creator?.handle}`;

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
        pixelRatio: 3,
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
      <div className="bg-white rounded-lg w-full max-w-5xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <div className="p-4 border-b border-slate-200 border-shadow flex justify-between items-center bg-slate-50/50">
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

        <div className="flex flex-col lg:flex-row">
          <div className="lg:w-1/2 p-6 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
            <div
              ref={cardRef}
              className="w-[320px] h-[420px] bg-white relative overflow-hidden border border-slate-200 shadow-2xl flex flex-col"
            >
              <div className="p-4 text-center relative" style={{ backgroundColor: accentColor }}>
                <div 
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-lg mb-3"
                  style={{ backgroundColor: lightVariant }}
                >
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: textColor }} />
                  <span 
                    className="text-[10px] font-black uppercase tracking-widest"
                    style={{ color: textColor }}
                  >
                    Live on Agaseke
                  </span>
                </div>
                <h2 
                  className="text-2xl font-black leading-tight tracking-tighter"
                  style={{ color: textColor }}
                >
                  {headline || "Support Me"}
                </h2>
              </div>

              <div className="flex justify-evenly items-center px-8 -mt-4 relative z-10">
                <div className="w-20 h-20 bg-white p-1.5 rounded-lg shadow-xl border border-slate-50">
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
                  <p className="font-bold text-sm" style={{ color: accentColor }}>
                    agaseke.me/{creator?.handle}
                  </p>
                </div>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center px-8 pb-6 pt-2">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <QRCodeCanvas
                    value={shareUrl}
                    size={130}
                    level={"H"}
                    fgColor="#000000"
                    marginSize={1}
                  />
                </div>
                <div className="mt-4 flex items-center gap-2" style={{ color: accentColor }}>
                  <Heart size={12} fill={accentColor} stroke="none" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                    Scan to support
                  </span>
                </div>
              </div>

              <div className="py-2 border-t border-slate-50 text-center" style={{ backgroundColor: lightVariant }}>
                <span className="text-lg font-bold" style={{ color: accentColor }}>
                  agaseke.me
                </span>
              </div>
            </div>
          </div>

          <div className="lg:w-1/2 p-6 border-t lg:border-t-0 lg:border-l border-slate-200 space-y-6 max-h-[600px] lg:overflow-y-auto">
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Type size={16} className="text-slate-500" />
                <span className="text-sm font-bold text-slate-700">Headline Text</span>
                <span className="text-xs text-slate-400 ml-auto">{headline.length}/30</span>
              </div>
              <input
                type="text"
                value={headline}
                onChange={handleHeadlineChange}
                maxLength={30}
                placeholder="Enter your headline..."
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-orange-100 outline-none"
              />
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-bold text-slate-700">Text Color</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {PRESET_TEXT_COLORS.map((preset) => (
                  <button
                    key={preset.color}
                    onClick={() => handleTextColorSelect(preset.color)}
                    className={`w-10 h-10 rounded-lg transition-all flex items-center justify-center ${
                      textColor === preset.color
                        ? "ring-2 ring-offset-2 ring-orange-500 scale-110"
                        : "hover:scale-105 border border-slate-200"
                    }`}
                    style={{ backgroundColor: preset.color }}
                    title={preset.name}
                  >
                    {preset.color === "#ffffff" && (
                      <div className="w-full h-full rounded border border-slate-300" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Palette size={16} className="text-slate-500" />
                <span className="text-sm font-bold text-slate-700">Accent Color</span>
              </div>
              
              <div className="grid grid-cols-5 gap-2 mb-3">
                {PRESET_COLORS.map((preset) => (
                  <button
                    key={preset.color}
                    onClick={() => handleColorSelect(preset.color)}
                    className={`w-10 h-10 rounded-lg transition-all ${
                      accentColor === preset.color
                        ? "ring-2 ring-offset-2 ring-slate-400 scale-110"
                        : "hover:scale-105"
                    }`}
                    style={{ backgroundColor: preset.color }}
                    title={preset.name}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={customColor || accentColor}
                  onChange={(e) => handleColorSelect(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border border-slate-200"
                />
                <input
                  type="text"
                  value={customColor}
                  onChange={handleCustomColorChange}
                  placeholder="#f97316"
                  className="flex-1 bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-mono focus:ring-2 focus:ring-orange-100 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl);
                  toast.success("Link copied!");
                }}
                className="bg-slate-100 text-slate-600 py-3 rounded-lg font-bold text-sm hover:bg-slate-200 transition-all border border-slate-200"
              >
                Copy Link
              </button>
              <button
                onClick={onClose}
                className="bg-slate-100 text-slate-600 py-3 rounded-lg font-bold text-sm hover:bg-slate-200 transition-all border border-slate-200"
              >
                Close
              </button>
            </div>

            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-full bg-orange-600 text-white py-4 rounded-lg font-black text-lg shadow-xl shadow-orange-100 hover:bg-orange-700 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isDownloading ? (
                <Loader className="animate-spin" size={24} />
              ) : (
                <>
                  <Download size={24} /> Download Share Picture
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
