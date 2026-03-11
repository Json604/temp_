"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { validateWorkEmail, extractDomain } from "@/lib/email-validation";

const STORAGE_KEY = "lemnisca_work_email";

export default function EmailGateModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");

      const result = validateWorkEmail(email);
      if (!result.valid) {
        setError(result.error!);
        return;
      }

      setSubmitting(true);

      const domain = extractDomain(email);

      try {
        await fetch("/api/log-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim().toLowerCase(), domain }),
        });
      } catch (err) {
        console.error("Failed to log email:", err);
      }

      localStorage.setItem(STORAGE_KEY, email.trim().toLowerCase());
      router.push("/assess");
    },
    [email, router]
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative glass-panel w-full max-w-md px-8 py-10 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

        <h2 className="text-xl font-semibold text-silver-100">
          Enter your work email to continue
        </h2>
        <p className="mt-2 text-sm text-silver-500">
          We use this to understand which organisations are evaluating their
          processes. No spam, no marketing.
        </p>

        <form onSubmit={handleSubmit} className="mt-6">
          <label
            htmlFor="work-email"
            className="block text-[11px] font-medium uppercase tracking-[0.1em] text-silver-500 mb-2"
          >
            Work email address
          </label>
          <input
            ref={inputRef}
            id="work-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError("");
            }}
            placeholder="you@company.com"
            className={`glass-input w-full px-4 py-3 text-sm ${
              error ? "border-risk-critical/50" : ""
            }`}
            disabled={submitting}
          />

          {error && (
            <p className="mt-2 text-sm text-risk-critical">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary mt-5 w-full py-3 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="relative z-10">
              {submitting ? "Loading\u2026" : "Continue"}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}

export { STORAGE_KEY };
