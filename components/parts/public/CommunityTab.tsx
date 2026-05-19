/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { FileText, Lock, Globe, Heart, ChevronDown, ChevronUp } from "lucide-react";

interface CommunityTabProps {
  publicPosts: any[];
  privatePosts: any[];
  isSupporter: boolean;
  name: string;
}

export const CommunityTab = ({
  publicPosts,
  privatePosts,
  isSupporter,
  name,
}: CommunityTabProps) => {
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());

  const toggleExpand = (postId: string) => {
    setExpandedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  };

  const allPosts = isSupporter
    ? [...privatePosts, ...publicPosts].sort(
        (a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)
      )
    : publicPosts;

  const visiblePrivatePosts = privatePosts.length;

  if (allPosts.length === 0) {
    return (
      <div className="animate-in fade-in duration-500">
        <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
          <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
            <FileText className="text-slate-300" size={24} />
          </div>
          <h3 className="font-bold text-slate-900">No posts yet</h3>
          <p className="text-slate-500 text-sm">
            When {name} shares updates, they will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 space-y-8">
      {isSupporter && visiblePrivatePosts > 0 && (
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-4 rounded-xl border border-orange-100 flex items-center gap-3">
          <Heart size={20} className="text-orange-500 fill-orange-500" />
          <p className="text-sm text-orange-800 font-medium">
            You have access to {visiblePrivatePosts} supporter-only{" "}
            {visiblePrivatePosts === 1 ? "post" : "posts"}!
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {allPosts.map((item) => (
          <div
            key={item.id}
            className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold bg-slate-100 px-2 py-1 rounded uppercase tracking-widest text-slate-500">
                {item.type === "video"
                  ? "Video"
                  : item.type === "image"
                    ? "Image"
                    : item.type === "document"
                      ? "Document"
                      : "Post"}
              </span>
              <span
                className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest ${
                  item.isPrivate
                    ? "bg-amber-50 text-amber-600"
                    : "bg-green-50 text-green-600"
                }`}
              >
                {item.isPrivate ? (
                  <>
                    <Lock size={10} /> Supporters Only
                  </>
                ) : (
                  <>
                    <Globe size={10} /> Public
                  </>
                )}
              </span>
            </div>

            {item.type === "image" && item.contentUrl && (
              <div className="mb-3 rounded-lg overflow-hidden">
                <img
                  src={item.contentUrl}
                  alt={item.title}
                  className="w-full max-h-64 object-cover"
                />
              </div>
            )}

            {item.type === "video" && item.contentUrl && (
              <div className="mb-3 rounded-lg overflow-hidden">
                <video
                  src={item.contentUrl}
                  controls
                  className="w-full max-h-64 object-cover bg-black"
                />
              </div>
            )}

            {item.type === "document" && item.contentUrl && (
              <a
                href={item.contentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-3 flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-100 hover:bg-slate-100 transition-colors"
              >
                <FileText size={24} className="text-orange-500" />
                <span className="text-sm font-medium text-slate-700">
                  Download Document
                </span>
              </a>
            )}

            <h4 className="font-bold text-lg mb-2">{item.title}</h4>
            {item.description || item.content ? (
              <div className="text-slate-500 text-sm whitespace-pre-wrap leading-relaxed">
                {(item.description || item.content).length > 200 && !expandedPosts.has(item.id) ? (
                  <>
                    <span>{(item.description || item.content).slice(0, 200)}...</span>
                    <button
                      onClick={() => toggleExpand(item.id)}
                      className="ml-1 text-orange-600 font-medium hover:underline"
                    >
                      Read more
                    </button>
                  </>
                ) : (
                  <>
                    <span>{item.description || item.content}</span>
                    {(item.description || item.content).length > 200 && (
                      <button
                        onClick={() => toggleExpand(item.id)}
                        className="ml-1 text-orange-600 font-medium hover:underline"
                      >
                        Read less
                      </button>
                    )}
                  </>
                )}
              </div>
            ) : null}

            <div className="mt-4 pt-3 border-t border-slate-50 flex items-center gap-2 text-xs text-slate-400">
              <span>
                {item.createdAt?.toDate?.().toLocaleDateString() || "Recently"}
              </span>
              {item.views && (
                <span className="ml-auto">{item.views} views</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
