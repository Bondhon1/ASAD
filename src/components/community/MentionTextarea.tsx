"use client";

import { useState, useRef, useCallback, useEffect, KeyboardEvent } from "react";
import Image from "next/image";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface MentionUser {
  id: string;
  fullName: string | null;
  volunteerId: string | null;
  profilePicUrl: string | null;
}

interface MentionSegment {
  displayStart: number;
  displayEnd: number;
  encodedStart: number;
  encodedEnd: number;
  isMention: boolean;
}

// ─── Encoding helpers ──────────────────────────────────────────────────────────

const MENTION_RE = /@\[([^\]]+)\]\(([^)]+)\)/g;

/** Convert encoded string (contains @[Name](id)) to plain display string (@Name). */
function encodedToDisplay(encoded: string): string {
  return encoded.replace(MENTION_RE, "@$1");
}

/** Parse encoded string into segments mapping display ↔ encoded positions. */
function parseSegments(encoded: string): MentionSegment[] {
  const segments: MentionSegment[] = [];
  let lastEncEnd = 0;
  let displayPos = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(MENTION_RE.source, "g");

  while ((m = re.exec(encoded)) !== null) {
    if (m.index > lastEncEnd) {
      const len = m.index - lastEncEnd;
      segments.push({ displayStart: displayPos, displayEnd: displayPos + len, encodedStart: lastEncEnd, encodedEnd: m.index, isMention: false });
      displayPos += len;
    }
    const dispLen = 1 + m[1].length; // "@" + name
    segments.push({ displayStart: displayPos, displayEnd: displayPos + dispLen, encodedStart: m.index, encodedEnd: m.index + m[0].length, isMention: true });
    displayPos += dispLen;
    lastEncEnd = m.index + m[0].length;
  }

  if (lastEncEnd < encoded.length) {
    const len = encoded.length - lastEncEnd;
    segments.push({ displayStart: displayPos, displayEnd: displayPos + len, encodedStart: lastEncEnd, encodedEnd: encoded.length, isMention: false });
  }
  return segments;
}

/**
 * Map a display-text position to its corresponding encoded position.
 * If the position falls inside a mention span, expand to the boundary indicated
 * by `side`: "start" → mention start, "end" → mention end.
 */
function mapDisplayToEncoded(segments: MentionSegment[], displayPos: number, side: "start" | "end"): number {
  for (const seg of segments) {
    if (displayPos >= seg.displayStart && displayPos <= seg.displayEnd) {
      if (seg.isMention) return side === "start" ? seg.encodedStart : seg.encodedEnd;
      return seg.encodedStart + (displayPos - seg.displayStart);
    }
  }
  // Beyond last segment
  const last = segments[segments.length - 1];
  return last ? last.encodedEnd : displayPos;
}

/**
 * Apply an edit made on displayValue to the encodedValue.
 * Uses common-prefix/suffix diffing to find the changed region, then maps
 * display positions back to encoded positions (expanding any touched mention spans).
 */
function applyDisplayEditToEncoded(oldEncoded: string, oldDisplay: string, newDisplay: string): string {
  // Find common prefix length
  let pre = 0;
  const minLen = Math.min(oldDisplay.length, newDisplay.length);
  while (pre < minLen && oldDisplay[pre] === newDisplay[pre]) pre++;

  // Find common suffix length (don't overlap with prefix)
  let suf = 0;
  while (
    suf < oldDisplay.length - pre &&
    suf < newDisplay.length - pre &&
    oldDisplay[oldDisplay.length - 1 - suf] === newDisplay[newDisplay.length - 1 - suf]
  ) suf++;

  const displayDelStart = pre;
  const displayDelEnd = oldDisplay.length - suf;
  const inserted = newDisplay.slice(pre, newDisplay.length - suf);

  if (displayDelStart === displayDelEnd && inserted === "") return oldEncoded;

  const segments = parseSegments(oldEncoded);
  const encDelStart = mapDisplayToEncoded(segments, displayDelStart, "start");
  const encDelEnd = mapDisplayToEncoded(segments, displayDelEnd, "end");

  return oldEncoded.slice(0, encDelStart) + inserted + oldEncoded.slice(encDelEnd);
}

/** Map an encoded cursor position to its display position. */
function encodedCursorToDisplay(segments: MentionSegment[], encodedPos: number): number {
  for (const seg of segments) {
    if (encodedPos >= seg.encodedStart && encodedPos <= seg.encodedEnd) {
      if (seg.isMention) return seg.displayEnd; // place cursor after mention in display
      return seg.displayStart + (encodedPos - seg.encodedStart);
    }
  }
  const last = segments[segments.length - 1];
  return last ? last.displayEnd : encodedPos;
}

// ─── Public helpers ────────────────────────────────────────────────────────────

/** Extract all mentioned user IDs from encoded content. */
export function extractMentionIds(content: string): string[] {
  const matches = [...content.matchAll(new RegExp(MENTION_RE.source, "g"))];
  return [...new Set(matches.map((m) => m[2]))];
}

/** Render encoded text as React nodes with clickable @Name mention links. */
export function renderMentionContent(text: string): React.ReactNode {
  const parts = text.split(/(@\[[^\]]+\]\([^)]+\))/g);
  return (
    <>
      {parts.map((part, i) => {
        const match = part.match(/^@\[([^\]]+)\]\(([^)]+)\)$/);
        if (match) {
          return (
            <a
              key={i}
              href={`/dashboard/community/profile/${match[2]}`}
              className="text-[#1E3A5F] font-semibold hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              @{match[1]}
            </a>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

// ─── Mention trigger detection ─────────────────────────────────────────────────

function detectMentionTrigger(
  displayText: string,
  cursorPos: number
): { query: string; atStart: number } | null {
  const before = displayText.slice(0, cursorPos);
  const match = before.match(/@([^\s@]*)$/);
  if (!match) return null;
  const query = match[1];
  if (query.length < 3) return null;
  return { query, atStart: before.length - match[0].length };
}

// ─── MentionTextarea ───────────────────────────────────────────────────────────

interface MentionTextareaProps {
  /** Encoded value: may contain @[Name](id) tokens. This is what is sent to the API. */
  value: string;
  onChange: (encoded: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  className?: string;
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}

export function MentionTextarea({
  value,
  onChange,
  placeholder,
  rows = 2,
  maxLength,
  className,
  onKeyDown,
  textareaRef: externalRef,
}: MentionTextareaProps) {
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const taRef = (externalRef || internalRef) as React.RefObject<HTMLTextAreaElement>;
  const dropdownRef = useRef<HTMLDivElement>(null);

  // The textarea always shows displayValue (mentions as @Name, no IDs).
  // value (encoded) is kept in sync via applyDisplayEditToEncoded.
  const [displayValue, setDisplayValue] = useState(() => encodedToDisplay(value));

  // Sync displayValue when the encoded value changes externally (e.g. parent resets to "")
  const prevValueRef = useRef(value);
  useEffect(() => {
    if (value !== prevValueRef.current) {
      prevValueRef.current = value;
      // Only reset display if parent cleared/changed it from outside
      setDisplayValue(encodedToDisplay(value));
    }
  }, [value]);

  const [mentionUsers, setMentionUsers] = useState<MentionUser[]>([]);
  const [mentionQuery, setMentionQuery] = useState<{ query: string; atStart: number } | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const fetchController = useRef<AbortController | null>(null);

  const closeMention = useCallback(() => {
    setMentionUsers([]);
    setMentionQuery(null);
    setActiveIndex(0);
  }, []);

  const handleInput = useCallback(
    async (newDisplay: string) => {
      // Derive new encoded value from the edit applied to old encoded
      const newEncoded = applyDisplayEditToEncoded(value, displayValue, newDisplay);
      setDisplayValue(newDisplay);
      prevValueRef.current = newEncoded;
      onChange(newEncoded);

      const pos = taRef.current?.selectionStart ?? newDisplay.length;
      const trigger = detectMentionTrigger(newDisplay, pos);

      if (!trigger) {
        closeMention();
        return;
      }

      setMentionQuery(trigger);
      setLoading(true);
      fetchController.current?.abort();
      fetchController.current = new AbortController();

      try {
        const res = await fetch(
          `/api/community/users/mention-search?q=${encodeURIComponent(trigger.query)}`,
          { signal: fetchController.current.signal }
        );
        if (res.ok) {
          const data = await res.json();
          setMentionUsers(data.users || []);
          setActiveIndex(0);
        }
      } catch {
        // aborted or network error
      } finally {
        setLoading(false);
      }
    },
    [value, displayValue, onChange, taRef, closeMention]
  );

  const insertMention = useCallback(
    (user: MentionUser) => {
      if (!mentionQuery) return;
      const name = user.fullName || "Volunteer";
      const encodedToken = `@[${name}](${user.id})`;
      const displayToken = `@${name}`;

      // Build new display: replace "@<query>" with "@Name "
      const newDisplay =
        displayValue.slice(0, mentionQuery.atStart) +
        displayToken +
        " " +
        displayValue.slice(mentionQuery.atStart + mentionQuery.query.length + 1);

      // Build new encoded: insert "@[Name](id) " at correct encoded position
      const segments = parseSegments(value);
      const encInsertPos = mapDisplayToEncoded(segments, mentionQuery.atStart, "start");
      // Remove the "@<query>" portion from encoded (it's plain text, same length in display & encoded)
      const encRemoveEnd = encInsertPos + mentionQuery.query.length + 1; // +1 for @
      const newEncoded =
        value.slice(0, encInsertPos) +
        encodedToken +
        " " +
        value.slice(encRemoveEnd);

      setDisplayValue(newDisplay);
      prevValueRef.current = newEncoded;
      onChange(newEncoded);
      closeMention();

      // Move cursor to after inserted mention in the textarea (display positions)
      setTimeout(() => {
        const ta = taRef.current;
        if (ta) {
          ta.focus();
          const cursor = mentionQuery.atStart + displayToken.length + 1;
          ta.setSelectionRange(cursor, cursor);
        }
      }, 0);
    },
    [value, displayValue, mentionQuery, onChange, closeMention, taRef]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (mentionUsers.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setActiveIndex((i) => (i + 1) % mentionUsers.length);
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setActiveIndex((i) => (i - 1 + mentionUsers.length) % mentionUsers.length);
          return;
        }
        if (e.key === "Enter" || e.key === "Tab") {
          const selected = mentionUsers[activeIndex];
          if (selected) {
            e.preventDefault();
            insertMention(selected);
            return;
          }
        }
        if (e.key === "Escape") {
          e.preventDefault();
          closeMention();
          return;
        }
      }
      onKeyDown?.(e);
    },
    [mentionUsers, activeIndex, insertMention, closeMention, onKeyDown]
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        taRef.current &&
        !taRef.current.contains(e.target as Node)
      ) {
        closeMention();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [closeMention, taRef]);

  const showDropdown = mentionUsers.length > 0 || (loading && mentionQuery !== null);

  return (
    <div className="relative w-full">
      <textarea
        ref={taRef}
        value={displayValue}
        onChange={(e) => handleInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        className={className}
      />

      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
          style={{ top: "100%" }}
        >
          {loading && mentionUsers.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-400">Searching…</div>
          ) : (
            mentionUsers.map((u, i) => (
              <button
                key={u.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertMention(u);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                  i === activeIndex
                    ? "bg-[#1E3A5F]/10 text-[#1E3A5F]"
                    : "hover:bg-slate-50 text-slate-700"
                }`}
              >
                {u.profilePicUrl ? (
                  <Image
                    src={u.profilePicUrl}
                    alt={u.fullName || ""}
                    width={24}
                    height={24}
                    className="rounded-full object-cover border border-slate-200 flex-shrink-0"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-[#1E3A5F] text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                    {(u.fullName || "V").charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="font-medium truncate">{u.fullName || "Volunteer"}</span>
                {u.volunteerId && (
                  <span className="text-[10px] text-slate-400 font-mono ml-auto flex-shrink-0">
                    #{u.volunteerId}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
