"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { X, MessageSquare, Loader2, Search, Plus } from "lucide-react";
import { useChatContext, ConversationPreview } from "./ChatProvider";

const CHAT_TRIGGER_ATTR = "data-chat-trigger";

function UserAvatar({
  user,
  size = 40,
}: {
  user: { fullName?: string | null; profilePicUrl?: string | null };
  size?: number;
}) {
  if (user.profilePicUrl) {
    return (
      <Image
        src={user.profilePicUrl}
        alt={user.fullName || "User"}
        width={size}
        height={size}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-[#1E3A5F] text-white flex items-center justify-center font-bold flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {(user.fullName || "U").charAt(0).toUpperCase()}
    </div>
  );
}

function formatTime(dateStr: string | null) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function ChatList() {
  const { isListOpen, closeList, openChat, isOfficialUser, conversations, conversationsLoading: loading } =
    useChatContext();

  const panelRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  
  // Filter conversations based on search query
  const filteredConversations = conversations.filter((conv) =>
    conv.otherUser.fullName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Close on outside click, but ignore clicks on the topbar trigger button
  useEffect(() => {
    if (!isListOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Element;
      if (target.closest(`[${CHAT_TRIGGER_ATTR}]`)) return;
      if (panelRef.current && !panelRef.current.contains(target)) {
        closeList();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isListOpen, closeList]);

  if (!isListOpen || !isOfficialUser) return null;

  return (
    <>
      {/* Desktop: dropdown panel anchored below topbar */}
      <div
        ref={panelRef}
        className="fixed top-16 right-6 z-50 bg-white shadow-2xl border border-gray-200 rounded-xl overflow-hidden hidden md:flex flex-col"
        style={{ width: 320, height: 440 }}
      >
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#1E3A5F] text-white flex-shrink-0 rounded-t-xl">
          <span className="font-semibold text-sm">Messages</span>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setShowNewChat(true)} 
              className="p-1 hover:bg-white/20 rounded"
              title="New chat"
            >
              <Plus size={16} />
            </button>
            <button onClick={closeList} className="p-1 hover:bg-white/20 rounded">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="px-3 py-2 border-b border-gray-200 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1E3A5F]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="animate-spin text-gray-400" size={20} />
            </div>
          )}
          {!loading && conversations.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 px-4 text-center">
              <MessageSquare size={36} className="mb-2 opacity-40" />
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs mt-1">Visit a member's profile to start chatting</p>
            </div>
          )}
          {!loading && conversations.length > 0 && filteredConversations.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 px-4 text-center">
              <Search size={36} className="mb-2 opacity-40" />
              <p className="text-sm">No matches found</p>
              <p className="text-xs mt-1">Try a different search term</p>
            </div>
          )}
          {filteredConversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => openChat(conv.otherUser.id, conv.otherUser)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors border-b border-gray-100"
            >
              <div className="relative">
                <UserAvatar user={conv.otherUser} size={38} />
                {conv.hasUnread && (
                  <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white" />
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between">
                  <p className={`text-sm truncate ${conv.hasUnread ? "font-bold text-gray-900" : "font-medium text-gray-800"}`}>
                    {conv.otherUser.fullName || "Volunteer"}
                  </p>
                  <span className="text-[10px] text-gray-400 ml-1 flex-shrink-0">
                    {formatTime(conv.lastMessageAt)}
                  </span>
                </div>
                <p className={`text-xs truncate ${conv.hasUnread ? "text-gray-700 font-medium" : "text-gray-500"}`}>
                  {conv.lastMessage?.body || "Start a conversation"}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Mobile: full-screen list */}
      <div className="fixed inset-0 z-50 bg-white flex flex-col md:hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-[#1E3A5F] text-white flex-shrink-0">
            <span className="font-semibold">Messages</span>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setShowNewChat(true)} 
                className="p-1.5 hover:bg-white/20 rounded-lg"
                title="New chat"
              >
                <Plus size={20} />
              </button>
              <button onClick={closeList} className="p-1.5 hover:bg-white/20 rounded-lg">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="px-4 py-3 border-b border-gray-200 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1E3A5F]"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="animate-spin text-gray-400" size={24} />
              </div>
            )}
            {!loading && conversations.length === 0 && (
              <div className="flex flex-col items-center justify-center h-60 text-gray-400 px-6 text-center">
                <MessageSquare size={48} className="mb-3 opacity-40" />
                <p className="font-medium text-gray-500">No conversations yet</p>
                <p className="text-sm mt-1">Visit a member's profile to start chatting</p>
              </div>
            )}
            {!loading && conversations.length > 0 && filteredConversations.length === 0 && (
              <div className="flex flex-col items-center justify-center h-60 text-gray-400 px-6 text-center">
                <Search size={48} className="mb-3 opacity-40" />
                <p className="font-medium text-gray-500">No matches found</p>
                <p className="text-sm mt-1">Try a different search term</p>
              </div>
            )}
            {filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => openChat(conv.otherUser.id, conv.otherUser)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100"
              >
                <div className="relative">
                  <UserAvatar user={conv.otherUser} size={46} />
                  {conv.hasUnread && (
                    <span className="absolute top-0 right-0 w-3 h-3 bg-blue-500 rounded-full border-2 border-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <p className={`truncate ${conv.hasUnread ? "font-bold text-gray-900" : "font-medium text-gray-800"}`}>
                      {conv.otherUser.fullName || "Volunteer"}
                    </p>
                    <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                      {formatTime(conv.lastMessageAt)}
                    </span>
                  </div>
                  <p className={`text-sm truncate ${conv.hasUnread ? "text-gray-700 font-medium" : "text-gray-500"}`}>
                    {conv.lastMessage?.body || "Start a conversation"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      
      {/* New Chat Modal */}
      {showNewChat && (
        <NewChatModal onClose={() => setShowNewChat(false)} onSelectUser={openChat} />
      )}
    </>
  );
}

// ─── New Chat Modal Component ────────────────────────────────────────

function NewChatModal({ 
  onClose, 
  onSelectUser 
}: { 
  onClose: () => void;
  onSelectUser: (userId: string, user: any) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error("User search failed:", err);
    }
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      searchUsers();
    }
  };

  const handleSelectUser = (user: any) => {
    onSelectUser(user.id, user);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">New Chat</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search by name or volunteer ID..."
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1E3A5F]"
                autoFocus
              />
            </div>
            <button
              onClick={searchUsers}
              disabled={!searchQuery.trim() || loading}
              className="px-4 py-2.5 bg-[#1E3A5F] text-white text-sm font-medium rounded-lg hover:bg-[#0d2d5a] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : "Search"}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {!searched && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 px-6 text-center py-12">
              <Search size={48} className="mb-3 opacity-40" />
              <p className="font-medium text-gray-500">Search for members</p>
              <p className="text-sm mt-1">Enter a name or volunteer ID to find someone to chat with</p>
            </div>
          )}
          {searched && !loading && users.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 px-6 text-center py-12">
              <MessageSquare size={48} className="mb-3 opacity-40" />
              <p className="font-medium text-gray-500">No users found</p>
              <p className="text-sm mt-1">Try a different search term</p>
            </div>
          )}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-gray-400" size={24} />
            </div>
          )}
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => handleSelectUser(user)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100"
            >
              <UserAvatar user={user} size={46} />
              <div className="flex-1 min-w-0 text-left">
                <p className="font-medium text-gray-800 truncate">
                  {user.fullName || "Volunteer"}
                </p>
                <p className="text-sm text-gray-500 truncate">
                  {user.role?.replace(/_/g, " ")}
                  {user.volunteerId && (
                    <span className="ml-1 font-mono">#{user.volunteerId}</span>
                  )}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
