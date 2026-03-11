"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAssessment, type StoredAssessment } from "@/lib/store";
import ResultsDashboard from "@/components/ResultsDashboard";

export default function ResultsPage() {
  const router = useRouter();
  const [data, setData] = useState<StoredAssessment | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const a = getAssessment();
    if (!a) {
      router.replace("/assess");
      return;
    }
    setData(a);
    setLoaded(true);
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
