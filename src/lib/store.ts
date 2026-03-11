// Client-side assessment store.
// Holds the last assessment result in memory so the results page can read it
// without a database round-trip. Uses a simple module-level singleton — safe
// for Next.js App Router client components.

import type { ProcessInputs, DerivedParameters } from "@/lib/types";
import type { PartialAssessmentResult } from "@/lib/engine";

export interface StoredAssessment {
  inputs: ProcessInputs;
  derived: DerivedParameters;
  results: PartialAssessmentResult;
}

let _assessment: StoredAssessment | null = null;

export function setAssessment(a: StoredAssessment): void {
  _assessment = a;
}

export function getAssessment(): StoredAssessment | null {
  return _assessment;
}
