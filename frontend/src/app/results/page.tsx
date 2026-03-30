"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getAssessment, setAssessment, type StoredAssessment } from "@/lib/store";
import { runAssessment } from "@/lib/engine";
import ResultsDashboard from "@/components/ResultsDashboard";
import EmailGateModal, { STORAGE_KEY } from "@/components/EmailGateModal";
import { apiUrl } from "@/lib/api";

export default function ResultsPage() {
  const router = useRouter();
  const [data, setData] = useState<StoredAssessment | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    const loggedIn = !!localStorage.getItem(STORAGE_KEY);
    setIsAuthenticated(loggedIn);

    // 1. Try memory store first (normal flow)
    const memData = getAssessment();
    if (memData) {
      setData(memData);
      setLoaded(true);

      // If logged in and not already saved, save to DB in background
      // Set flag synchronously BEFORE fetch to prevent double-save from React Strict Mode
      const alreadySaved = localStorage.getItem("lemnisca_last_assessment_id");
      if (loggedIn && !alreadySaved) {
        localStorage.setItem("lemnisca_last_assessment_id", "saving");
        const storedEmail = localStorage.getItem(STORAGE_KEY);
        if (storedEmail) {
          fetch(apiUrl("/api/assessments/save"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: storedEmail,
              inputs: memData.inputs,
              results: memData.results,
            }),
          })
            .then((r) => r.json())
            .then((d) => {
              if (d.id) localStorage.setItem("lemnisca_last_assessment_id", d.id);
            })
            .catch((err) => {
              // Clear the flag so it can retry
              localStorage.removeItem("lemnisca_last_assessment_id");
              console.error("Failed to save assessment:", err);
            });
        }
      }
      return;
    }

    // 2. Fall back to DB via last saved assessment ID (page refresh)
    const assessmentId = localStorage.getItem("lemnisca_last_assessment_id");
    if (assessmentId) {
      fetch(apiUrl(`/api/assessments/${assessmentId}`))
        .then((r) => {
          if (!r.ok) throw new Error("Not found");
          return r.json();
        })
        .then((dbRecord) => {
          const results = runAssessment(dbRecord.inputs);
          const restored: StoredAssessment = {
            inputs: dbRecord.inputs,
            derived: results.derived,
            results,
          };
          setAssessment(restored);
          setData(restored);
          setLoaded(true);
        })
        .catch(() => {
          router.replace("/assess");
        });
      return;
    }

    // 3. No data — redirect to assess
    router.replace("/assess");
  }, [router]);

  const handleAuthSuccess = useCallback(() => {
    setShowAuthModal(false);
    setIsAuthenticated(true);

    // Save the assessment now that user is logged in
    const alreadySaved = localStorage.getItem("lemnisca_last_assessment_id");
    if (data && !alreadySaved) {
      localStorage.setItem("lemnisca_last_assessment_id", "saving");
      const storedEmail = localStorage.getItem(STORAGE_KEY);
      if (storedEmail) {
        fetch(apiUrl("/api/assessments/save"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: storedEmail,
            inputs: data.inputs,
            results: data.results,
          }),
        })
          .then((r) => r.json())
          .then((d) => {
            if (d.id) localStorage.setItem("lemnisca_last_assessment_id", d.id);
          })
          .catch((err) => {
            localStorage.removeItem("lemnisca_last_assessment_id");
            console.error("Failed to save assessment:", err);
          });
      }
    }
  }, [data]);

  if (!loaded || !data) {
    return (
      <main className="min-h-screen bg-surface">
        {/* Skeleton top bar */}
        <div className="border-b px-8 py-4 flex items-center justify-between" style={{ background: "var(--bg-elevated)", borderColor: "var(--border-primary)" }}>
          <div className="flex items-center gap-4">
            <div className="h-5 w-20 rounded bg-[var(--input-bg)] skeleton-shimmer" />
            <div className="h-4 w-32 rounded bg-[var(--input-bg)] skeleton-shimmer" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-24 rounded-lg bg-[var(--input-bg)] skeleton-shimmer" />
            <div className="h-8 w-8 rounded-full bg-[var(--input-bg)] skeleton-shimmer" />
          </div>
        </div>

        {/* Skeleton body */}
        <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
          {/* Hero card skeleton */}
          <div className="glass-panel p-10 flex flex-col items-center gap-6">
            <div className="w-40 h-40 rounded-full bg-[var(--input-bg)] skeleton-shimmer" />
            <div className="h-5 w-28 rounded bg-[var(--input-bg)] skeleton-shimmer" />
            <div className="flex gap-3">
              <div className="h-6 w-16 rounded-full bg-[var(--input-bg)] skeleton-shimmer" />
              <div className="h-6 w-20 rounded-full bg-[var(--input-bg)] skeleton-shimmer" />
              <div className="h-6 w-28 rounded-full bg-[var(--input-bg)] skeleton-shimmer" />
            </div>
            <div className="w-full max-w-lg space-y-2 mt-4">
              <div className="h-4 w-32 rounded bg-[var(--input-bg)] skeleton-shimmer" />
              <div className="h-4 w-full rounded bg-[var(--input-bg)] skeleton-shimmer" />
              <div className="h-4 w-3/4 rounded bg-[var(--input-bg)] skeleton-shimmer" />
            </div>
          </div>

          {/* Risk domain cards skeleton */}
          <div className="space-y-2">
            <div className="h-4 w-28 rounded bg-[var(--input-bg)] skeleton-shimmer" />
            <div className="grid grid-cols-5 gap-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="glass-panel-sm p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[var(--input-bg)] skeleton-shimmer" />
                    <div className="h-3 w-20 rounded bg-[var(--input-bg)] skeleton-shimmer" />
                  </div>
                  <div className="h-5 w-14 rounded-full bg-[var(--input-bg)] skeleton-shimmer" />
                  <div className="h-3 w-24 rounded bg-[var(--input-bg)] skeleton-shimmer" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Authenticated — show full results
  if (isAuthenticated) {
    return (
      <ResultsDashboard
        data={data}
        onBackClick={() => router.push("/assess")}
      />
    );
  }

  // Not authenticated — show blurred results with CTA overlay
  return (
    <div className="relative min-h-screen">
      {/* Blurred results underneath */}
      <div className="pointer-events-none select-none" style={{ filter: "blur(8px)" }}>
        <ResultsDashboard
          data={data}
          onBackClick={() => {}}
        />
      </div>

      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" />

      {/* CTA card */}
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="glass-panel w-full max-w-md px-8 py-10 text-center animate-slide-up">
          {/* Subtle glow line */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

          {/* Show highest risk level as a teaser */}
          {data && (() => {
            const scores = [data.results.otr.score, data.results.mixing.score, data.results.shear.score, data.results.co2.score, data.results.heat.score];
            const order = { low: 0, moderate: 1, high: 2, critical: 3 } as const;
            const worst = scores.reduce((a, b) => order[a] >= order[b] ? a : b);
            return (
              <div className="mb-5">
                <span className={`risk-badge risk-badge-${worst} !text-sm !px-4 !py-1.5`}>{worst} risk</span>
              </div>
            );
          })()}

          <h2 className="text-xl font-semibold text-silver-100">
            Your assessment is complete
          </h2>
          <p className="mt-3 text-sm text-silver-400 leading-relaxed">
            Sign in to view the full breakdown across all 5 risk domains,
            save your results, and generate PDF reports.
          </p>

          <button
            onClick={() => setShowAuthModal(true)}
            className="btn-primary mt-6 w-full py-3 text-sm font-medium"
          >
            <span className="relative z-10">Sign in to view full results</span>
          </button>

        </div>
      </div>

      {showAuthModal && (
        <EmailGateModal onClose={() => setShowAuthModal(false)} onSuccess={handleAuthSuccess} />
      )}
    </div>
  );
}
