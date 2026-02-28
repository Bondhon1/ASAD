"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useCachedUserProfile } from "@/hooks/useCachedUserProfile";
import { PostCard, type Post } from "@/components/community/PostCard";
import { ChatWithButton } from "@/components/chat/ChatWithButton";

interface UserProfile {
  id: string;
  fullName: string | null;
  volunteerId: string | null;
  profilePicUrl: string | null;
  role: string;
  status: string;
  createdAt: string;
  isFollowing: boolean;
  isMe: boolean;
  volunteerProfile: {
    bio: string | null;
    points: number;
    joinDate: string;
    rank: { name: string } | null;
    service: { name: string } | null;
  } | null;
  _count: {
    posts: number;
    followers: number;
    following: number;
  };
}

function StatBadge({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="text-center">
      <div className="text-xl font-bold text-slate-800">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

export default function UserProfilePage() {
  const params = useParams();
  const profileId = params?.id as string;
  const { data: session } = useSession();
  const router = useRouter();

  const userEmail = session?.user?.email || "";
  const { user } = useCachedUserProfile<any>(userEmail);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);

  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Load profile
  useEffect(() => {
    if (!profileId) return;
    (async () => {
      setProfileLoading(true);
      try {
        const res = await fetch(`/api/community/users/${profileId}`);
        if (!res.ok) { router.replace("/dashboard/community"); return; }
        const d = await res.json();
        setProfile(d.profile);
      } catch {}
      setProfileLoading(false);
    })();
  }, [profileId, router]);

  // Load posts
  const loadPosts = useCallback(
    async (cursor?: string) => {
      if (!profileId) return;
      if (cursor) setLoadingMore(true);
      else setPostsLoading(true);

      try {
        const params = new URLSearchParams({ limit: "10", authorId: profileId });
        if (cursor) params.set("cursor", cursor);
        const res = await fetch(`/api/community/posts?${params}`);
        if (res.ok) {
          const d = await res.json();
          if (cursor) {
            setPosts((prev) => {
              const ids = new Set(prev.map((p) => p.id));
              return [...prev, ...(d.posts || []).filter((p: Post) => !ids.has(p.id))];
            });
          } else {
            setPosts(d.posts || []);
          }
          setNextCursor(d.nextCursor || null);
          setHasMore(!!d.nextCursor);
        }
      } catch {}

      setPostsLoading(false);
      setLoadingMore(false);
    },
    [profileId]
  );

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const toggleFollow = async () => {
    if (!profile || followLoading) return;
    setFollowLoading(true);
    try {
      const res = await fetch(`/api/community/follow/${profile.id}`, { method: "POST" });
      if (res.ok) {
        const d = await res.json();
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                isFollowing: d.isFollowing,
                _count: { ...prev._count, followers: d.followerCount },
              }
            : prev
        );
      }
    } catch {}
    setFollowLoading(false);
  };

  const deletePost = async (postId: string) => {
    try {
      const res = await fetch(`/api/community/posts/${postId}`, { method: "DELETE" });
      if (res.ok) setPosts((prev) => prev.filter((p) => p.id !== postId));
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
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, content: d.post.content } : p))
        );
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
      }
    } catch {
      // revert on failure
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                userReacted: currentReacted,
                reactionCount: currentReacted ? p.reactionCount + 1 : p.reactionCount - 1,
              }
            : p
        )
      );
    }
  };

  const currentUserRole = (user as any)?.role || (session as any)?.user?.role || "VOLUNTEER";
  const currentUserName = (user as any)?.fullName || (session as any)?.user?.name || "User";
  const currentUserEmail = (user as any)?.email || (session as any)?.user?.email || "";
  const currentUserId = (user as any)?.id || (session as any)?.user?.id || "";
  const currentUserStatus = (user as any)?.status ?? undefined;

  if (profileLoading) {
    return (
      <DashboardLayout userRole={currentUserRole} userName={currentUserName} userEmail={currentUserEmail} userId={currentUserId} initialUserStatus={currentUserStatus}>
        <div className="min-h-[calc(100vh-140px)] py-10 px-4">
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 animate-pulse">
              <div className="flex gap-4 items-start">
                <div className="w-20 h-20 rounded-full bg-slate-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-slate-200 rounded w-1/3" />
                  <div className="h-4 bg-slate-100 rounded w-1/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) return null;

  const joinDate = profile.volunteerProfile?.joinDate
    ? new Date(profile.volunteerProfile.joinDate).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;

  return (
    <DashboardLayout userRole={currentUserRole} userName={currentUserName} userEmail={currentUserEmail} userId={currentUserId} initialUserStatus={currentUserStatus}>
      <div className="min-h-[calc(100vh-140px)] bg-slate-50/30 py-6 px-3 sm:px-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Back */}
          <Link
            href="/dashboard/community"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Back to Community
          </Link>

          {/* Profile Card */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {/* Banner */}
            <div className="h-24 bg-gradient-to-r from-[#1E3A5F] to-[#0b2545]" />

            <div className="px-5 pb-5">
              <div className="flex items-end justify-between -mt-10 mb-3 flex-wrap gap-3">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {profile.profilePicUrl ? (
                    <Image
                      src={profile.profilePicUrl}
                      alt={profile.fullName || "User"}
                      width={80}
                      height={80}
                      className="rounded-full object-cover border-4 border-white shadow-md"
                      style={{ width: 80, height: 80 }}
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-[#1E3A5F] text-white flex items-center justify-center text-3xl font-bold border-4 border-white shadow-md">
                      {(profile.fullName || "U").charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Follow button */}
                {!profile.isMe && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={toggleFollow}
                      disabled={followLoading}
                      className={`px-5 py-2 text-sm font-semibold rounded-full transition-all disabled:opacity-60 shadow-sm ${
                        profile.isFollowing
                          ? "bg-white border border-slate-200 text-slate-700 hover:border-red-300 hover:text-red-600"
                          : "bg-[#1E3A5F] text-white hover:bg-[#0d2d5a]"
                      }`}
                    >
                      {followLoading ? "…" : profile.isFollowing ? "Following" : "Follow"}
                    </button>
                    {profile.status === "OFFICIAL" && (
                      <ChatWithButton
                        targetUserId={profile.id}
                        targetUser={{
                          id: profile.id,
                          fullName: profile.fullName,
                          volunteerId: profile.volunteerId,
                          profilePicUrl: profile.profilePicUrl,
                          role: profile.role,
                          status: profile.status,
                        }}
                        label="Chat"
                        variant="secondary"
                      />
                    )}
                  </div>
                )}
                {profile.isMe && (
                  <Link
                    href="/dashboard/settings"
                    className="px-5 py-2 text-sm font-semibold rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
                  >
                    Edit Profile
                  </Link>
                )}
              </div>

              {/* Name & details */}
              <h1 className="text-xl font-bold text-slate-800">{profile.fullName || "Volunteer"}</h1>
              {profile.volunteerId && (
                <p className="text-sm text-slate-400 font-mono">#{profile.volunteerId}</p>
              )}
              {profile.volunteerProfile?.bio && (
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">{profile.volunteerProfile.bio}</p>
              )}

              {/* Meta */}
              <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-500">
                {profile.volunteerProfile?.rank && (
                  <span className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-1 rounded-full border border-amber-100 font-medium">
                    🏅 {profile.volunteerProfile.rank.name}
                  </span>
                )}
                {profile.volunteerProfile?.service && (
                  <span className="flex items-center gap-1 bg-[#1E3A5F]/10 text-[#1E3A5F] px-2 py-1 rounded-full border border-[#1E3A5F]/20 font-medium">
                    🌿 {profile.volunteerProfile.service.name}
                  </span>
                )}
                {joinDate && (
                  <span className="flex items-center gap-1 text-slate-400">
                    📅 Joined {joinDate}
                  </span>
                )}
                {profile.volunteerProfile?.points !== undefined && (
                  <span className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded-full border border-green-100 font-medium">
                    ⭐ {profile.volunteerProfile.points} pts
                  </span>
                )}
              </div>

              {/* Stats */}
              <div className="flex gap-6 mt-4 pt-4 border-t border-slate-100">
                <StatBadge label="Posts" value={profile._count.posts} />
                <StatBadge label="Followers" value={profile._count.followers} />
                <StatBadge label="Following" value={profile._count.following} />
              </div>
            </div>
          </div>

          {/* Posts */}
          <h2 className="text-lg font-bold text-slate-700 px-1">
            {profile.isMe ? "Your Posts" : `Posts by ${profile.fullName || "this volunteer"}`}
          </h2>

          {postsLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 animate-pulse">
                  <div className="h-4 bg-slate-200 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-slate-100 rounded mb-1" />
                  <div className="h-3 bg-slate-100 rounded w-4/5" />
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-sm">
              <p className="text-slate-500 text-sm">No posts yet.</p>
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

              {loadingMore && (
                <div className="flex justify-center py-4">
                  <div className="w-5 h-5 border-2 border-[#1E3A5F] border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {hasMore && !loadingMore && (
                <button
                  onClick={() => nextCursor && loadPosts(nextCursor)}
                  className="w-full py-3 text-sm text-slate-500 hover:text-[#1E3A5F] bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Load more posts
                </button>
              )}

              {!hasMore && posts.length > 0 && (
                <p className="text-center text-xs text-slate-400 py-2">All posts loaded</p>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
