"use client";

import { useState, useCallback } from "react";
import type { ProcessInputs, DerivedParameters } from "@/lib/types";
import type { PartialAssessmentResult } from "@/lib/engine";

interface GeneratePdfButtonProps {
  inputs: ProcessInputs;
  derived: DerivedParameters;
  results: PartialAssessmentResult;
}

export default function GeneratePdfButton({
  inputs,
  derived,
  results,
}: GeneratePdfButtonProps) {
  const [generating, setGenerating] = useState(false);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      const [{ pdf }, { PdfReportDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./PdfReport"),
      ]);

      const doc = PdfReportDocument({ inputs, derived, results });
      const blob = await pdf(doc).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const species = inputs.organism_species.replace(/_/g, "-");
      const date = new Date().toISOString().slice(0, 10);
      a.download = `lemnisca-risk-assessment-${species}-${date}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setGenerating(false);
    }
  }, [inputs, derived, results]);

  return (
    <button
      type="button"
      onClick={handleGenerate}
      disabled={generating}
      className="mt-6 w-full btn-primary flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <span className="relative z-10 flex items-center gap-2">
        {generating ? (
          <>
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Generating PDF&hellip;
          </>
        ) : (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Generate PDF Report
          </>
        )}
      </span>
    </button>
  );
}
