"use client";

import { useState, useRef, useEffect } from "react";
import { X, Download, ZoomIn, ZoomOut } from "lucide-react";

interface MediaPreviewProps {
  url: string;
  mimeType: string;
  originalName: string;
  onClose: () => void;
}

export function MediaPreview({ url, mimeType, originalName, onClose }: MediaPreviewProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const lastTouchDist = useRef<number | null>(null);

  const isImage = mimeType.startsWith("image/");
  const isVideo = mimeType.startsWith("video/");
  const isPDF = mimeType === "application/pdf";

  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale((s) => Math.max(0.5, Math.min(5, s + delta)));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      lastTouchDist.current = dist;
    } else if (e.touches.length === 1 && scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDist.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      const delta = (dist - lastTouchDist.current) * 0.01;
      setScale((s) => Math.max(0.5, Math.min(5, s + delta)));
      lastTouchDist.current = dist;
    } else if (e.touches.length === 1 && isDragging) {
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    }
  };

  const handleTouchEnd = () => {
    lastTouchDist.current = null;
    setIsDragging(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex flex-col animate-in fade-in duration-200"
      onClick={onClose}
      onWheel={handleWheel}
    >
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
        <button
          onClick={onClose}
          className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition"
        >
          <X size={24} />
        </button>
        <div className="flex items-center gap-2">
          {scale !== 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); resetZoom(); }}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white text-xs transition"
            >
              Reset
            </button>
          )}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            download={originalName}
            onClick={(e) => e.stopPropagation()}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition"
          >
            <Download size={20} />
          </a>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
        {isImage ? (
          <div
            className="max-w-full max-h-full flex items-center justify-center overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={(e) => {
              if (scale > 1) {
                setIsDragging(true);
                setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
              }
            }}
            onMouseMove={(e) => {
              if (isDragging) {
                setPosition({
                  x: e.clientX - dragStart.x,
                  y: e.clientY - dragStart.y,
                });
              }
            }}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
            style={{ cursor: scale > 1 ? "grab" : "default" }}
          >
            <img
              src={url}
              alt={originalName}
              className="max-w-full max-h-full object-contain select-none"
              style={{
                transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                transition: isDragging ? "none" : "transform 0.2s ease-out",
              }}
              draggable={false}
            />
          </div>
        ) : isVideo ? (
          <video
            src={url}
            controls
            controlsList="nodownload"
            className="max-w-full max-h-full rounded-lg"
            autoPlay
          />
        ) : isPDF ? (
          <iframe
            src={`https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`}
            className="w-full h-full min-h-[70vh] rounded-lg bg-white"
            title={originalName}
          />
        ) : (
          <div className="text-center text-white">
            <p className="text-lg font-bold mb-4">{originalName}</p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              download={originalName}
              className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700 transition"
            >
              <Download size={20} />
              Download File
            </a>
          </div>
        )}
      </div>

      {isImage && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/60 rounded-full px-4 py-2">
          <button
            onClick={(e) => { e.stopPropagation(); setScale((s) => Math.max(0.5, s - 0.25)); }}
            className="text-white/70 hover:text-white transition"
          >
            <ZoomOut size={18} />
          </button>
          <span className="text-white text-xs font-medium min-w-[3rem] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); setScale((s) => Math.min(5, s + 0.25)); }}
            className="text-white/70 hover:text-white transition"
          >
            <ZoomIn size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
