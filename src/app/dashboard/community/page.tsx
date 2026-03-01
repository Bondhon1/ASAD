"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useCachedUserProfile } from "@/hooks/useCachedUserProfile";
import { MentionTextarea } from "@/components/community/MentionTextarea";
import {
  Avatar,
  PostCard,
  type Post,
  type Author,
} from "@/components/community/PostCard";

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CommunityPage() {
  const { data: session } = useSession();
  const userEmail = session?.user?.email || "";
  const { user } = useCachedUserProfile<any>(userEmail);
  const searchParams = useSearchParams();
  const router = useRouter();
  const highlightPostId = searchParams.get("post");

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const [newPostContent, setNewPostContent] = useState("");
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  const [view, setView] = useState<"feed" | "timeline">("feed");

  const currentUserId = (user as any)?.id || (session as any)?.user?.id || "";

  const loadPosts = useCallback(
    async (cursor?: string, replace = false) => {
      if (!cursor) setLoading(true);
      else setLoadingMore(true);

      try {
        const params = new URLSearchParams({ limit: "10" });
        if (cursor) params.set("cursor", cursor);
        if (view === "timeline" && currentUserId) params.set("authorId", currentUserId);

        const res = await fetch(`/api/community/posts?${params}`);
        if (!res.ok) return;
        const d = await res.json();
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
    [view, currentUserId]
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
    const el = document.getElementById(`post-${highlightPostId}`);
    if (el) {
      setTimeout(() => {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-[#1E3A5F]", "ring-offset-2");
        setTimeout(() => el.classList.remove("ring-2", "ring-[#1E3A5F]", "ring-offset-2"), 2500);
        // Clean URL
        const url = new URL(window.location.href);
        url.searchParams.delete("post");
        router.replace(url.pathname + (url.search || ""), { scroll: false });
      }, 400);
    }
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newPostContent.trim() }),
      });
      const d = await res.json();
      if (!res.ok) {
        setPostError(d.error || "Failed to post");
        return;
      }
      setPosts((prev) => [d.post, ...prev]);
      setNewPostContent("");
    } catch {
      setPostError("Failed to post. Please try again.");
    } finally {
      setPostSubmitting(false);
    }
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
        const d = await res.json();
        setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, content: d.post.content } : p)));
      }
    } catch {}
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
        const d = await res.json();
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

  return (
    <DashboardLayout
      userRole={userRole}
      userName={userName}
      userEmail={userEmailVal}
      userId={userIdVal}
      initialUserStatus={userStatusVal}
    >
      <div className="min-h-[calc(100vh-140px)] bg-slate-50/30 py-6 px-3 sm:px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Community</h1>
              <p className="text-slate-500 text-sm">Share updates with your fellow volunteers</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setView("feed")}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  view === "feed"
                    ? "bg-[#0b2545] text-white shadow-sm"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Community
              </button>
              <button
                onClick={() => setView("timeline")}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  view === "timeline"
                    ? "bg-[#0b2545] text-white shadow-sm"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Timeline
              </button>
            </div>
          </div>

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
                  <button
                    onClick={submitPost}
                    disabled={postSubmitting || !newPostContent.trim()}
                    className="px-5 py-2 bg-[#0b2545] text-white text-sm font-semibold rounded-xl hover:bg-[#0d2d5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    {postSubmitting ? "Posting…" : "Post"}
                  </button>
                </div>
                {postError && (
                  <p className="mt-2 text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">{postError}</p>
                )}
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
                  onDelete={deletePost}
                  onEdit={editPost}
                  onReact={reactPost}
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
      </div>
    </DashboardLayout>
  );
}
