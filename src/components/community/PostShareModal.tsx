"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import { type Post } from "./PostCard";
import { useChatContext } from "@/components/chat/ChatProvider";
import { logErrorToAudit } from "@/lib/apiErrorHandler";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SearchUser {
  id: string;
  fullName: string | null;
  volunteerId: string | null;
  profilePicUrl: string | null;
}

type ShareTab = "post" | "chat" | "external";

interface PostShareModalProps {
  post: Post;
  isOpen: boolean;
  onClose: () => void;
  /** Called after successfully sharing as a new post, so parent can prepend it to the feed */
  onShareAsPost?: (content: string, sharedPostId: string) => Promise<void>;
}

// ─── Small Avatar ─────────────────────────────────────────────────────────────

function MiniAvatar({ user }: { user: SearchUser }) {
  if (user.profilePicUrl) {
    return (
      <Image
        src={user.profilePicUrl}
        alt={user.fullName || "User"}
        width={32}
        height={32}
        className="rounded-full object-cover border border-slate-200 flex-shrink-0"
        style={{ width: 32, height: 32 }}
      />
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-[#1E3A5F] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
      {(user.fullName || "U").charAt(0).toUpperCase()}
    </div>
  );
}

// ─── Share as Post Tab ────────────────────────────────────────────────────────

function ShareAsPostTab({
  post,
  onClose,
  onShareAsPost,
}: {
  post: Post;
  onClose: () => void;
  onShareAsPost?: (content: string, sharedPostId: string) => Promise<void>;
}) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      if (onShareAsPost) {
        await onShareAsPost(message.trim(), post.id);
      } else {
        const res = await fetch("/api/community/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: message.trim(), sharedPostId: post.id }),
        });
        if (!res.ok) {
          console.error(`[PostShareModal] Share failed: ${res.status}`, res.statusText);
          let errorMsg = "Failed to share post";
          try {
            const contentType = res.headers.get("content-type");
            if (contentType?.includes("application/json")) {
              const error = await res.json();
              errorMsg = error.error || errorMsg;
            }
          } catch (parseErr) {
            console.error("[PostShareModal] Failed to parse error response:", parseErr);
          }
          await logErrorToAudit(
            "/api/community/posts",
            "POST",
            `Failed to share post: ${res.status} ${res.statusText}`,
            undefined,
            { postId: post.id, errorMessage: errorMsg }
          );
          alert(errorMsg);
          setLoading(false);
          return;
        }
      }
      setDone(true);
      setTimeout(onClose, 1200);
    } catch (err) {
      console.error("[PostShareModal] Error:", err instanceof Error ? err.message : err);
      await logErrorToAudit(
        "/api/community/posts",
        "POST",
        err instanceof Error ? err : String(err),
        undefined,
        { postId: post.id }
      );
      alert("Error sharing post");
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2 text-green-600">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        <p className="text-sm font-medium">Shared to the community feed!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Optional message textarea */}
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Say something about this post… (optional)"
        className="w-full p-3 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] bg-white"
        rows={3}
        maxLength={500}
      />

      {/* Embedded post preview — Facebook-style */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
        {/* Author row */}
        <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5">
          {post.author.profilePicUrl ? (
            <Image
              src={post.author.profilePicUrl}
              alt={post.author.fullName || "User"}
              width={28}
              height={28}
              className="rounded-full object-cover border border-slate-200 flex-shrink-0"
              style={{ width: 28, height: 28 }}
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-[#1E3A5F] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
              {(post.author.fullName || "U").charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-xs font-semibold text-slate-700 truncate">
            {post.author.fullName || "Volunteer"}
          </span>
        </div>
        {/* Post content preview */}
        <div className="px-3 pb-2.5">
          <p className="text-sm text-slate-600 line-clamp-4 whitespace-pre-wrap break-words leading-relaxed">
            {post.content}
          </p>
          {post.images && post.images.length > 0 && (
            <div className="mt-2 relative h-28 rounded-lg overflow-hidden">
              <Image
                src={post.images[0]}
                alt="Post image"
                fill
                className="object-cover"
                sizes="400px"
              />
              {post.images.length > 1 && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <span className="text-white text-xs font-semibold">+{post.images.length - 1} more</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <button
        onClick={submit}
        disabled={loading}
        className="w-full py-2.5 bg-[#1E3A5F] text-white text-sm font-semibold rounded-xl hover:bg-[#0d2d5a] transition-colors disabled:opacity-50"
      >
        {loading ? "Sharing…" : "Share to Feed"}
      </button>
    </div>
  );
}

// ─── Share via Chat Tab ───────────────────────────────────────────────────────

function ShareViaChatTab({ post, onClose }: { post: Post; onClose: () => void }) {
  const { conversations, isOfficialUser } = useChatContext();
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/community/users/mention-search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const d = await res.json();
        setSearchResults(d.users || []);
      } else {
        console.error(`[ShareModalSearch] Search failed: ${res.status}`, res.statusText);
        await logErrorToAudit(
          `/api/community/users/mention-search`,
          "GET",
          `Failed to search users: ${res.status} ${res.statusText}`,
          undefined,
          { query: q }
        );
      }
    } catch (err) {
      console.error("[ShareModalSearch] Error:", err instanceof Error ? err.message : err);
      await logErrorToAudit(
        `/api/community/users/mention-search`,
        "GET",
        err instanceof Error ? err : String(err),
        undefined,
        { query: q }
      );
    }
    setSearching(false);
  }, []);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => search(query), 300);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [query, search]);

  const sendToUser = async (targetUserId: string) => {
    if (sendingTo) return;
    setSendingTo(targetUserId);
    try {
      // Get or create conversation
      const convRes = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId }),
      });
      if (!convRes.ok) { setSendingTo(null); return; }
      const { conversationId } = await convRes.json();

      // Send message with sharedPostId for rich link preview
      await fetch(`/api/chat/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: "", sharedPostId: post.id }),
      });

      setSentTo(targetUserId);
      setTimeout(() => { setSentTo(null); setSendingTo(null); }, 1800);
    } catch {
      setSendingTo(null);
    }
  };

  if (!isOfficialUser) {
    return (
      <p className="text-sm text-slate-500 text-center py-6">
        Chat is available to official members only.
      </p>
    );
  }

  // Recent conversation users as quick picks
  const recentUsers: SearchUser[] = conversations
    .slice(0, 6)
    .map((c) => ({
      id: c.otherUser.id,
      fullName: c.otherUser.fullName,
      volunteerId: c.otherUser.volunteerId,
      profilePicUrl: c.otherUser.profilePicUrl,
    }));

  const displayList = query.length >= 2 ? searchResults : recentUsers;

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search members…"
          className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
        />
      </div>

      {/* Section label */}
      {query.length < 2 && recentUsers.length > 0 && (
        <p className="text-xs text-slate-400 font-medium px-0.5">Recent conversations</p>
      )}

      {/* User list */}
      {searching ? (
        <div className="flex justify-center py-4">
          <div className="w-5 h-5 border-2 border-[#1E3A5F] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : displayList.length === 0 && query.length >= 2 ? (
        <p className="text-sm text-slate-400 text-center py-4">No members found</p>
      ) : displayList.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">Search for a member to send to</p>
      ) : (
        <ul className="space-y-1 max-h-52 overflow-y-auto">
          {displayList.map((u) => {
            const isSending = sendingTo === u.id;
            const isSent = sentTo === u.id;
            return (
              <li key={u.id}>
                <button
                  onClick={() => sendToUser(u.id)}
                  disabled={!!sendingTo}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors text-left disabled:opacity-60"
                >
                  <MiniAvatar user={u} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{u.fullName || "Volunteer"}</p>
                    {u.volunteerId && <p className="text-xs text-slate-400 font-mono">#{u.volunteerId}</p>}
                  </div>
                  {isSent ? (
                    <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      Sent
                    </span>
                  ) : isSending ? (
                    <div className="w-4 h-4 border-2 border-[#1E3A5F] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="text-slate-300 w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─── External Share Tab ───────────────────────────────────────────────────────

function ExternalShareTab({ post }: { post: Post }) {
  const postUrl = typeof window !== "undefined"
    ? `${window.location.origin}/dashboard/community?post=${post.id}`
    : `/dashboard/community?post=${post.id}`;

  const preview = post.content.length > 100
    ? post.content.slice(0, 100) + "…"
    : post.content;

  const shareText = `${post.author.fullName || "A volunteer"} posted: "${preview}"`;

  const platforms = [
    {
      name: "WhatsApp",
      url: `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${postUrl}`)}`,
      bg: "bg-[#25D366]",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
        </svg>
      ),
    },
    {
      name: "Email",
      url: `mailto:?subject=${encodeURIComponent(`Check out this post by ${post.author.fullName || "a volunteer"}`)}&body=${encodeURIComponent(`${shareText}\n\n${postUrl}`)}`,
      bg: "bg-slate-600",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
      ),
    },
    {
      name: "Telegram",
      url: `https://t.me/share/url?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent(shareText)}`,
      bg: "bg-[#2AABEE]",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      {/* Desktop: 3 cols (WhatsApp, Telegram, Email). Mobile: 2x2 grid with Messenger added */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {platforms.map((p) => (
          <a
            key={p.name}
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex flex-col items-center gap-2 py-4 rounded-xl text-white ${p.bg} hover:opacity-90 transition-opacity`}
          >
            {p.icon}
            <span className="text-xs font-medium">{p.name}</span>
          </a>
        ))}

        {/* Messenger: mobile only (fb-messenger:// deep link works when app is installed) */}
        <a
          href={`fb-messenger://share/?link=${encodeURIComponent(postUrl)}`}
          className="sm:hidden flex flex-col items-center gap-2 py-4 rounded-xl text-white bg-[#0084FF] hover:opacity-90 transition-opacity"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.092.3 2.246.464 3.443.464 6.627 0 12-4.975 12-11.111C24 4.974 18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8l3.131 3.26L19.752 8l-6.561 6.963z"/>
          </svg>
          <span className="text-xs font-medium">Messenger</span>
        </a>
      </div>
      <p className="text-xs text-slate-400 text-center">
        Opens in a new tab. Only members with access can view the post.
      </p>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function PostShareModal({
  post,
  isOpen,
  onClose,
  onShareAsPost,
}: PostShareModalProps) {
  const [activeTab, setActiveTab] = useState<ShareTab>("post");
  const [copied, setCopied] = useState(false);

  // Reset tab when modal opens
  useEffect(() => {
    if (isOpen) setActiveTab("post");
  }, [isOpen]);

  const copyLink = async () => {
    const url = `${window.location.origin}/dashboard/community?post=${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  const tabs: { id: ShareTab; label: string; icon: React.ReactNode }[] = [
    {
      id: "post",
      label: "Share as Post",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
        </svg>
      ),
    },
    {
      id: "chat",
      label: "Send in Chat",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      ),
    },
    {
      id: "external",
      label: "External",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
        </svg>
      ),
    },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-0 bottom-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-50 w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="text-base font-bold text-slate-800">Share Post</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Quick actions: Tab pills + Copy Link */}
        <div className="px-5 pt-4 flex items-center gap-2 flex-shrink-0 flex-wrap">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                activeTab === t.id
                  ? "bg-[#1E3A5F] text-white border-[#1E3A5F]"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}

          {/* Copy Link as inline action */}
          <button
            onClick={copyLink}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              copied
                ? "bg-green-50 text-green-700 border-green-300"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            }`}
          >
            {copied ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Copied!
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                Copy Link
              </>
            )}
          </button>
        </div>

        {/* Tab content */}
        <div className="px-5 py-4 overflow-y-auto flex-1">
          {activeTab === "post" && (
            <ShareAsPostTab
              post={post}
              onClose={onClose}
              onShareAsPost={onShareAsPost}
            />
          )}
          {activeTab === "chat" && (
            <ShareViaChatTab post={post} onClose={onClose} />
          )}
          {activeTab === "external" && (
            <ExternalShareTab post={post} />
          )}
        </div>
      </div>
    </>
  );
}
