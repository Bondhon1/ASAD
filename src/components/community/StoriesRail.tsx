"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";

interface StoryAuthor {
  id: string;
  fullName: string | null;
  volunteerId: string | null;
  profilePicUrl: string | null;
}

interface StoryItem {
  id: string;
  imageUrl: string;
  createdAt: string;
  createdBy: StoryAuthor;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

async function uploadStoryImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const base64 = (e.target?.result as string).split(",")[1];
        const res = await fetch("/api/community/stories/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name.replace(/[^a-zA-Z0-9._-]/g, "_"),
            mimeType: file.type,
            data: base64,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          reject(new Error(data.error || "Upload failed"));
          return;
        }

        resolve(data.url);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export default function StoriesRail({ userRole }: { userRole: string }) {
  const isMaster = userRole === "MASTER";

  const [stories, setStories] = useState<StoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [expanded, setExpanded] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPreviewPaused, setIsPreviewPaused] = useState(false);

  const fetchStories = useCallback(async () => {
    try {
      const res = await fetch("/api/community/stories?limit=40", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load stories");
      setStories(Array.isArray(data.stories) ? data.stories : []);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to load stories";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStories();
    const timer = setInterval(fetchStories, 60_000);
    return () => clearInterval(timer);
  }, [fetchStories]);

  useEffect(() => {
    if (!expanded || stories.length < 2) return;

    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % stories.length);
    }, 4000);

    return () => clearInterval(timer);
  }, [expanded, stories.length]);

  useEffect(() => {
    if (!expanded) {
      setIsPreviewPaused(false);
    }
  }, [expanded]);

  const trackStories = useMemo(() => {
    if (stories.length > 3) return [...stories, ...stories];
    return stories;
  }, [stories]);

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const file = fileList[0];
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const imageUrl = await uploadStoryImage(file);
      const createRes = await fetch("/api/community/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      });

      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error || "Failed to create story");

      setStories((prev) => [createData.story, ...prev]);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to upload story";
      setError(message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-3 sm:p-4 mb-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-sm sm:text-base font-semibold text-slate-800">Stories</h2>
          <p className="text-xs text-slate-500">Portrait stories from MASTER</p>
        </div>

        {isMaster && (
          <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 cursor-pointer transition-colors">
            {uploading ? "Uploading…" : "Upload Story"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                void handleUpload(e.target.files);
                e.currentTarget.value = "";
              }}
            />
          </label>
        )}
      </div>

      {error && <p className="mb-3 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      {loading ? (
        <div className="h-[188px] rounded-xl bg-slate-100 animate-pulse" />
      ) : (
        <div className="relative overflow-hidden rounded-xl">
          <div className={`flex gap-3 w-max ${stories.length > 3 && !isPreviewPaused ? "animate-story-marquee" : ""}`}>
            {trackStories.map((story, idx) => (
              <button
                key={`${story.id}-${idx}`}
                type="button"
                onClick={() => {
                  const originalIndex = idx % stories.length;
                  setIsPreviewPaused(true);
                  setActiveIndex(originalIndex);
                  setExpanded(true);
                }}
                className="relative w-[112px] sm:w-[124px] h-[188px] sm:h-[208px] rounded-xl overflow-hidden border border-slate-200 bg-slate-800 flex-shrink-0 group"
              >
                <Image
                  src={story.imageUrl}
                  alt={story.createdBy.fullName || "Story"}
                  fill
                  className="object-contain"
                  sizes="(max-width: 640px) 112px, 124px"
                />
                <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/70 to-transparent text-left">
                  <p className="text-[10px] sm:text-[11px] text-white font-semibold truncate">
                    {story.createdBy.fullName || "MASTER"}
                  </p>
                  <p className="text-[9px] sm:text-[10px] text-white/80 truncate">{timeAgo(story.createdAt)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {expanded && stories[activeIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-5"
          onClick={() => setExpanded(false)}
        >
          <button
            type="button"
            className="absolute top-3 right-4 text-white/90 hover:text-white text-3xl leading-none"
            onClick={() => {
              setExpanded(false);
              setIsPreviewPaused(false);
            }}
          >
            ×
          </button>

          {stories.length > 1 && (
            <>
              <button
                type="button"
                className="absolute left-2 sm:left-4 text-white/85 hover:text-white text-4xl"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveIndex((prev) => (prev - 1 + stories.length) % stories.length);
                }}
              >
                ‹
              </button>
              <button
                type="button"
                className="absolute right-2 sm:right-4 text-white/85 hover:text-white text-4xl"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveIndex((prev) => (prev + 1) % stories.length);
                }}
              >
                ›
              </button>
            </>
          )}

          <div className="relative w-[min(92vw,460px)] h-[min(86vh,760px)]" onClick={(e) => e.stopPropagation()}>
            <Image
              src={stories[activeIndex].imageUrl}
              alt={stories[activeIndex].createdBy.fullName || "Story"}
              fill
              className="object-contain rounded-xl"
              sizes="92vw"
              priority
            />

            <div className="absolute inset-x-0 bottom-0 p-3 rounded-b-xl bg-gradient-to-t from-black/80 to-transparent">
              <p className="text-sm text-white font-semibold truncate">
                {stories[activeIndex].createdBy.fullName || "MASTER"}
              </p>
              <p className="text-xs text-white/80">{timeAgo(stories[activeIndex].createdAt)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
