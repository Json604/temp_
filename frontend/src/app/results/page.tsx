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
      <main className="min-h-screen flex items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          <p className="text-silver-500 text-sm">Loading assessment&hellip;</p>
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

          {/* Show composite score as a teaser */}
          {data && (
            <div className="mb-5">
              <span className="text-4xl font-bold text-silver-100">{data.results.composite_score}</span>
              <p className="text-xs text-risk-critical mt-1 font-medium capitalize">{data.results.composite_label?.replace(/_/g, " ") || "Risk Score"}</p>
            </div>
          )}

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

          <button
            onClick={() => router.push("/assess")}
            className="mt-3 text-sm text-silver-500 hover:text-silver-300 underline underline-offset-4 decoration-silver-700 hover:decoration-silver-500 transition-colors"
          >
            Go back to inputs
          </button>
        </div>
      </div>

      {showAuthModal && (
        <EmailGateModal onClose={() => setShowAuthModal(false)} onSuccess={handleAuthSuccess} />
      )}
    </div>
  );
}
