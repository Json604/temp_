"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { validateWorkEmail, extractDomain } from "@/lib/email-validation";

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
        const res = await fetch("/api/auth", {
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
        className="relative glass-panel w-full max-w-md px-8 py-10 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

        <h2 className="text-xl font-semibold text-silver-100">
          {mode === "signup" ? "Create your account" : "Sign in to continue"}
        </h2>
        <p className="mt-2 text-sm text-silver-500">
          {mode === "signup"
            ? "Enter your work email and set a password to get started."
            : "Enter your credentials to access your assessments."}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
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
              className="block text-[11px] font-medium uppercase tracking-[0.1em] text-silver-500 mb-2"
            >
              Password
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
            className="btn-primary w-full py-3 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="relative z-10">
              {submitting
                ? "Loading\u2026"
                : mode === "signup"
                ? "Create Account"
                : "Sign In"}
            </span>
          </button>
        </form>

        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError("");
            }}
            className="text-sm text-silver-500 hover:text-silver-300 transition-colors"
          >
            {mode === "login"
              ? "Don\u2019t have an account? Sign up"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}

export { STORAGE_KEY };
