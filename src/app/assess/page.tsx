"use client";

import { useState, useCallback } from "react";
import InputForm from "@/components/InputForm";
import type { FormState } from "@/components/InputForm";
import LivePreview from "@/components/LivePreview";
import { ThemeToggle } from "@/components/ThemeProvider";

export default function AssessPage() {
  const [formState, setFormState] = useState<FormState | null>(null);

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

      <div className="relative z-10 py-8 px-4">
        {/* Header */}
        <div className="max-w-7xl mx-auto mb-6 px-2 flex items-start justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-accent/50 mb-2">
              Lemnisca
            </p>
            <h1 className="text-xl font-semibold text-silver-100">
              Scale-Up Risk Assessment
            </h1>
            <p className="text-sm text-silver-500 mt-1">
              Enter your lab-scale fermentation parameters. Your risk profile builds in real time.
            </p>
          </div>
          <ThemeToggle />
        </div>

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
