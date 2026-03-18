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
  displayName: string | null;
  info: string | null;
  externalLink: string | null;
  createdBy: StoryAuthor;
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

  const [customName, setCustomName] = useState("");
  const [storyInfo, setStoryInfo] = useState("");
  const [externalLink, setExternalLink] = useState("");

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
        body: JSON.stringify({
          imageUrl,
          displayName: customName.trim(),
          info: storyInfo.trim(),
          externalLink: externalLink.trim(),
        }),
      });

      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error || "Failed to create story");

      setStories((prev) => [createData.story, ...prev]);
      setCustomName("");
      setStoryInfo("");
      setExternalLink("");
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
          <h2 className="text-sm sm:text-base font-semibold text-slate-800">ASADIAN CONTENT CREATOR</h2>
        </div>

        {isMaster && (
          <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 cursor-pointer transition-colors">
            {uploading ? "Uploading…" : "Upload Creator Info"}
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

      {isMaster && (
        <div className="mb-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            maxLength={120}
            placeholder="Name"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs sm:text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
          <input
            type="text"
            value={storyInfo}
            onChange={(e) => setStoryInfo(e.target.value)}
            maxLength={220}
            placeholder="Info"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs sm:text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
          <input
            type="url"
            value={externalLink}
            onChange={(e) => setExternalLink(e.target.value)}
            maxLength={500}
            placeholder="External Link (optional)"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs sm:text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
        </div>
      )}

      {error && <p className="mb-3 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      {loading ? (
        <div className="h-[208px] rounded-xl bg-slate-100 animate-pulse" />
      ) : (
        <div className="relative overflow-hidden rounded-xl">
          <div className={`flex gap-3 w-max ${stories.length > 3 ? "animate-story-marquee" : ""}`}>
            {trackStories.map((story, idx) => (
              story.externalLink ? (
                <a
                  key={`${story.id}-${idx}`}
                  href={story.externalLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative w-[124px] sm:w-[136px] h-[208px] sm:h-[228px] rounded-xl overflow-hidden border border-slate-200 bg-slate-800 flex-shrink-0 group block"
                >
                  <Image
                    src={story.imageUrl}
                    alt={story.displayName || story.createdBy.fullName || "Story"}
                    fill
                    className="object-contain"
                    sizes="(max-width: 640px) 124px, 136px"
                  />
                  <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/70 to-transparent text-left">
                    <p className="text-[10px] sm:text-[11px] text-white font-semibold truncate">
                      {story.displayName || story.createdBy.fullName || "MASTER"}
                    </p>
                    {story.info ? <p className="text-[9px] sm:text-[10px] text-white/80 truncate">{story.info}</p> : null}
                  </div>
                </a>
              ) : (
                <div
                  key={`${story.id}-${idx}`}
                  className="relative w-[124px] sm:w-[136px] h-[208px] sm:h-[228px] rounded-xl overflow-hidden border border-slate-200 bg-slate-800 flex-shrink-0"
                >
                  <Image
                    src={story.imageUrl}
                    alt={story.displayName || story.createdBy.fullName || "Story"}
                    fill
                    className="object-contain"
                    sizes="(max-width: 640px) 124px, 136px"
                  />
                  <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/70 to-transparent text-left">
                    <p className="text-[10px] sm:text-[11px] text-white font-semibold truncate">
                      {story.displayName || story.createdBy.fullName || "MASTER"}
                    </p>
                    {story.info ? <p className="text-[9px] sm:text-[10px] text-white/80 truncate">{story.info}</p> : null}
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
