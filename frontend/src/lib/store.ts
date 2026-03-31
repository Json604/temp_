// Client-side assessment store.
// Holds the last assessment result in memory + sessionStorage so the results
// page and "Edit inputs" flow can read it without a database round-trip.

import type { ProcessInputs, DerivedParameters } from "@/lib/types";
import type { PartialAssessmentResult } from "@/lib/engine";

export interface StoredAssessment {
  inputs: ProcessInputs;
  derived: DerivedParameters;
  results: PartialAssessmentResult;
}

const ASSESSMENT_KEY = "lemnisca_assessment";
const FORM_DRAFT_KEY = "lemnisca_form_draft";

let _assessment: StoredAssessment | null = null;

function ssGet(key: string): string | null {
  try { return sessionStorage.getItem(key); } catch { return null; }
}
function ssSet(key: string, val: string): void {
  try { sessionStorage.setItem(key, val); } catch { /* quota / SSR */ }
}
function ssRemove(key: string): void {
  try { sessionStorage.removeItem(key); } catch { /* SSR */ }
}

export function setAssessment(a: StoredAssessment): void {
  _assessment = a;
  ssSet(ASSESSMENT_KEY, JSON.stringify(a));
}

export function getAssessment(): StoredAssessment | null {
  if (_assessment) return _assessment;
  const raw = ssGet(ASSESSMENT_KEY);
  if (raw) {
    try {
      _assessment = JSON.parse(raw) as StoredAssessment;
      return _assessment;
    } catch { /* corrupt */ }
  }
  return null;
}

// --- Form draft (FormState strings) ---

export function setFormDraft<T>(draft: T): void {
  ssSet(FORM_DRAFT_KEY, JSON.stringify(draft));
}

export function getFormDraft<T>(): T | null {
  const raw = ssGet(FORM_DRAFT_KEY);
  if (raw) {
    try { return JSON.parse(raw) as T; } catch { /* corrupt */ }
  }
  return null;
}

export function clearFormDraft(): void {
  ssRemove(FORM_DRAFT_KEY);
}
