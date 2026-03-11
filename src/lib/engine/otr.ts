// R1 — Oxygen Transfer Risk
// Per /docs/lemnisca_scaleup_app_dev_spec.md Section 2.2

import type {
  ProcessInputs,
  DerivedParameters,
  OtrRiskResult,
  RiskScore,
  Confidence,
  AssessmentFlag,
} from "@/lib/types";

import {
  VANT_RIET_COALESCING_COEFFICIENT,
  VANT_RIET_COALESCING_PV_EXPONENT,
  VANT_RIET_COALESCING_VS_EXPONENT,
  PV_SCENARIO_MULTIPLIERS,
  OTR_THRESHOLDS,
} from "@/lib/constants";

/**
 * Compute kLa (h⁻¹) using the van't Riet coalescing correlation.
 * kLa = 0.026 × PV^0.4 × Vs^0.5  (s⁻¹), then × 3600 for h⁻¹.
 * PV in W/m³, Vs in m/s.
 */
function klaVantRiet(pv: number, vs: number): number {
  const kla_s =
    VANT_RIET_COALESCING_COEFFICIENT *
    Math.pow(pv, VANT_RIET_COALESCING_PV_EXPONENT) *
    Math.pow(vs, VANT_RIET_COALESCING_VS_EXPONENT);
  return kla_s * 3600;
}

/** Score kLa ratio (achievable / required) per spec thresholds. */
function scoreKlaRatio(ratio: number): RiskScore {
  if (ratio > OTR_THRESHOLDS.low) return "low";
  if (ratio >= OTR_THRESHOLDS.moderate) return "moderate";
  if (ratio >= OTR_THRESHOLDS.high) return "high";
  return "critical";
}

/** Determine confidence based on OUR mode. */
function otrConfidence(inputs: ProcessInputs): { confidence: Confidence; driver: string } {
  if (inputs.our_mode === "measured") {
    return {
      confidence: "high_confidence",
      driver: "OUR user-provided.",
    };
  }
  if (inputs.our_mode === "exhaust_gas") {
    return {
      confidence: "high_confidence",
      driver: "OUR calculated from exhaust gas data.",
    };
  }
  // estimate
  return {
    confidence: "directional",
    driver:
      "OUR estimated from literature; provide measured OUR to upgrade to High-confidence.",
  };
}

export function calculateOtrRisk(
  inputs: ProcessInputs,
  derived: DerivedParameters,
): { result: OtrRiskResult; flags: AssessmentFlag[] } {
  const flags: AssessmentFlag[] = [];

  // Step 1: Required kLa
  const kla_required = derived.our_peak / derived.driving_force; // h⁻¹

  // Lab kLa for flag check
  const kla_lab = klaVantRiet(derived.pv_lab, derived.vs_lab);

  // Oxygen-limitation flag
  if (kla_lab < kla_required) {
    flags.push({
      domain: "otr",
      message:
        "Your lab process appears oxygen-limited. Resolve this before scale-up assessment is meaningful.",
    });
  }

  // Step 3: Three P/V scenarios at target scale
  const pv_conservative = PV_SCENARIO_MULTIPLIERS.conservative * derived.pv_lab;
  const pv_moderate = PV_SCENARIO_MULTIPLIERS.moderate * derived.pv_lab;
  const pv_aggressive = PV_SCENARIO_MULTIPLIERS.aggressive * derived.pv_lab;

  // Vs_target from constant VVM at target geometry (already derived)
  const vs_target = derived.vs_target;

  const kla_target_conservative = klaVantRiet(pv_conservative, vs_target);
  const kla_target_moderate = klaVantRiet(pv_moderate, vs_target);
  const kla_target_aggressive = klaVantRiet(pv_aggressive, vs_target);

  // Step 4: Risk scoring from moderate scenario
  const kla_ratio = kla_target_moderate / kla_required;
  const score = scoreKlaRatio(kla_ratio);

  const { confidence, driver } = otrConfidence(inputs);

  return {
    result: {
      score,
      kla_required,
      kla_lab,
      kla_target_conservative,
      kla_target_moderate,
      kla_target_aggressive,
      kla_ratio,
      pv_conservative,
      pv_moderate,
      pv_aggressive,
      confidence,
      driver,
    },
    flags,
  };
}
