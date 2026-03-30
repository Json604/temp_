"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeProvider";
import { setAssessment } from "@/lib/store";
import { runAssessment } from "@/lib/engine";
import type { ProcessInputs } from "@/lib/types";
import { apiUrl } from "@/lib/api";

const STORAGE_KEY = "lemnisca_work_email";

const SPECIES_LABELS: Record<string, string> = {
  e_coli: "E. coli",
  b_subtilis: "B. subtilis",
  s_cerevisiae: "S. cerevisiae",
  p_pastoris: "P. pastoris",
  other_bacteria: "Other bacterium",
  other_yeast: "Other yeast",
};

const PROCESS_LABELS: Record<string, string> = {
  batch: "Batch",
  fed_batch: "Fed-batch",
};

interface UserProfile {
  id: string;
  email: string;
  company_domain: string;
  created_at: string;
  assessment_count: number;
}

interface AssessmentSummary {
  id: string;
  inputs: ProcessInputs;
  results: {
    overall_score?: string;
    primary_bottleneck?: { domain: string; statement: string };
    otr?: { score: string };
    mixing?: { score: string };
    shear?: { score: string };
    co2?: { score: string };
    heat?: { score: string };
  };
  created_at: string;
}

function getRiskDotColor(score: string): string {
  switch (score) {
    case "low": return "bg-risk-low";
    case "moderate": return "bg-risk-moderate";
    case "high": return "bg-risk-high";
    case "critical": return "bg-risk-critical";
    default: return "bg-silver-600";
  }
}

function getHighestRisk(results: AssessmentSummary["results"]): string {
  const scores = [
    results.otr?.score,
    results.mixing?.score,
    results.shear?.score,
    results.co2?.score,
    results.heat?.score,
  ].filter(Boolean) as string[];

  const order = ["critical", "high", "moderate", "low"];
  for (const level of order) {
    if (scores.includes(level)) return level;
  }
  return "low";
}

/* ── Skeleton components ── */

function SkeletonPulse({ className }: { className?: string }) {
  return (
    <div
      className={`relative rounded overflow-hidden bg-silver-800/30 dark:bg-white/[0.05] ${className ?? ""}`}
    >
      <div className="absolute inset-0 skeleton-shimmer" />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <main className="min-h-screen relative" style={{ background: "var(--bg-base)" }}>
      {/* Ambient */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-[30%] w-[500px] h-[400px] blur-[120px] rounded-full" style={{ background: "var(--ambient-accent)" }} />
      </div>

      {/* Top bar skeleton */}
      <div className="relative z-10 border-b px-6 py-3 flex items-center justify-between" style={{ background: "var(--bar-bg)", backdropFilter: "blur(20px)", borderColor: "var(--bar-border)" }}>
        <div className="flex items-center gap-3">
          <SkeletonPulse className="w-16 h-4" />
          <span className="w-px h-4 bg-black/[0.04] dark:bg-white/[0.06]" />
          <SkeletonPulse className="w-20 h-4" />
        </div>
        <div className="flex items-center gap-3">
          <SkeletonPulse className="w-24 h-4" />
          <SkeletonPulse className="w-8 h-8 rounded-full" />
        </div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Profile card skeleton */}
        <div className="glass-panel p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <SkeletonPulse className="w-40 h-6" />
              <SkeletonPulse className="w-52 h-4" />
            </div>
            <SkeletonPulse className="w-16 h-4" />
          </div>
          <div className="mt-5 flex gap-6">
            <div className="space-y-2">
              <SkeletonPulse className="w-20 h-3" />
              <SkeletonPulse className="w-10 h-8" />
            </div>
            <div className="space-y-2">
              <SkeletonPulse className="w-20 h-3" />
              <SkeletonPulse className="w-28 h-5" />
            </div>
          </div>
        </div>

        {/* Assessment history skeleton */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <SkeletonPulse className="w-36 h-4" />
            <SkeletonPulse className="w-24 h-3" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-panel p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <SkeletonPulse className="w-2.5 h-2.5 rounded-full" />
                    <div className="space-y-1.5">
                      <SkeletonPulse className="w-44 h-4" />
                      <SkeletonPulse className="w-60 h-3" />
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((d) => (
                        <SkeletonPulse key={d} className="w-1.5 h-1.5 rounded-full" />
                      ))}
                    </div>
                    <SkeletonPulse className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

/* ── Main page ── */

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [assessments, setAssessments] = useState<AssessmentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      router.replace("/");
      return;
    }
    setEmail(stored);

    Promise.all([
      fetch(apiUrl(`/api/user?email=${encodeURIComponent(stored)}`)).then((r) =>
        r.ok ? r.json() : null
      ),
      fetch(apiUrl(`/api/assessments?email=${encodeURIComponent(stored)}`)).then((r) =>
        r.ok ? r.json() : { assessments: [] }
      ),
    ])
      .then(([userData, assessmentData]) => {
        if (userData) setUser(userData);
        setAssessments(assessmentData.assessments ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load data. Please try again.");
        setLoading(false);
      });
  }, [router]);

  const handleViewAssessment = (assessment: AssessmentSummary) => {
    const results = runAssessment(assessment.inputs);
    setAssessment({
      inputs: assessment.inputs,
      derived: results.derived,
      results,
    });
    localStorage.setItem("lemnisca_last_assessment_id", assessment.id);
    router.push("/results");
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("lemnisca_last_assessment_id");
    router.push("/");
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <main className="min-h-screen relative" style={{ background: "var(--bg-base)" }}>
      {/* Ambient */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-[30%] w-[500px] h-[400px] blur-[120px] rounded-full" style={{ background: "var(--ambient-accent)" }} />
      </div>

      {/* Top bar */}
      <div className="relative z-10 border-b px-6 py-3 flex items-center justify-between" style={{ background: "var(--bar-bg)", backdropFilter: "blur(20px)", borderColor: "var(--bar-border)" }}>
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm font-semibold text-silver-300 hover:text-silver-100 transition-colors">
            Lemnisca
          </Link>
          <span className="w-px h-4 bg-black/[0.04] dark:bg-white/[0.06]" />
          <span className="text-sm text-silver-400">Dashboard</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/assess"
            className="text-sm text-accent hover:text-accent-cool transition-colors"
          >
            New assessment
          </Link>
          <ThemeToggle />
        </div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-8 space-y-8">
        {error && (
          <div className="glass-panel-sm p-4 border-risk-high/20 bg-risk-high/[0.04] text-risk-high text-sm">
            {error}
          </div>
        )}

        {/* Profile card */}
        <div className="glass-panel p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-semibold text-silver-100">
                {user?.company_domain
                  ? user.company_domain.charAt(0).toUpperCase() + user.company_domain.slice(1)
                  : "Your Account"}
              </h1>
              <p className="text-sm text-silver-500 mt-1">{email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs text-silver-600 hover:text-risk-critical transition-colors"
            >
              Sign out
            </button>
          </div>

          <div className="mt-5 flex gap-6">
            <div>
              <p className="text-[10px] uppercase tracking-[0.1em] text-silver-600 mb-1">Assessments</p>
              <p className="text-2xl font-mono text-silver-100">{user?.assessment_count ?? assessments.length}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.1em] text-silver-600 mb-1">Member since</p>
              <p className="text-sm font-mono text-silver-300">
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "\u2014"}
              </p>
            </div>
          </div>
        </div>

        {/* Assessment history */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[11px] font-semibold text-silver-500 uppercase tracking-[0.12em]">
              Assessment History
            </h2>
            <span className="text-[11px] text-silver-600">
              {assessments.length} assessment{assessments.length !== 1 ? "s" : ""}
            </span>
          </div>

          {assessments.length === 0 ? (
            <div className="glass-panel p-8 text-center">
              <p className="text-silver-500 text-sm mb-4">No assessments yet.</p>
              <Link
                href="/assess"
                className="btn-primary px-6 py-2.5 text-sm inline-block"
              >
                <span className="relative z-10">Run your first assessment</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {assessments.map((a) => {
                const highestRisk = getHighestRisk(a.results);
                const species = SPECIES_LABELS[a.inputs.organism_species] ?? a.inputs.organism_species;
                const process = PROCESS_LABELS[a.inputs.process_type] ?? a.inputs.process_type;
                const date = new Date(a.created_at).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <button
                    key={a.id}
                    onClick={() => handleViewAssessment(a)}
                    className="glass-panel w-full p-5 text-left transition-all duration-200 hover:border-accent/15 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${getRiskDotColor(highestRisk)}`} />
                        <div>
                          <p className="text-sm font-medium text-silver-200 group-hover:text-silver-100 transition-colors">
                            {species} &mdash; {process}
                          </p>
                          <p className="text-xs text-silver-500 mt-0.5">
                            {a.inputs.v_lab} L &rarr; {Number(a.inputs.v_target).toLocaleString("en-GB")} L
                            <span className="mx-2 text-silver-700">&middot;</span>
                            {date}
                          </p>
                        </div>
                      </div>

                      {/* Domain risk dots */}
                      <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-1.5">
                          {(["otr", "mixing", "shear", "co2", "heat"] as const).map((d) => {
                            const score = a.results[d]?.score;
                            return (
                              <div
                                key={d}
                                className={`w-1.5 h-1.5 rounded-full ${score ? getRiskDotColor(score) : "bg-silver-700"}`}
                                title={`${d}: ${score ?? "n/a"}`}
                              />
                            );
                          })}
                        </div>
                        <svg className="w-4 h-4 text-silver-600 group-hover:text-accent transition-colors" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M6 4l4 4-4 4" />
                        </svg>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
