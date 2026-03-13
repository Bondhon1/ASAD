"use client";

import { useState, useRef, useEffect } from "react";

interface MenuOption {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  className?: string;
  divider?: boolean;
}

export function PostMenu({ options }: { options: MenuOption[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-full text-slate-500 hover:text-[#1E3A5F] hover:bg-[#1E3A5F]/10 transition-all duration-200 flex items-center justify-center"
        title="More options"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <circle cx="12" cy="5" r="2.5" />
          <circle cx="12" cy="12" r="2.5" />
          <circle cx="12" cy="19" r="2.5" />
        </svg>
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          className="absolute right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg shadow-black/10 z-50 overflow-hidden min-w-[200px] animate-in fade-in zoom-in-95 duration-100"
        >
          {options.map((option, index) => (
            <div key={index}>
              {option.divider && <div className="h-px bg-slate-100" />}
              <button
                onClick={() => {
                  option.onClick();
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2.5 text-sm font-medium text-left flex items-center gap-3 hover:bg-slate-50 active:bg-slate-100 transition-colors duration-150 ${
                  option.className || "text-slate-700"
                }`}
              >
                {option.icon && <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">{option.icon}</span>}
                {option.label}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
