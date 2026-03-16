"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { MentionTextarea, renderMentionContent } from "./MentionTextarea";
import UserMonthlyExemptBadge from "@/components/dashboard/UserMonthlyExemptBadge";
import UserMonthlyOverdueIndicator from "@/components/dashboard/UserMonthlyOverdueIndicator";
import { PostMenu } from "./PostMenu";
import { ReportPostModal } from "./ReportPostModal";
import PostShareModal from "./PostShareModal";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface Author {
  id: string;
  fullName: string | null;
  volunteerId: string | null;
  profilePicUrl: string | null;
  role: string;
  status: string;
  monthlyPaymentExempt?: boolean | null;
  monthlyPaymentExemptReason?: string | null;
  overdueMonthsCount?: number;
}

export interface Reply {
  id: string;
  authorId: string;
  author: Author;
  content: string;
  createdAt: string;
  updatedAt: string;
  reactionCount: number;
  userReacted: boolean;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  author: Author;
  content: string;
  createdAt: string;
  updatedAt: string;
  reactionCount: number;
  userReacted: boolean;
  replies: Reply[];
}

export interface SharedPost {
  id: string;
  authorId: string;
  author: Author;
  content: string;
  images?: string[];
  createdAt: string;
  isDeleted?: boolean;
}

export interface Post {
  id: string;
  authorId: string;
  author: Author;
  content: string;
  postType?: string;
  images?: string[];
  priority?: number;
  targetAudience?: string | null;
  createdAt: string;
  updatedAt: string;
  reactionCount: number;
  userReacted: boolean;
  commentCount: number;
  shareCount?: number;
  sharedPostId?: string | null;
  sharedPost?: SharedPost | null;
}

// ─── Image Gallery ─────────────────────────────────────────────────────────────

function PostImageGallery({ images }: { images: string[] }) {
  const [lightbox, setLightbox] = useState<number | null>(null);

  if (!images || images.length === 0) return null;

  const count = images.length;
  const gridClass =
    count === 1
      ? "grid-cols-1"
      : count === 2
      ? "grid-cols-2"
      : count >= 3
      ? "grid-cols-2"
      : "grid-cols-2";

  return (
    <>
      <div className={`grid ${gridClass} gap-1.5 mt-3 rounded-xl overflow-hidden`}>
        {images.slice(0, 5).map((url, i) => (
          <div
            key={i}
            className={`relative overflow-hidden cursor-pointer group bg-slate-100 ${
              count === 3 && i === 0 ? "row-span-2" : ""
            } ${count === 1 ? "w-full" : "h-40"}`}
            onClick={() => setLightbox(i)}
          >
            <Image
              src={url}
              alt={`Post image ${i + 1}`}
              width={count === 1 ? 800 : 0}
              height={count === 1 ? 600 : 0}
              {...(count === 1 ? {} : { fill: true })}
              className={count === 1 ? "w-full h-auto" : "object-cover group-hover:scale-105 transition-transform duration-200"}
              sizes={count === 1 ? "100vw" : "(max-width: 640px) 50vw, 300px"}
            />
            {i === 4 && count > 5 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-white text-2xl font-bold">+{count - 5}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white text-3xl font-light leading-none"
            onClick={() => setLightbox(null)}
          >
            ×
          </button>
          {lightbox > 0 && (
            <button
              className="absolute left-4 text-white/80 hover:text-white text-4xl font-light"
              onClick={(e) => { e.stopPropagation(); setLightbox((l) => (l !== null && l > 0 ? l - 1 : l)); }}
            >
              ‹
            </button>
          )}
          {lightbox < images.length - 1 && (
            <button
              className="absolute right-4 text-white/80 hover:text-white text-4xl font-light"
              onClick={(e) => { e.stopPropagation(); setLightbox((l) => (l !== null && l < images.length - 1 ? l + 1 : l)); }}
            >
              ›
            </button>
          )}
          <div className="relative max-w-4xl max-h-[85vh] w-full h-full mx-8" onClick={(e) => e.stopPropagation()}>
            <Image
              src={images[lightbox]}
              alt={`Image ${lightbox + 1}`}
              fill
              className="object-contain"
              sizes="90vw"
            />
          </div>
          <span className="absolute bottom-4 text-white/60 text-sm">{lightbox + 1} / {images.length}</span>
        </div>
      )}
    </>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

export function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Avatar ────────────────────────────────────────────────────────────────────

export function Avatar({ user, size = 40 }: { user: Author; size?: number }) {
  if (user.profilePicUrl) {
    return (
      <Image
        src={user.profilePicUrl}
        alt={user.fullName || "User"}
        width={size}
        height={size}
        className="rounded-full object-cover border border-slate-200"
        style={{ width: size, height: size }}
      />
    );
  }
  const initials = (user.fullName || "U").charAt(0).toUpperCase();
  return (
    <div
      className="rounded-full bg-[#1E3A5F] text-white flex items-center justify-center font-semibold flex-shrink-0 text-sm border border-[#0b2545]"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials}
    </div>
  );
}

// ─── Shared Post Embed ────────────────────────────────────────────────────────

function SharedPostEmbed({ sharedPost }: { sharedPost: SharedPost }) {
  const contentPreview = sharedPost.content.length > 300
    ? sharedPost.content.slice(0, 300) + "…"
    : sharedPost.content;

  if (sharedPost.isDeleted) {
    return (
      <div className="mt-3 border border-slate-200 rounded-xl p-3 bg-slate-50 text-sm text-slate-400 italic">
        This post has been deleted.
      </div>
    );
  }

  return (
    <div className="mt-3 border border-slate-200 rounded-xl overflow-hidden bg-slate-50 hover:bg-slate-100 transition-colors">
      {/* Original post author */}
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-1">
        <div className="flex-shrink-0">
          {sharedPost.author.profilePicUrl ? (
            <Image
              src={sharedPost.author.profilePicUrl}
              alt={sharedPost.author.fullName || "User"}
              width={24}
              height={24}
              className="rounded-full object-cover border border-slate-200"
              style={{ width: 24, height: 24 }}
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-[#1E3A5F] text-white flex items-center justify-center text-[10px] font-bold">
              {(sharedPost.author.fullName || "U").charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <Link
          href={`/dashboard/community/profile/${sharedPost.author.id}`}
          className="text-xs font-semibold text-slate-700 hover:text-[#1E3A5F] truncate"
          onClick={(e) => e.stopPropagation()}
        >
          {sharedPost.author.fullName || "Volunteer"}
        </Link>
        <span className="text-[10px] text-slate-400 ml-auto flex-shrink-0">{timeAgo(sharedPost.createdAt)}</span>
      </div>

      {/* Original post content */}
      <div className="px-3 pb-2.5">
        <p className="text-sm text-slate-700 whitespace-pre-wrap break-words leading-relaxed">
          {contentPreview}
        </p>
        {/* Original post images (show first only) */}
        {sharedPost.images && sharedPost.images.length > 0 && (
          <div className="mt-2 relative h-36 rounded-lg overflow-hidden">
            <Image
              src={sharedPost.images[0]}
              alt="Post image"
              fill
              className="object-cover"
              sizes="(max-width: 640px) 90vw, 400px"
            />
            {sharedPost.images.length > 1 && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <span className="text-white text-sm font-semibold">+{sharedPost.images.length - 1} more</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Reaction Count with Tooltip ──────────────────────────────────────────────

interface ReactorUser {
  id: string;
  fullName: string | null;
  profilePicUrl: string | null;
  volunteerId: string | null;
}

function ReactionCount({
  count,
  postId,
  commentId,
}: {
  count: number;
  postId?: string;
  commentId?: string;
}) {
  const [visible, setVisible] = useState(false);
  const [reactors, setReactors] = useState<ReactorUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchReactors = useCallback(async () => {
    if (fetched) return;
    setLoading(true);
    try {
      const url = postId
        ? `/api/community/posts/${postId}/react`
        : `/api/community/comments/${commentId}/react`;
      const res = await fetch(url);
      if (res.ok) {
        const d = await res.json();
        setReactors(d.reactions || []);
        setFetched(true);
      }
    } catch {}
    setLoading(false);
  }, [postId, commentId, fetched]);

  const show = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setVisible(true);
    fetchReactors();
  }, [fetchReactors]);

  const hide = useCallback(() => {
    hideTimer.current = setTimeout(() => setVisible(false), 200);
  }, []);

  // Mobile long-press
  const onTouchStart = useCallback(() => {
    longPressTimer.current = setTimeout(() => {
      show();
    }, 400);
  }, [show]);

  const onTouchEnd = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  // Close on outside tap (mobile)
  useEffect(() => {
    if (!visible) return;
    const handler = () => setVisible(false);
    document.addEventListener("touchstart", handler, { passive: true });
    return () => document.removeEventListener("touchstart", handler);
  }, [visible]);

  if (count <= 0) return null;

  return (
    <span
      className="relative cursor-default select-none"
      onMouseEnter={show}
      onMouseLeave={hide}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <span className="underline decoration-dotted underline-offset-2">{count}</span>

      {visible && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 bg-white border border-slate-200 rounded-xl shadow-lg p-2 min-w-[160px] max-w-[220px]"
          onMouseEnter={show}
          onMouseLeave={hide}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-1 mb-1">
            ❤️ Loved by
          </p>
          {loading ? (
            <div className="flex justify-center py-2">
              <div className="w-4 h-4 border-2 border-rose-300 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : reactors.length === 0 ? (
            <p className="text-xs text-slate-400 px-1">No reactions yet</p>
          ) : (
            <ul className="max-h-40 overflow-y-auto space-y-1">
              {reactors.map((u) => (
                <li key={u.id}>
                  <Link
                    href={`/dashboard/community/profile/${u.id}`}
                    className="flex items-center gap-2 px-1 py-0.5 rounded-lg hover:bg-rose-50 transition-colors"
                    onClick={() => setVisible(false)}
                  >
                    {u.profilePicUrl ? (
                      <Image src={u.profilePicUrl} alt={u.fullName || "User"} width={22} height={22} className="rounded-full object-cover border border-slate-200" style={{ width: 22, height: 22 }} />
                    ) : (
                      <div className="w-[22px] h-[22px] rounded-full bg-[#1E3A5F] text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                        {(u.fullName || "U").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-xs text-slate-700 truncate">{u.fullName || "Volunteer"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </span>
  );
}

// ─── Heart Icon ────────────────────────────────────────────────────────────────

export function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

// ─── Comment Item ──────────────────────────────────────────────────────────────

export function CommentItem({
  comment,
  postAuthorId,
  currentUserId,
  onDelete,
  onEdit,
  onReact,
  onReply,
}: {
  comment: Comment | Reply;
  postAuthorId: string;
  currentUserId: string;
  onDelete: (id: string) => void;
  onEdit: (id: string, content: string) => void;
  onReact: (id: string, currentReacted: boolean) => void;
  onReply?: (commentId: string, content: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [replying, setReplying] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);

  const canDelete = comment.authorId === currentUserId || postAuthorId === currentUserId;
  const canEdit = comment.authorId === currentUserId;
  const isReply = !("replies" in comment);

  const saveEdit = async () => {
    if (!editContent.trim()) return;
    await onEdit(comment.id, editContent.trim());
    setEditing(false);
  };

  const submitReply = async () => {
    if (!replyContent.trim() || !onReply) return;
    setReplyLoading(true);
    await onReply(comment.id, replyContent.trim());
    setReplyContent("");
    setReplying(false);
    setReplyLoading(false);
  };

  return (
    <div className={`flex gap-2.5 ${isReply ? "ml-10 mt-2" : "mt-3"}`}>
      <Avatar user={comment.author} size={isReply ? 28 : 32} />
      <div className="flex-1 min-w-0">
        <div className="bg-slate-50 border border-slate-100 rounded-2xl px-3 py-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1">
              <Link
                href={`/dashboard/community/profile/${comment.author.id}`}
                className="font-semibold text-sm text-slate-800 hover:text-[#1E3A5F] transition-colors"
              >
                {comment.author.fullName || "Volunteer"}
              </Link>
              {comment.author.status === "OFFICIAL" && (
                comment.author.monthlyPaymentExempt
                  ? <UserMonthlyExemptBadge reason={comment.author.monthlyPaymentExemptReason} />
                  : <UserMonthlyOverdueIndicator userId={comment.author.id} overdueCount={comment.author.overdueMonthsCount ?? 0} />
              )}
            </div>
            {comment.author.volunteerId && (
              <span className="text-[10px] text-slate-400 font-mono">#{comment.author.volunteerId}</span>
            )}
          </div>
          {editing ? (
            <div className="mt-1">
              <MentionTextarea
                value={editContent}
                onChange={setEditContent}
                className="w-full text-sm p-2 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                rows={2}
                maxLength={1000}
              />
              <div className="flex gap-2 mt-1">
                <button
                  onClick={saveEdit}
                  className="px-3 py-1 bg-[#1E3A5F] text-white text-xs rounded-lg hover:bg-[#0d2d5a]"
                >
                  Save
                </button>
                <button
                  onClick={() => { setEditing(false); setEditContent(comment.content); }}
                  className="px-3 py-1 bg-white border border-slate-200 text-xs rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-700 mt-0.5 break-words">{renderMentionContent(comment.content)}</p>
          )}
        </div>

        <div className="flex items-center gap-3 mt-1 px-1 flex-wrap">
          <span className="text-[11px] text-slate-400">{timeAgo(comment.createdAt)}</span>
          <button
            onClick={() => onReact(comment.id, comment.userReacted)}
            className={`flex items-center gap-1 text-[11px] font-medium transition-colors ${
              comment.userReacted ? "text-rose-500" : "text-slate-400 hover:text-rose-500"
            }`}
          >
            <HeartIcon filled={comment.userReacted} />
            <ReactionCount count={comment.reactionCount} commentId={comment.id} />
          </button>
          {!isReply && onReply && (
            <button
              onClick={() => setReplying(!replying)}
              className="text-[11px] font-medium text-slate-400 hover:text-[#1E3A5F] transition-colors"
            >
              Reply
            </button>
          )}
          {canEdit && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="text-[11px] font-medium text-slate-400 hover:text-[#1E3A5F] transition-colors"
            >
              Edit
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => onDelete(comment.id)}
              className="text-[11px] font-medium text-slate-400 hover:text-red-500 transition-colors"
            >
              Delete
            </button>
          )}
        </div>

        {replying && (
          <div className="mt-2 flex gap-2 items-start">
            <div className="flex-1">
              <MentionTextarea
                value={replyContent}
                onChange={setReplyContent}
                placeholder="Write a reply…"
                className="w-full text-sm p-2 border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                rows={2}
                maxLength={1000}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitReply(); }
                }}
              />
            </div>
            <button
              onClick={submitReply}
              disabled={replyLoading || !replyContent.trim()}
              className="px-3 py-2 bg-[#1E3A5F] text-white text-xs rounded-xl disabled:opacity-50 hover:bg-[#0d2d5a] transition-colors"
            >
              {replyLoading ? "…" : "Send"}
            </button>
          </div>
        )}

        {"replies" in comment && comment.replies.length > 0 && (
          <div>
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                postAuthorId={postAuthorId}
                currentUserId={currentUserId}
                onDelete={onDelete}
                onEdit={onEdit}
                onReact={onReact}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Post Card ─────────────────────────────────────────────────────────────────

export function PostCard({
  post,
  currentUserId,
  currentUserRole = "VOLUNTEER",
  onDelete,
  onEdit,
  onEditSpecial,
  onReact,
  onShareAsPost,
}: {
  post: Post;
  currentUserId: string;
  currentUserRole?: string;
  onDelete: (id: string) => void;
  onEdit: (id: string, content: string) => Promise<void>;
  onEditSpecial?: (post: Post) => void;
  onReact: (id: string, currentReacted: boolean) => void;
  onShareAsPost?: (content: string, sharedPostId: string) => Promise<void>;
}) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  const loadComments = useCallback(async () => {
    setCommentsLoading(true);
    try {
      const res = await fetch(`/api/community/posts/${post.id}/comments`);
      if (res.ok) {
        const d = await res.json();
        setComments(d.comments || []);
      }
    } catch {}
    setCommentsLoading(false);
  }, [post.id]);

  const toggleComments = () => {
    if (!commentsOpen) {
      setCommentsOpen(true);
      loadComments();
    } else {
      setCommentsOpen(false);
    }
  };

  const submitComment = async () => {
    if (!newComment.trim() || commentSubmitting) return;
    setCommentSubmitting(true);
    try {
      const res = await fetch(`/api/community/posts/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment.trim() }),
      });
      if (res.ok) {
        const d = await res.json();
        setComments((prev) => [...prev, d.comment]);
        setNewComment("");
      }
    } catch {}
    setCommentSubmitting(false);
  };

  const deleteComment = async (commentId: string) => {
    try {
      const res = await fetch(`/api/community/comments/${commentId}`, { method: "DELETE" });
      if (res.ok) {
        setComments((prev) =>
          prev
            .filter((c) => c.id !== commentId)
            .map((c) => ({ ...c, replies: c.replies.filter((r) => r.id !== commentId) }))
        );
      }
    } catch {}
  };

  const editComment = async (commentId: string, content: string) => {
    try {
      const res = await fetch(`/api/community/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        setComments((prev) =>
          prev.map((c) => {
            if (c.id === commentId) return { ...c, content };
            return { ...c, replies: c.replies.map((r) => (r.id === commentId ? { ...r, content } : r)) };
          })
        );
      }
    } catch {}
  };

  const reactComment = async (commentId: string, _currentReacted: boolean) => {
    try {
      const res = await fetch(`/api/community/comments/${commentId}/react`, { method: "POST" });
      if (res.ok) {
        const d = await res.json();
        setComments((prev) =>
          prev.map((c) => {
            if (c.id === commentId)
              return { ...c, userReacted: d.reacted, reactionCount: d.reactionCount };
            return {
              ...c,
              replies: c.replies.map((r) =>
                r.id === commentId ? { ...r, userReacted: d.reacted, reactionCount: d.reactionCount } : r
              ),
            };
          })
        );
      }
    } catch {}
  };

  const replyToComment = async (parentId: string, content: string) => {
    try {
      const res = await fetch(`/api/community/comments/${parentId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const d = await res.json();
        setComments((prev) =>
          prev.map((c) => (c.id === parentId ? { ...c, replies: [...c.replies, d.reply] } : c))
        );
      }
    } catch {}
  };

  const saveEdit = async () => {
    if (!editContent.trim()) return;
    await onEdit(post.id, editContent.trim());
    setEditing(false);
  };

  const isAuthor = post.authorId === currentUserId;
  const isAdmin = ["MASTER", "ADMIN"].includes(currentUserRole);

  const handleReport = async (reason: string, description: string) => {
    setReportLoading(true);
    try {
      const res = await fetch(`/api/community/posts/${post.id}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          reason, 
          description: description || "Reported via community menu" 
        }),
      });
      if (res.ok) {
        setReportModalOpen(false);
        alert("Thank you for reporting. Our team will review this post.");
      } else {
        const error = await res.json();
        alert(error.error || "Failed to report post");
      }
    } catch (err) {
      alert("Error reporting post");
    }
    setReportLoading(false);
  };

  // Build menu options based on user role
  const menuOptions = [];

  if (isAuthor) {
    // Post owner: Edit and Delete
    const isSpecialPost = post.postType === "NOTICE" || post.postType === "SPONSORED_AD";
    menuOptions.push({
      label: "Edit",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      ),
      onClick: () => isSpecialPost && onEditSpecial ? onEditSpecial(post) : setEditing(!editing),
    });
    menuOptions.push({
      label: "Delete",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
      ),
      onClick: () => onDelete(post.id),
      className: "text-red-600 hover:text-red-700 hover:bg-red-50",
    });
  } else if (isAdmin) {
    // Admin: Delete only
    menuOptions.push({
      label: "Delete (Admin)",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
      ),
      onClick: () => onDelete(post.id),
      className: "text-red-600 hover:text-red-700 hover:bg-red-50",
    });
  } else {
    // Other users: Report
    menuOptions.push({
      label: "Report",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
      ),
      onClick: () => setReportModalOpen(true),
      className: "text-amber-600 hover:text-amber-700 hover:bg-amber-50",
    });
  }

  return (
    <div id={`post-${post.id}`} className={`bg-white border rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 ${
      post.postType === "NOTICE" ? "border-amber-300 ring-1 ring-amber-200" :
      post.postType === "SPONSORED_AD" ? "border-blue-300 ring-1 ring-blue-200" :
      "border-slate-200"
    }`}>
      {/* Special post type banner */}
      {post.postType === "NOTICE" && (
        <div className="flex items-center gap-2 px-4 pt-3 pb-1">
          <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-1 rounded-full border border-amber-200">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
            NOTICE
          </span>
        </div>
      )}
      {post.postType === "SPONSORED_AD" && (
        <div className="flex items-center gap-2 px-4 pt-3 pb-1">
          <span className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-1 rounded-full border border-blue-200">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/></svg>
            SPONSORED
          </span>
        </div>
      )}

      {/* Post Header */}
      <div className="p-4 pb-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <Link href={`/dashboard/community/profile/${post.author.id}`} className="flex-shrink-0">
            <Avatar user={post.author} size={44} />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <Link
                href={`/dashboard/community/profile/${post.author.id}`}
                className="font-semibold text-slate-800 hover:text-[#1E3A5F] transition-colors leading-tight"
              >
                {post.author.fullName || "Volunteer"}
              </Link>
              {post.author.status === "OFFICIAL" && (
                post.author.monthlyPaymentExempt
                  ? <UserMonthlyExemptBadge reason={post.author.monthlyPaymentExemptReason} />
                  : <UserMonthlyOverdueIndicator userId={post.author.id} overdueCount={post.author.overdueMonthsCount ?? 0} />
              )}
            </div>
            {post.author.volunteerId && (
              <span className="text-xs text-slate-400 font-mono">#{post.author.volunteerId}</span>
            )}
            <div className="text-xs text-slate-400 mt-0.5">{timeAgo(post.createdAt)}</div>
          </div>
        </div>

        {menuOptions.length > 0 && (
          <div className="flex-shrink-0">
            <PostMenu options={menuOptions} />
          </div>
        )}
      </div>

      {/* Post Content */}
      <div className="px-4 pb-3">
        {editing ? (
          <div>
            <MentionTextarea
              value={editContent}
              onChange={setEditContent}
              className="w-full p-3 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
              rows={4}
              maxLength={2000}
            />
            <div className="text-xs text-slate-400 text-right">{editContent.length}/2000</div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={saveEdit}
                className="px-4 py-1.5 bg-[#1E3A5F] text-white text-sm rounded-lg hover:bg-[#0d2d5a]"
              >
                Save
              </button>
              <button
                onClick={() => { setEditing(false); setEditContent(post.content); }}
                className="px-4 py-1.5 bg-white border border-slate-200 text-sm rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-slate-700 leading-relaxed whitespace-pre-wrap break-words text-sm sm:text-base">
            {renderMentionContent(post.content)}
          </p>
        )}
        {/* Shared post embed */}
        {post.sharedPost && !editing && (
          <SharedPostEmbed sharedPost={post.sharedPost} />
        )}
        {/* Image Gallery */}
        {post.images && post.images.length > 0 && (
          <PostImageGallery images={post.images} />
        )}
      </div>

      {/* Reaction + Comment bar */}
      <div className="px-4 py-2 border-t border-slate-100 flex items-center gap-4 flex-wrap">
        <button
          onClick={() => onReact(post.id, post.userReacted)}
          className={`flex items-center gap-1.5 text-sm font-medium transition-all ${
            post.userReacted ? "text-rose-500" : "text-slate-500 hover:text-rose-500"
          }`}
        >
          <HeartIcon filled={post.userReacted} />
          <ReactionCount count={post.reactionCount} postId={post.id} />
          <span className="ml-0.5">{post.userReacted ? "Loved" : "Love"}</span>
        </button>

        <button
          onClick={toggleComments}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-[#1E3A5F] transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <span>{post.commentCount > 0 ? post.commentCount : ""}</span>
          <span>Comment{post.commentCount !== 1 ? "s" : ""}</span>
        </button>

        <button
          onClick={() => setShareModalOpen(true)}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-[#1E3A5F] transition-colors ml-auto"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          {(post.shareCount ?? 0) > 0 && (
            <span className="font-semibold">{post.shareCount}</span>
          )}
          <span>Share</span>
        </button>
      </div>

      {/* Share Modal */}
      <PostShareModal
        post={post}
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        onShareAsPost={onShareAsPost}
      />

      {/* Comments Section */}
      {commentsOpen && (
        <div className="px-4 pb-4 border-t border-slate-100">
          <div className="flex gap-2 mt-3">
            <div className="flex-1">
              <MentionTextarea
                textareaRef={commentInputRef}
                value={newComment}
                onChange={setNewComment}
                placeholder="Write a comment…"
                className="w-full p-2.5 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                rows={2}
                maxLength={1000}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitComment(); }
                }}
              />
            </div>
            <button
              onClick={submitComment}
              disabled={commentSubmitting || !newComment.trim()}
              className="px-3 py-2 bg-[#1E3A5F] text-white text-sm rounded-xl self-start disabled:opacity-50 hover:bg-[#0d2d5a] transition-colors"
            >
              {commentSubmitting ? "…" : "Post"}
            </button>
          </div>

          {commentsLoading ? (
            <div className="mt-3 space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : comments.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400 text-center py-2">No comments yet. Be the first!</p>
          ) : (
            <div className="mt-2">
              {comments.map((c) => (
                <CommentItem
                  key={c.id}
                  comment={c}
                  postAuthorId={post.authorId}
                  currentUserId={currentUserId}
                  onDelete={deleteComment}
                  onEdit={editComment}
                  onReact={reactComment}
                  onReply={replyToComment}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Report Modal */}
      <ReportPostModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        onSubmit={handleReport}
        isLoading={reportLoading}
      />
    </div>
  );
}
