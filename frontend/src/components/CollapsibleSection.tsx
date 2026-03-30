"use client";

import { useState, useEffect } from "react";

interface CollapsibleSectionProps {
  id: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  visible?: boolean;
  focused?: boolean;
  completionSummary?: string;
  onFocusSection?: () => void;
}

export default function CollapsibleSection({
  id,
  title,
  subtitle,
  children,
  defaultOpen = true,
  visible = true,
  focused,
  completionSummary,
  onFocusSection,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  // Auto-expand when focused
  useEffect(() => {
    if (focused) setOpen(true);
  }, [focused]);

  if (!visible) return null;

  const isFocused = focused === true;
  const isDimmed = focused === false; // explicitly false means another section is focused

  return (
    <section
      id={id}
      className={`mb-4 overflow-hidden transition-all duration-300 ${
        isFocused
          ? "glass-panel section-focused"
          : isDimmed
            ? "glass-panel section-dimmed"
            : "glass-panel"
      }`}
      onClick={() => onFocusSection?.()}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
          onFocusSection?.();
        }}
        className="w-full flex items-center justify-between px-6 py-4 text-left group transition-colors hover:bg-white/[0.02]"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h2 className={`text-sm font-semibold uppercase tracking-[0.08em] transition-colors duration-200 ${
              isFocused ? "text-accent" : "text-silver-200"
            }`}>
              {title}
            </h2>
            {completionSummary && !open && (
              <span className="text-[11px] text-silver-500 truncate max-w-[280px] font-mono">
                {completionSummary}
              </span>
            )}
          </div>
          {subtitle && open && (
            <p className="text-[11px] text-silver-600 mt-0.5">{subtitle}</p>
          )}
        </div>

        {/* Completion indicator */}
        {completionSummary && !open && (
          <span className="mr-3 flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="rgba(52,211,153,0.4)" strokeWidth="1.5" />
              <path d="M5 8l2 2 4-4" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        )}

        <span className={`text-silver-500 text-lg transition-transform duration-300 flex-shrink-0 ${open ? "rotate-180" : "rotate-0"}`}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 6l4 4 4-4" />
          </svg>
        </span>
      </button>
      {open && (
        <div className="px-6 pb-6 pt-2 border-t border-white/[0.04] animate-fade-in">
          {children}
        </div>
      )}
    </section>
  );
}
