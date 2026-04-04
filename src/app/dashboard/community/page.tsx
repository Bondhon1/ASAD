"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useCachedUserProfile } from "@/hooks/useCachedUserProfile";
import { MentionTextarea } from "@/components/community/MentionTextarea";
import {
  Avatar,
  PostCard,
  type Post,
  type Author,
} from "@/components/community/PostCard";
import CommunityLeaderboard from "@/components/community/Leaderboard";
import StoriesRail from "@/components/community/StoriesRail";

// ─── Audience Picker (mirrors task creation pattern) ──────────────────────────

interface AudienceSpec {
  all?: boolean;
  services?: string[];
  sectors?: string[];
  clubs?: string[];
}

interface AudiencePickerProps {
  services: { id: string; name: string }[];
  sectors: { id: string; name: string }[];
  clubs: { id: string; name: string }[];
  audience: AudienceSpec;
  onChange: (a: AudienceSpec) => void;
}

function AudiencePicker({ services, sectors, clubs, audience, onChange }: AudiencePickerProps) {
  const toggle = (kind: "services" | "sectors" | "clubs", id: string) => {
    const list = (audience[kind] || []) as string[];
    const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
    onChange({ ...audience, all: false, [kind]: next });
  };

  return (
    <div className="space-y-3">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Target Audience</label>
      <button
        type="button"
        onClick={() => onChange({ all: !audience.all })}
        className={`w-full text-left px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
          audience.all ? "bg-amber-50 border-amber-300 text-amber-800" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
        }`}
      >
        {audience.all ? "✓ " : ""}All Official Members
      </button>

      {!audience.all && (
        <>
          {services.length > 0 && (
            <div>
              <p className="text-xs text-slate-400 mb-1.5">Services</p>
              <div className="flex flex-wrap gap-1.5">
                {services.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggle("services", s.id)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      audience.services?.includes(s.id)
                        ? "bg-amber-100 border-amber-400 text-amber-800"
                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {sectors.length > 0 && (
            <div>
              <p className="text-xs text-slate-400 mb-1.5">Sectors</p>
              <div className="flex flex-wrap gap-1.5">
                {sectors.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggle("sectors", s.id)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      audience.sectors?.includes(s.id)
                        ? "bg-amber-100 border-amber-400 text-amber-800"
                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {clubs.length > 0 && (
            <div>
              <p className="text-xs text-slate-400 mb-1.5">Clubs</p>
              <div className="flex flex-wrap gap-1.5">
                {clubs.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggle("clubs", c.id)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      audience.clubs?.includes(c.id)
                        ? "bg-amber-100 border-amber-400 text-amber-800"
                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Image Upload Helper ───────────────────────────────────────────────────────

const MAX_IMAGE_UPLOAD_BYTES = 4 * 1024 * 1024;

async function readApiJsonSafe(response: Response): Promise<any> {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    if (!response.ok) {
      if (text.includes("FUNCTION_PAYLOAD_TOO_LARGE") || text.includes("Request Entity Too Large")) {
        throw new Error("Upload payload is too large. Please use an image smaller than 4 MB.");
      }
      throw new Error(text.slice(0, 180));
    }
    throw new Error("Invalid server response");
  }
}

async function uploadImageToBlob(file: File, context?: "REGULAR_POST"): Promise<string> {
  if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
    throw new Error("Image too large. Maximum size is 4 MB.");
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "image";
  const formData = new FormData();
  formData.append("file", file, safeName);
  if (context) formData.append("context", context);

  const res = await fetch("/api/community/upload", {
    method: "POST",
    body: formData,
  });

  const d = await readApiJsonSafe(res);
  if (!res.ok) throw new Error(d?.error || "Upload failed");
  if (!d?.url) throw new Error("Upload failed");
  return d.url;
}

// ─── Image Picker ──────────────────────────────────────────────────────────────

function ImagePicker({
  images,
  uploading,
  onAdd,
  onRemove,
  maxImages = 5,
  label,
  compact = false,
}: {
  images: string[];
  uploading: boolean;
  onAdd: (files: FileList) => void;
  onRemove: (i: number) => void;
  maxImages?: number;
  label?: string;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const thumbClass = compact ? "w-14 h-14" : "w-20 h-20";
  const thumbSize = compact ? "56px" : "80px";
  const removeBtnClass = compact ? "w-4 h-4 text-[10px]" : "w-5 h-5 text-xs";
  const addBtnClass = compact
    ? "text-[10px] gap-0.5"
    : "text-xs gap-1";
  return (
    <div>
      <label className={`${compact ? "text-[10px]" : "text-xs"} font-semibold text-slate-500 uppercase tracking-wide`}>{label || `Images (up to ${maxImages})`}</label>
      <div className="flex flex-wrap gap-2 mt-2">
        {images.map((url, i) => (
          <div key={i} className={`relative ${thumbClass} rounded-lg overflow-hidden border border-slate-200 group`}>
            <Image src={url} alt="" fill className="object-cover" sizes={thumbSize} />
            <button
              type="button"
              onClick={() => onRemove(i)}
              className={`absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${removeBtnClass}`}
            >
              ×
            </button>
          </div>
        ))}
        {images.length < maxImages && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className={`${thumbClass} rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:border-slate-400 transition-colors disabled:opacity-50 ${addBtnClass}`}
          >
            {uploading ? (
              <div className={`${compact ? "w-3.5 h-3.5" : "w-4 h-4"} border-2 border-slate-400 border-t-transparent rounded-full animate-spin`} />
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width={compact ? "16" : "20"} height={compact ? "16" : "20"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                Add
              </>
            )}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && onAdd(e.target.files)}
      />
    </div>
  );
}

// ─── Notice Creation Modal ─────────────────────────────────────────────────────

function NoticeModal({
  isOpen,
  onClose,
  onSubmit,
  services,
  sectors,
  clubs,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { content: string; images: string[]; targetAudience: AudienceSpec | null }) => Promise<void>;
  services: { id: string; name: string }[];
  sectors: { id: string; name: string }[];
  clubs: { id: string; name: string }[];
}) {
  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [audience, setAudience] = useState<AudienceSpec>({ all: true });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImages = async (files: FileList) => {
    setUploading(true);
    setError(null);
    const toUpload = Array.from(files).slice(0, 5 - images.length);
    const urls: string[] = [];
    for (const f of toUpload) {
      try {
        const url = await uploadImageToBlob(f);
        urls.push(url);
      } catch (e: any) {
        setError(e.message || "Upload failed");
      }
    }
    setImages((prev) => [...prev, ...urls]);
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!content.trim()) { setError("Content is required"); return; }
    setSubmitting(true);
    setError(null);
    try {
      const hasAudience =
        audience.all ||
        (audience.services?.length ?? 0) > 0 ||
        (audience.sectors?.length ?? 0) > 0 ||
        (audience.clubs?.length ?? 0) > 0;
      await onSubmit({ content: content.trim(), images, targetAudience: hasAudience ? audience : null });
      setContent("");
      setImages([]);
      setAudience({ all: true });
      onClose();
    } catch (e: any) {
      setError(e.message || "Failed to post");
    }
    setSubmitting(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-1 rounded-full border border-amber-200">📢 NOTICE</span>
            <h3 className="font-semibold text-slate-800">Create Notice</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Content</label>
            <MentionTextarea
              value={content}
              onChange={setContent}
              placeholder="Write the notice here…"
              className="w-full mt-1.5 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all"
              rows={5}
              maxLength={2000}
            />
            <div className="text-right text-xs text-slate-400 mt-1">{content.length}/2000</div>
          </div>

          <ImagePicker images={images} uploading={uploading} onAdd={handleImages} onRemove={(i) => setImages((p) => p.filter((_, j) => j !== i))} />

          <AudiencePicker
            services={services}
            sectors={sectors}
            clubs={clubs}
            audience={audience}
            onChange={setAudience}
          />

          {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        </div>

        <div className="flex gap-2 p-4 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 px-4 py-2 bg-white border border-slate-200 text-sm rounded-xl text-slate-600 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !content.trim()}
            className="flex-1 px-4 py-2 bg-amber-500 text-white text-sm font-semibold rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Publishing…" : "Publish Notice"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sponsored AD Creation Modal ───────────────────────────────────────────────

function SponsoredAdModal({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { content: string; images: string[] }) => Promise<void>;
}) {
  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImages = async (files: FileList) => {
    setUploading(true);
    setError(null);
    const toUpload = Array.from(files).slice(0, 5 - images.length);
    const urls: string[] = [];
    for (const f of toUpload) {
      try {
        const url = await uploadImageToBlob(f);
        urls.push(url);
      } catch (e: any) {
        setError(e.message || "Upload failed");
      }
    }
    setImages((prev) => [...prev, ...urls]);
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!content.trim()) { setError("Content is required"); return; }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ content: content.trim(), images });
      setContent("");
      setImages([]);
      onClose();
    } catch (e: any) {
      setError(e.message || "Failed to post");
    }
    setSubmitting(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-1 rounded-full border border-blue-200">✓ SPONSORED</span>
            <h3 className="font-semibold text-slate-800">Create Sponsored AD</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Content</label>
            <MentionTextarea
              value={content}
              onChange={setContent}
              placeholder="Write the sponsored ad content…"
              className="w-full mt-1.5 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition-all"
              rows={5}
              maxLength={2000}
            />
            <div className="text-right text-xs text-slate-400 mt-1">{content.length}/2000</div>
          </div>

          <ImagePicker images={images} uploading={uploading} onAdd={handleImages} onRemove={(i) => setImages((p) => p.filter((_, j) => j !== i))} />

          {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        </div>

        <div className="flex gap-2 p-4 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 px-4 py-2 bg-white border border-slate-200 text-sm rounded-xl text-slate-600 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !content.trim()}
            className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Publishing…" : "Publish Sponsored AD"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Post Modal (for NOTICE and SPONSORED_AD posts) ──────────────────────

function EditPostModal({
  post,
  onClose,
  onSave,
  services,
  sectors,
  clubs,
}: {
  post: { id: string; content: string; postType?: string; images?: string[]; targetAudience?: string | null } | null;
  onClose: () => void;
  onSave: (id: string, updates: { content: string; images?: string[]; targetAudience?: string | null }) => Promise<void>;
  services: { id: string; name: string }[];
  sectors: { id: string; name: string }[];
  clubs: { id: string; name: string }[];
}) {
  const [content, setContent] = useState(post?.content || "");
  const [images, setImages] = useState<string[]>(post?.images || []);
  const [uploading, setUploading] = useState(false);
  const [audience, setAudience] = useState<AudienceSpec>(() => {
    try { return post?.targetAudience ? JSON.parse(post.targetAudience) : { all: true }; }
    catch { return { all: true }; }
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (post) {
      setContent(post.content);
      setImages(post.images || []);
      try { setAudience(post.targetAudience ? JSON.parse(post.targetAudience) : { all: true }); }
      catch { setAudience({ all: true }); }
      setError(null);
    }
  }, [post?.id]);

  const handleImages = async (files: FileList) => {
    setUploading(true);
    setError(null);
    const toUpload = Array.from(files).slice(0, 5 - images.length);
    const urls: string[] = [];
    for (const f of toUpload) {
      try { urls.push(await uploadImageToBlob(f)); }
      catch (e: any) { setError(e.message || "Upload failed"); }
    }
    setImages((prev) => [...prev, ...urls]);
    setUploading(false);
  };

  const handleSave = async () => {
    if (!post || !content.trim()) { setError("Content is required"); return; }
    setSubmitting(true);
    setError(null);
    try {
      const updates: { content: string; images?: string[]; targetAudience?: string | null } = {
        content: content.trim(),
        images,
      };
      if (post.postType === "NOTICE") {
        const hasAudience = audience.all || (audience.services?.length ?? 0) > 0 || (audience.sectors?.length ?? 0) > 0 || (audience.clubs?.length ?? 0) > 0;
        updates.targetAudience = hasAudience ? JSON.stringify(audience) : null;
      }
      await onSave(post.id, updates);
      onClose();
    } catch (e: any) {
      setError(e.message || "Failed to save");
    }
    setSubmitting(false);
  };

  if (!post) return null;

  const isNotice = post.postType === "NOTICE";
  const accentClass = isNotice ? "ring-amber-400 bg-amber-500 hover:bg-amber-600" : "ring-blue-400 bg-blue-600 hover:bg-blue-700";
  const label = isNotice ? "📢 Edit Notice" : "✓ Edit Sponsored AD";

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${isNotice ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-blue-100 text-blue-800 border-blue-200"}`}>{label}</span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Content</label>
            <MentionTextarea
              value={content}
              onChange={setContent}
              className="w-full mt-1.5 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-400 focus:bg-white transition-all"
              rows={5}
              maxLength={2000}
            />
            <div className="text-right text-xs text-slate-400 mt-1">{content.length}/2000</div>
          </div>

          <ImagePicker images={images} uploading={uploading} onAdd={handleImages} onRemove={(i) => setImages((p) => p.filter((_, j) => j !== i))} />

          {isNotice && (
            <AudiencePicker services={services} sectors={sectors} clubs={clubs} audience={audience} onChange={setAudience} />
          )}

          {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        </div>

        <div className="flex gap-2 p-4 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 px-4 py-2 bg-white border border-slate-200 text-sm rounded-xl text-slate-600 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={submitting || !content.trim()}
            className={`flex-1 px-4 py-2 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${accentClass}`}
          >
            {submitting ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}



export default function CommunityPage() {
  const { data: session } = useSession();
  const userEmail = session?.user?.email || "";
  const { user } = useCachedUserProfile<any>(userEmail, undefined, {
    pollIntervalMs: 0,
    refreshOnVisibility: false,
  });
  const searchParams = useSearchParams();
  const router = useRouter();
  const highlightPostId = searchParams.get("post");
  const hashtagFilter = searchParams.get("hashtag");

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const [newPostContent, setNewPostContent] = useState("");
  const [newPostImages, setNewPostImages] = useState<string[]>([]);
  const [newPostUploading, setNewPostUploading] = useState(false);
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [officialPostImageEnabled, setOfficialPostImageEnabled] = useState(false);
  const [postImageToggleLoading, setPostImageToggleLoading] = useState(true);
  const [postImageToggleSaving, setPostImageToggleSaving] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ users: any[]; posts: any[] } | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const regularPostImageInputRef = useRef<HTMLInputElement>(null);

  const [view, setView] = useState<"feed" | "timeline">("feed");

  // Special post modals
  const [noticeModalOpen, setNoticeModalOpen] = useState(false);
  const [adModalOpen, setAdModalOpen] = useState(false);
  const [editingSpecialPost, setEditingSpecialPost] = useState<Post | null>(null);

  // Audience data for notice targeting
  const [servicesList, setServicesList] = useState<{ id: string; name: string }[]>([]);
  const [sectorsList, setSectorsList] = useState<{ id: string; name: string }[]>([]);
  const [clubsList, setClubsList] = useState<{ id: string; name: string }[]>([]);
  
  // Native app leaderboard modal - reference to setter from Leaderboard component
  const [leaderboardMobileOpenSetter, setLeaderboardMobileOpenSetter] = useState<((open: boolean) => void) | null>(null);

  const closeSearchDropdown = useCallback(() => {
    setSearchResults(null);
    setSearchQuery("");
    setSearchOpen(false);
  }, []);

  const scrollToAndHighlightPost = useCallback((postId: string) => {
    const el = document.getElementById(`post-${postId}`);
    if (!el) return false;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-[#1E3A5F]", "ring-offset-2");
    setTimeout(() => el.classList.remove("ring-2", "ring-[#1E3A5F]", "ring-offset-2"), 2500);
    return true;
  }, []);

  const goToExactPostFromSearch = useCallback(
    async (postId: string) => {
      closeSearchDropdown();

      if (scrollToAndHighlightPost(postId)) return;

      const hasPost = posts.some((p) => p.id === postId);
      if (!hasPost) {
        try {
          const res = await fetch(`/api/community/posts/${postId}`, { cache: "no-store" });
          if (res.ok) {
            const d = await readApiJsonSafe(res);
            if (d?.post) {
              setPosts((prev) => (prev.some((p) => p.id === d.post.id) ? prev : [d.post, ...prev]));
              setTimeout(() => {
                scrollToAndHighlightPost(postId);
              }, 120);
              return;
            }
          }
        } catch {}
      }

      const url = new URL(window.location.href);
      url.searchParams.set("post", postId);
      router.replace(url.pathname + (url.search || ""), { scroll: false });
    },
    [closeSearchDropdown, posts, router, scrollToAndHighlightPost]
  );

  const currentUserId = (user as any)?.id || (session as any)?.user?.id || "";

  const _commStatus = (session as any)?.user?.status;
  const _commRole = (session as any)?.user?.role || '';
  const _COMM_STAFF = ['HR', 'MASTER', 'ADMIN', 'DIRECTOR', 'DATABASE_DEPT', 'SECRETARIES'];
  const isOfficialOrStaff = _COMM_STAFF.includes(_commRole) || _commStatus === 'OFFICIAL';

  const canCreateNotice = ['ADMIN', 'MASTER', 'SECRETARIES'].includes(_commRole);
  const canCreateAd = _commRole === 'MASTER';
  const canManagePostImageToggle = _commRole === 'MASTER';

  // Load audience data when notice modal might be opened
  useEffect(() => {
    if (!canCreateNotice) return;
    (async () => {
      try {
        const res = await fetch("/api/orgs");
        if (!res.ok) return;
        const d = await readApiJsonSafe(res);
        setServicesList(d.services || []);
        setSectorsList(d.sectors || []);
        setClubsList(d.clubs || []);
      } catch {}
    })();
  }, [canCreateNotice]);

  useEffect(() => {
    if (!isOfficialOrStaff) {
      setOfficialPostImageEnabled(false);
      setPostImageToggleLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/community/post-image-toggle");
        const d = await readApiJsonSafe(res);
        if (!cancelled && res.ok) {
          setOfficialPostImageEnabled(d.enabled === true);
        }
      } catch {
        if (!cancelled) setOfficialPostImageEnabled(false);
      } finally {
        if (!cancelled) setPostImageToggleLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOfficialOrStaff]);

  // Search logic — debounced, queries users + posts in parallel
  const handleSearchChange = useCallback((q: string) => {
    setSearchQuery(q);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!q.trim() || q.trim().length < 2) {
      setSearchResults(null);
      return;
    }
    searchTimerRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const [usersRes, postsRes] = await Promise.all([
          fetch(`/api/community/users/mention-search?q=${encodeURIComponent(q.trim())}`),
          fetch(`/api/community/posts?q=${encodeURIComponent(q.trim())}&limit=5`, { cache: "no-store" }),
        ]);
        const usersData = usersRes.ok ? await readApiJsonSafe(usersRes) : { users: [] };
        const postsData = postsRes.ok ? await readApiJsonSafe(postsRes) : { posts: [] };
        setSearchResults({ users: usersData.users || [], posts: postsData.posts || [] });
      } catch {
        setSearchResults({ users: [], posts: [] });
      } finally {
        setSearchLoading(false);
      }
    }, 350);
  }, []);

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        closeSearchDropdown();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [closeSearchDropdown]);

  const loadPosts = useCallback(
    async (cursor?: string, replace = false) => {
      // Only load posts for official members or staff
      if (!isOfficialOrStaff) {
        setLoading(false);
        return;
      }
      if (!cursor) setLoading(true);
      else setLoadingMore(true);

      try {
        const params = new URLSearchParams({ limit: "10" });
        if (cursor) params.set("cursor", cursor);
        if (view === "timeline" && currentUserId) params.set("authorId", currentUserId);
        if (hashtagFilter) params.set("hashtag", hashtagFilter);

        const res = await fetch(`/api/community/posts?${params}`, { cache: "no-store" });
        if (!res.ok) return;
        const d = await readApiJsonSafe(res);
        const newPosts: Post[] = d.posts || [];

        if (replace) {
          setPosts(newPosts);
        } else {
          setPosts((prev) => {
            const ids = new Set(prev.map((p) => p.id));
            return [...prev, ...newPosts.filter((p) => !ids.has(p.id))];
          });
        }
        setNextCursor(d.nextCursor || null);
        setHasMore(!!d.nextCursor);
      } catch {}

      setLoading(false);
      setLoadingMore(false);
    },
    [view, currentUserId, isOfficialOrStaff, hashtagFilter]
  );

  useEffect(() => {
    setPosts([]);
    setNextCursor(null);
    setHasMore(true);
    loadPosts(undefined, true);
  }, [view, loadPosts]);

  // Scroll to highlighted post after it loads
  useEffect(() => {
    if (!highlightPostId || loading) return;
    if (scrollToAndHighlightPost(highlightPostId)) {
      setTimeout(() => {
        // Clean URL
        const url = new URL(window.location.href);
        url.searchParams.delete("post");
        router.replace(url.pathname + (url.search || ""), { scroll: false });
      }, 400);
    }
  }, [highlightPostId, loading, posts, router, scrollToAndHighlightPost]);

  // If highlighted post is not in current page set, fetch it directly.
  useEffect(() => {
    if (!highlightPostId || loading) return;
    if (posts.some((p) => p.id === highlightPostId)) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/community/posts/${highlightPostId}`, { cache: "no-store" });
        if (!res.ok) return;
        const d = await readApiJsonSafe(res);
        if (cancelled || !d?.post) return;
        setPosts((prev) => (prev.some((p) => p.id === d.post.id) ? prev : [d.post, ...prev]));
      } catch {}
    })();

    return () => {
      cancelled = true;
    };
  }, [highlightPostId, loading, posts]);

  // Infinite scroll
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          if (nextCursor) loadPosts(nextCursor);
        }
      },
      { threshold: 0.1 }
    );
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, nextCursor, loadPosts]);

  const submitPost = async () => {
    if (!newPostContent.trim() || postSubmitting) return;
    setPostSubmitting(true);
    setPostError(null);
    try {
      const res = await fetch("/api/community/posts", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newPostContent.trim(),
          images: newPostImages.slice(0, 1),
        }),
      });
      const d = await readApiJsonSafe(res);
      if (!res.ok) {
        setPostError(d.error || "Failed to post");
        return;
      }
      setPosts((prev) => [d.post, ...prev]);
      setNewPostContent("");
      setNewPostImages([]);
    } catch {
      setPostError("Failed to post. Please try again.");
    } finally {
      setPostSubmitting(false);
    }
  };

  const updateOfficialPostImageToggle = async (enabled: boolean) => {
    if (!canManagePostImageToggle || postImageToggleSaving) return;

    setPostImageToggleSaving(true);
    try {
      const res = await fetch("/api/community/post-image-toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      const d = await readApiJsonSafe(res);
      if (!res.ok) throw new Error(d.error || "Failed to update setting");
      setOfficialPostImageEnabled(d.enabled === true);
      if (!d.enabled) setNewPostImages([]);
    } catch (e: any) {
      setPostError(e.message || "Failed to update image setting");
    } finally {
      setPostImageToggleSaving(false);
    }
  };

  const handleRegularPostImages = async (files: FileList) => {
    if (!officialPostImageEnabled) return;

    setNewPostUploading(true);
    setPostError(null);

    const toUpload = Array.from(files).slice(0, 1 - newPostImages.length);
    const urls: string[] = [];

    for (const file of toUpload) {
      try {
        const url = await uploadImageToBlob(file, "REGULAR_POST");
        urls.push(url);
      } catch (e: any) {
        setPostError(e.message || "Upload failed");
      }
    }

    setNewPostImages((prev) => [...prev, ...urls].slice(0, 1));
    setNewPostUploading(false);
  };

  const submitNotice = async ({ content, images, targetAudience }: { content: string; images: string[]; targetAudience: AudienceSpec | null }) => {
    const res = await fetch("/api/community/posts", {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        images,
        postType: "NOTICE",
        ...(targetAudience ? { targetAudience } : {}),
      }),
    });
    const d = await readApiJsonSafe(res);
    if (!res.ok) throw new Error(d.error || "Failed to publish notice");
    setPosts((prev) => [d.post, ...prev]);
  };

  const submitAd = async ({ content, images }: { content: string; images: string[] }) => {
    const res = await fetch("/api/community/posts", {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, images, postType: "SPONSORED_AD" }),
    });
    const d = await readApiJsonSafe(res);
    if (!res.ok) throw new Error(d.error || "Failed to publish sponsored ad");
    setPosts((prev) => [d.post, ...prev]);
  };

  const deletePost = async (postId: string) => {
    try {
      const res = await fetch(`/api/community/posts/${postId}`, { method: "DELETE" });
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
      }
    } catch {}
  };

  const editPost = async (postId: string, content: string) => {
    try {
      const res = await fetch(`/api/community/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const d = await readApiJsonSafe(res);
        setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, content: d.post.content } : p)));
      }
    } catch {}
  };

  const editSpecialPost = async (postId: string, updates: { content: string; images?: string[]; targetAudience?: string | null }) => {
    const res = await fetch(`/api/community/posts/${postId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const d = await readApiJsonSafe(res);
    if (!res.ok) throw new Error(d.error || "Failed to save");
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, ...updates } : p)));
  };

  const sharePost = async (content: string, sharedPostId: string) => {
    const res = await fetch("/api/community/posts", {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, sharedPostId }),
    });
    if (res.ok) {
      const d = await readApiJsonSafe(res);
      setPosts((prev) => [d.post, ...prev]);
    }
  };

  const reactPost = async (postId: string, currentReacted: boolean) => {
    // Optimistic update
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              userReacted: !currentReacted,
              reactionCount: currentReacted ? p.reactionCount - 1 : p.reactionCount + 1,
            }
          : p
      )
    );
    try {
      const res = await fetch(`/api/community/posts/${postId}/react`, { method: "POST" });
      if (res.ok) {
        const d = await readApiJsonSafe(res);
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, userReacted: d.reacted, reactionCount: d.reactionCount }
              : p
          )
        );
      } else {
        // Revert on failure
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, userReacted: currentReacted, reactionCount: p.reactionCount + (currentReacted ? 1 : -1) }
              : p
          )
        );
      }
    } catch {}
  };

  const userRole = (user as any)?.role || (session as any)?.user?.role || "VOLUNTEER";
  const userName = (user as any)?.fullName || (session as any)?.user?.name || "User";
  const userEmailVal = (user as any)?.email || (session as any)?.user?.email || "";
  const userIdVal = (user as any)?.id || (session as any)?.user?.id || "";
  const userStatusVal = (user as any)?.status || (session as any)?.user?.status || null;

  // Gate: only OFFICIAL members and staff can access Community
  if (session?.user && !isOfficialOrStaff) {
    return (
      <DashboardLayout
        userRole={userRole}
        userName={userName}
        userEmail={userEmailVal}
        userId={userIdVal}
        initialUserStatus={userStatusVal}
      >
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Official Members Only</h2>
          <p className="text-slate-500 max-w-sm">The Community is available exclusively to official ASAD members. Complete your membership to join the conversation.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <>
    <DashboardLayout
      userRole={userRole}
      userName={userName}
      userEmail={userEmailVal}
      userId={userIdVal}
      initialUserStatus={userStatusVal}
    >
      <div className="min-h-[calc(100vh-140px)] bg-slate-50/30 py-3 px-3 sm:py-6 sm:px-4">
        <div className="max-w-5xl mx-auto flex gap-0 lg:gap-6 items-start">
          <div className="flex-1 min-w-0 pb-20 lg:pb-0">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800">Community</h1>
              <p className="text-slate-500 text-xs sm:text-sm">Share updates with your fellow volunteers</p>
            </div>
            <div className="flex items-center gap-2" ref={searchRef}>
              {/* Expandable search */}
              <div className="relative flex items-center">
                {searchOpen ? (
                  <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1.5 shadow-sm w-52 sm:w-64 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 flex-shrink-0"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      placeholder="Search members or posts…"
                      className="flex-1 text-sm bg-transparent outline-none text-slate-700 placeholder-slate-400 min-w-0"
                    />
                    {searchLoading && (
                      <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-[#0b2545] rounded-full animate-spin flex-shrink-0" />
                    )}
                    {searchQuery && !searchLoading && (
                      <button onClick={() => { setSearchQuery(""); setSearchResults(null); }} className="text-slate-400 hover:text-slate-600 flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => { setSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 50); }}
                    className="p-2 rounded-full bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-[#0b2545] transition-colors shadow-sm"
                    title="Search"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  </button>
                )}

                {/* Search Results Dropdown */}
                {searchOpen && searchResults && (
                  <div className="absolute top-full left-1/2 -translate-x-1/4 sm:left-auto sm:right-0 sm:translate-x-0 mt-1.5 w-[min(calc(100vw-32px),24rem)] sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-lg z-50 overflow-hidden max-h-[420px] overflow-y-auto">
                    {searchResults.users.length === 0 && searchResults.posts.length === 0 ? (
                      <p className="px-4 py-6 text-center text-sm text-slate-400">No results found</p>
                    ) : (
                      <>
                        {searchResults.users.length > 0 && (
                          <div>
                            <p className="px-4 pt-3 pb-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Members</p>
                            {searchResults.users.map((u: any) => (
                              <button
                                key={u.id}
                                onClick={() => {
                                  router.push(`/dashboard/community/profile/${u.id}`);
                                  closeSearchDropdown();
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left"
                              >
                                <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0 overflow-hidden">
                                  {u.profilePicUrl ? (
                                    <Image src={u.profilePicUrl} alt={u.fullName || ""} width={32} height={32} className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-500">
                                      {(u.fullName || "?")[0].toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-slate-800 truncate">{u.fullName}</p>
                                  {u.volunteerId && <p className="text-xs text-slate-400">{u.volunteerId}</p>}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                        {searchResults.posts.length > 0 && (
                          <div className={searchResults.users.length > 0 ? "border-t border-slate-100" : ""}>
                            <p className="px-4 pt-3 pb-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Posts</p>
                            {searchResults.posts.map((p: any) => (
                              <button
                                key={p.id}
                                onClick={() => {
                                  goToExactPostFromSearch(p.id);
                                }}
                                className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left"
                              >
                                <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0 overflow-hidden mt-0.5">
                                  {p.author?.profilePicUrl ? (
                                    <Image src={p.author.profilePicUrl} alt={p.author.fullName || ""} width={32} height={32} className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-500">
                                      {(p.author?.fullName || "?")[0].toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-medium text-slate-500 mb-0.5">{p.author?.fullName}</p>
                                  <p className="text-sm text-slate-700 line-clamp-2">{p.content}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={() => setView("feed")}
                className={`px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all ${
                  view === "feed"
                    ? "bg-[#0b2545] text-white shadow-sm"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Community
              </button>
              <button
                onClick={() => setView("timeline")}
                className={`px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all ${
                  view === "timeline"
                    ? "bg-[#0b2545] text-white shadow-sm"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Timeline
              </button>
            </div>

            {/* Hashtag Filter Indicator */}
            {hashtagFilter && (
              <div className="mt-3 sm:mt-0 sm:ml-auto flex items-center gap-2 px-4 py-2 bg-[#1E3A5F]/10 border border-[#1E3A5F]/20 rounded-xl">
                <span className="text-sm font-semibold text-[#1E3A5F]">
                  #{hashtagFilter}
                </span>
                <button
                  onClick={() => {
                    const url = new URL(window.location.href);
                    url.searchParams.delete("hashtag");
                    router.replace(url.pathname + (url.search || ""));
                  }}
                  className="text-[#1E3A5F] hover:text-[#0b2545] transition-colors"
                  title="Clear hashtag filter"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            )}
          </div>

          <StoriesRail userRole={_commRole} />

          {/* Create Post Box */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 mb-5">
            <div className="flex gap-3 items-start">
              <div className="flex-shrink-0 mt-0.5">
                <Avatar
                  user={{
                    id: userIdVal,
                    fullName: userName,
                    volunteerId: (user as any)?.volunteerId || null,
                    profilePicUrl: (user as any)?.profilePicUrl || null,
                    role: userRole,
                    status: "OFFICIAL",
                  }}
                  size={36}
                />
              </div>
              <div className="flex-1">
                <MentionTextarea
                  value={newPostContent}
                  onChange={setNewPostContent}
                  placeholder="What's on your mind?"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:bg-white transition-all"
                  rows={3}
                  maxLength={2000}
                />
                <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
                  <span className={`text-xs ${newPostContent.length > 1800 ? "text-amber-600" : "text-slate-400"}`}>
                    {newPostContent.length}/2000
                  </span>
                  <div className="flex items-center gap-2 flex-wrap ml-auto">
                    {canManagePostImageToggle && (
                      <button
                        type="button"
                        onClick={() => updateOfficialPostImageToggle(!officialPostImageEnabled)}
                        disabled={postImageToggleLoading || postImageToggleSaving}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-md border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${officialPostImageEnabled ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"}`}
                      >
                        <span className={`w-6 h-3.5 rounded-full transition-colors ${officialPostImageEnabled ? "bg-emerald-500" : "bg-slate-300"} relative`}>
                          <span className={`absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full transition-transform ${officialPostImageEnabled ? "translate-x-3" : "translate-x-0.5"}`} />
                        </span>
                        {postImageToggleSaving ? "Saving…" : "Allow Image"}
                      </button>
                    )}
                    {canCreateNotice && (
                      <button
                        onClick={() => setNoticeModalOpen(true)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold rounded-md hover:bg-amber-100 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                        Post Notice
                      </button>
                    )}
                    {canCreateAd && (
                      <button
                        onClick={() => setAdModalOpen(true)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-semibold rounded-md hover:bg-blue-100 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
                        Post AD
                      </button>
                    )}
                    {officialPostImageEnabled && (
                      <button
                        type="button"
                        onClick={() => regularPostImageInputRef.current?.click()}
                        disabled={newPostUploading || newPostImages.length >= 1}
                        title="Upload image"
                        className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-[#0b2545] hover:border-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        {newPostUploading ? (
                          <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        )}
                      </button>
                    )}
                    <button
                      onClick={submitPost}
                      disabled={postSubmitting || !newPostContent.trim()}
                      className="px-3 py-1.5 bg-[#0b2545] text-white text-xs font-semibold rounded-lg hover:bg-[#0d2d5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                      {postSubmitting ? "Posting…" : "Post"}
                    </button>
                    
                  </div>
                </div>
                {postError && (
                  <p className="mt-2 text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">{postError}</p>
                )}

                {officialPostImageEnabled && (
                  <div className="mt-2 flex items-center gap-2 justify-end">
                    {newPostImages[0] && (
                      <div className="relative w-8 h-8 rounded-md overflow-hidden border border-slate-200 group">
                        <Image src={newPostImages[0]} alt="" fill className="object-cover" sizes="32px" />
                        <button
                          type="button"
                          onClick={() => setNewPostImages([])}
                          className="absolute top-0 right-0 w-4 h-4 bg-black/60 text-white text-[10px] leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <input
                  ref={regularPostImageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) void handleRegularPostImages(e.target.files);
                    e.currentTarget.value = "";
                  }}
                />
              </div>
            </div>
          </div>

          {/* Feed */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 animate-pulse">
                  <div className="flex gap-3">
                    <div className="w-11 h-11 rounded-full bg-slate-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-200 rounded w-1/3" />
                      <div className="h-3 bg-slate-100 rounded w-1/4" />
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <div className="h-3 bg-slate-100 rounded" />
                    <div className="h-3 bg-slate-100 rounded w-4/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
              <div className="w-16 h-16 bg-[#1E3A5F]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1E3A5F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-700">
                {view === "timeline" ? "You haven't posted yet" : "No posts yet"}
              </h3>
              <p className="text-slate-500 text-sm mt-1">
                {view === "timeline"
                  ? "Share something with the community!"
                  : "Be the first to share something!"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={currentUserId}
                  currentUserRole={_commRole}
                  onDelete={deletePost}
                  onEdit={editPost}
                  onEditSpecial={(p) => setEditingSpecialPost(p)}
                  onReact={reactPost}
                  onShareAsPost={sharePost}
                />
              ))}
            </div>
          )}

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="h-8 mt-4" />

          {loadingMore && (
            <div className="flex justify-center py-4">
              <div className="w-6 h-6 border-2 border-[#1E3A5F] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!hasMore && posts.length > 0 && (
            <p className="text-center text-xs text-slate-400 py-4">You've seen all posts</p>
          )}
          </div>
          {/* Leaderboard — sidebar on desktop, floating button on mobile */}
          <CommunityLeaderboard 
            onMobileOpenChange={(setter) => setLeaderboardMobileOpenSetter(() => setter)}
          />
        </div>

        {/* Floating Leaderboard Button for APK - positioned higher for better visibility */}
        {typeof window !== 'undefined' && Capacitor.isNativePlatform() && (
          <>
            {createPortal(
              <button
                onClick={() => leaderboardMobileOpenSetter?.(true)}
                style={{
                  position: 'fixed',
                  bottom: '80px',
                  right: '16px',
                  zIndex: 9998,
                  width: '56px',
                  height: '56px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#f59e0b',
                  color: '#fff',
                  borderRadius: '50%',
                  border: 'none',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                aria-label="View leaderboard"
              >
                <Trophy size={24} />
              </button>,
              document.body
            )}
          </>
        )}
        
        {/* Native Leaderboard Modal - Now handled by CommunityLeaderboard component */}
      </div>
    </DashboardLayout>

    {/* Notice & AD Modals */}
    <NoticeModal
      isOpen={noticeModalOpen}
      onClose={() => setNoticeModalOpen(false)}
      onSubmit={submitNotice}
      services={servicesList}
      sectors={sectorsList}
      clubs={clubsList}
    />
    <SponsoredAdModal
      isOpen={adModalOpen}
      onClose={() => setAdModalOpen(false)}
      onSubmit={submitAd}
    />
    <EditPostModal
      post={editingSpecialPost}
      onClose={() => setEditingSpecialPost(null)}
      onSave={editSpecialPost}
      services={servicesList}
      sectors={sectorsList}
      clubs={clubsList}
    />
    </>
  );
}
