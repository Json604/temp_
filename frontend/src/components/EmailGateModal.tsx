"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { validateWorkEmail, extractDomain } from "@/lib/email-validation";
import { apiUrl } from "@/lib/api";

const STORAGE_KEY = "lemnisca_work_email";

type AuthMode = "login" | "signup";

export default function EmailGateModal({ onClose, onSuccess }: { onClose: () => void; onSuccess?: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<AuthMode>("login");
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

      if (!password || password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }

      setSubmitting(true);

      try {
        const res = await fetch(apiUrl("/api/auth"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            password,
            action: mode,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Something went wrong. Please try again.");
          setSubmitting(false);
          return;
        }

        localStorage.setItem(STORAGE_KEY, email.trim().toLowerCase());

        if (onSuccess) {
          onSuccess();
        } else {
          router.push("/assess");
        }
      } catch (err) {
        console.error("Auth error:", err);
        setError("Connection failed. Please try again.");
        setSubmitting(false);
      }
    },
    [email, password, mode, router, onSuccess]
  );

  const clearError = () => {
    if (error) setError("");
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-md rounded-2xl px-8 py-10 animate-slide-up"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-primary)",
          boxShadow: "0 24px 80px rgba(0, 0, 0, 0.25), 0 8px 24px rgba(0, 0, 0, 0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top accent line */}
        <div
          className="absolute top-0 left-8 right-8 h-[2px] rounded-full"
          style={{ background: "linear-gradient(90deg, var(--text-grad-accent-start), var(--text-grad-accent-end))" }}
        />

        <div className="text-center mb-6">
          <div
            className="mx-auto mb-4 w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: "var(--accent-glow)" }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-grad-accent-start)" strokeWidth="1.5" className="w-5 h-5">
              {mode === "signup" ? (
                <><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4-4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" /></>
              ) : (
                <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></>
              )}
            </svg>
          </div>
          <h2 className="text-xl font-semibold" style={{ color: "var(--text-heading)" }}>
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h2>
          <p className="mt-2 text-sm" style={{ color: "var(--text-tertiary)" }}>
            {mode === "signup"
              ? "Enter your work email and set a password to get started."
              : "Sign in to access your assessments."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="work-email"
              className="block text-[11px] font-medium uppercase tracking-[0.1em] mb-2"
              style={{ color: "var(--text-tertiary)" }}
            >
              Work email address
              <span className="text-risk-high ml-1 text-base font-semibold leading-none align-top" aria-hidden="true">
                *
              </span>
            </label>
            <input
              ref={inputRef}
              id="work-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearError();
              }}
              placeholder="you@company.com"
              className={`glass-input w-full px-4 py-3 text-sm ${
                error ? "border-risk-critical/50" : ""
              }`}
              disabled={submitting}
            />
          </div>

          <div>
            <label
              htmlFor="auth-password"
              className="block text-[11px] font-medium uppercase tracking-[0.1em] mb-2"
              style={{ color: "var(--text-tertiary)" }}
            >
              Password
              <span className="text-risk-high ml-1 text-base font-semibold leading-none align-top" aria-hidden="true">
                *
              </span>
            </label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearError();
              }}
              placeholder={mode === "signup" ? "Min. 8 characters" : "Enter your password"}
              className={`glass-input w-full px-4 py-3 text-sm ${
                error ? "border-risk-critical/50" : ""
              }`}
              disabled={submitting}
            />
          </div>

          {error && (
            <p className="text-sm text-risk-critical">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 text-sm font-medium rounded-xl transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            style={{
              background: `linear-gradient(135deg, var(--text-grad-accent-start), var(--text-grad-accent-end))`,
              color: "#ffffff",
              boxShadow: `0 4px 16px var(--accent-glow)`,
            }}
          >
            {submitting
              ? "Loading\u2026"
              : mode === "signup"
              ? "Create Account"
              : "Sign In"}
          </button>
        </form>

        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError("");
            }}
            className="text-sm transition-colors"
            style={{ color: "var(--text-tertiary)" }}
          >
            {mode === "login"
              ? "Don\u2019t have an account? "
              : "Already have an account? "}
            <span className="font-medium underline underline-offset-4" style={{ color: "var(--text-secondary)" }}>
              {mode === "login" ? "Sign up" : "Sign in"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

export { STORAGE_KEY };
