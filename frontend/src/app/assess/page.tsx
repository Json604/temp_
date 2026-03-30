"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import InputForm from "@/components/InputForm";
import type { FormState } from "@/components/InputForm";
import LivePreview from "@/components/LivePreview";
import { ThemeToggle } from "@/components/ThemeProvider";
import { STORAGE_KEY } from "@/components/EmailGateModal";

export default function AssessPage() {
  const [formState, setFormState] = useState<FormState | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem(STORAGE_KEY));
  }, []);

  const handleStateChange = useCallback((state: FormState) => {
    setFormState(state);
  }, []);

  return (
    <main className="min-h-screen relative transition-colors duration-300" style={{ background: "var(--bg-base)" }}>
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/3 w-[600px] h-[400px] blur-[120px] rounded-full" style={{ background: "var(--ambient-accent)" }} />
        <div className="absolute top-1/3 right-0 w-[400px] h-[400px] blur-[100px] rounded-full" style={{ background: "var(--ambient-warm)" }} />
      </div>

      {/* Top bar */}
      <div className="relative z-10 border-b px-8 py-4 flex items-center justify-between" style={{ background: "var(--bg-elevated)", borderColor: "var(--border-primary)" }}>
        <div className="flex items-center gap-4">
          <Link href="/" className="text-base font-bold tracking-tight hover:opacity-80 transition-opacity" style={{ color: "var(--text-heading)" }}>
            Lemnisca
          </Link>
          <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>Scale-Up Risk Assessment</span>
        </div>
        <div className="flex items-center gap-2">
          {isLoggedIn && (
            <Link
              href="/dashboard"
              className="text-sm px-3 py-1.5 rounded-lg font-medium transition-all"
              style={{ color: "var(--text-tertiary)", border: "1px solid var(--border-primary)" }}
            >
              Dashboard
            </Link>
          )}
          <ThemeToggle />
        </div>
      </div>

      <div className="relative z-10 py-8 px-4">
        {/* Split layout: Form (left) + Live Preview (right) */}
        <div className="max-w-7xl mx-auto flex gap-6 items-start">
          {/* Form panel — scrollable */}
          <div className="flex-1 min-w-0">
            <InputForm onStateChange={handleStateChange} />
          </div>

          {/* Live preview panel — sticky */}
          <div className="w-80 flex-shrink-0 hidden lg:block">
            <LivePreview formState={formState} />
          </div>
        </div>
      </div>
    </main>
  );
}
