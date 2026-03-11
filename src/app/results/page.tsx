"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAssessment, setAssessment, type StoredAssessment } from "@/lib/store";
import { runAssessment } from "@/lib/engine";
import ResultsDashboard from "@/components/ResultsDashboard";

export default function ResultsPage() {
  const router = useRouter();
  const [data, setData] = useState<StoredAssessment | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // 1. Try memory store first (normal flow)
    const memData = getAssessment();
    if (memData) {
      setData(memData);
      setLoaded(true);
      return;
    }

    // 2. Fall back to DB via last saved assessment ID (page refresh)
    const assessmentId = localStorage.getItem("lemnisca_last_assessment_id");
    if (assessmentId) {
      fetch(`/api/assessments/${assessmentId}`)
        .then((r) => {
          if (!r.ok) throw new Error("Not found");
          return r.json();
        })
        .then((dbRecord) => {
          // Re-run the engine to get derived parameters (not stored in DB)
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

    // 3. No data anywhere — redirect to assess
    router.replace("/assess");
  }, [router]);

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

  return (
    <ResultsDashboard
      data={data}
      onBackClick={() => router.push("/assess")}
    />
  );
}
