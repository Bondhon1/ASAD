"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface Author {
  id: string;
  fullName: string | null;
  volunteerId: string | null;
  profilePicUrl: string | null;
  role: string;
  status: string;
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

export interface Post {
  id: string;
  authorId: string;
  author: Author;
  content: string;
  createdAt: string;
  updatedAt: string;
  reactionCount: number;
  userReacted: boolean;
  commentCount: number;
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
            <Link
              href={`/dashboard/community/profile/${comment.author.id}`}
              className="font-semibold text-sm text-slate-800 hover:text-[#1E3A5F] transition-colors"
            >
              {comment.author.fullName || "Volunteer"}
            </Link>
            {comment.author.volunteerId && (
              <span className="text-[10px] text-slate-400 font-mono">#{comment.author.volunteerId}</span>
            )}
          </div>
          {editing ? (
            <div className="mt-1">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
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
            <p className="text-sm text-slate-700 mt-0.5 break-words">{comment.content}</p>
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
            {comment.reactionCount > 0 && <span>{comment.reactionCount}</span>}
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
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
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
  onDelete,
  onEdit,
  onReact,
}: {
  post: Post;
  currentUserId: string;
  onDelete: (id: string) => void;
  onEdit: (id: string, content: string) => Promise<void>;
  onReact: (id: string, currentReacted: boolean) => void;
}) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
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

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Post Header */}
      <div className="p-4 pb-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <Link href={`/dashboard/community/profile/${post.author.id}`} className="flex-shrink-0">
            <Avatar user={post.author} size={44} />
          </Link>
          <div className="min-w-0">
            <Link
              href={`/dashboard/community/profile/${post.author.id}`}
              className="font-semibold text-slate-800 hover:text-[#1E3A5F] transition-colors leading-tight block"
            >
              {post.author.fullName || "Volunteer"}
            </Link>
            {post.author.volunteerId && (
              <span className="text-xs text-slate-400 font-mono">#{post.author.volunteerId}</span>
            )}
            <div className="text-xs text-slate-400 mt-0.5">{timeAgo(post.createdAt)}</div>
          </div>
        </div>

        {isAuthor && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => setEditing(!editing)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-[#1E3A5F] hover:bg-[#1E3A5F]/10 transition-all"
              title="Edit"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
            </button>
            <button
              onClick={() => onDelete(post.id)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
              title="Delete"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            </button>
          </div>
        )}
      </div>

      {/* Post Content */}
      <div className="px-4 pb-3">
        {editing ? (
          <div>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
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
            {post.content}
          </p>
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
          <span>{post.reactionCount > 0 ? post.reactionCount : ""}</span>
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
      </div>

      {/* Comments Section */}
      {commentsOpen && (
        <div className="px-4 pb-4 border-t border-slate-100">
          <div className="flex gap-2 mt-3">
            <div className="flex-1">
              <textarea
                ref={commentInputRef}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
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
    </div>
  );
}
