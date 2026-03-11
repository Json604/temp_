// R2 — Mixing Risk
// Per /docs/lemnisca_scaleup_app_dev_spec.md Section 2.2

import type {
  ProcessInputs,
  DerivedParameters,
  MixingRiskResult,
  RiskScore,
  Confidence,
  AssessmentFlag,
} from "@/lib/types";

import {
  RUSZKOWSKI_CONSTANT,
  RHO,
  DA_THRESHOLDS,
  PH_MIX_THRESHOLDS,
  FEED_TAU_MAP,
} from "@/lib/constants";

/**
 * Ruszkowski mixing time (seconds).
 * theta_mix = 5.9 × T² / (epsilon^(1/3) × D_imp^(4/3))
 * where epsilon = PV / rho (specific energy dissipation, m²/s³),
 * T = tank diameter (m), D_imp = impeller diameter (m).
 */
function ruszkowskiMixingTime(
  t_diameter: number,
  d_imp: number,
  pv: number,
): number {
  const epsilon = pv / RHO;
  return (
    RUSZKOWSKI_CONSTANT *
    Math.pow(t_diameter, 2) /
    (Math.pow(epsilon, 1 / 3) * Math.pow(d_imp, 4 / 3))
  );
}

/** Score Damköhler number per spec thresholds. */
function scoreDa(da: number): RiskScore {
  if (da < DA_THRESHOLDS.low) return "low";
  if (da < DA_THRESHOLDS.moderate) return "moderate";
  if (da < DA_THRESHOLDS.high) return "high";
  return "critical";
}

/** Score pH control risk from target mixing time. */
function scorePhControl(theta_mix_target: number): RiskScore {
  if (theta_mix_target < PH_MIX_THRESHOLDS.low) return "low";
  if (theta_mix_target <= PH_MIX_THRESHOLDS.moderate) return "moderate";
  return "high";
}

/** Return the higher of two risk scores. */
const SCORE_ORDER: Record<RiskScore, number> = {
  low: 0,
  moderate: 1,
  high: 2,
  critical: 3,
};

function maxScore(a: RiskScore, b: RiskScore): RiskScore {
  return SCORE_ORDER[a] >= SCORE_ORDER[b] ? a : b;
}

/** Resolve tau_feed from inputs (numeric override takes precedence). */
function resolveTauFeed(inputs: ProcessInputs): number {
  if (inputs.feed_interval_seconds != null && inputs.feed_interval_seconds > 0) {
    return inputs.feed_interval_seconds;
  }
  return FEED_TAU_MAP[inputs.feed_frequency!];
}

/** Determine confidence based on OUR mode. */
function mixingConfidence(inputs: ProcessInputs): { confidence: Confidence; driver: string } {
  if (inputs.our_mode === "measured" || inputs.our_mode === "exhaust_gas") {
    return {
      confidence: "reliable",
      driver: "OUR user-provided; mixing relies on Ruszkowski correlation.",
    };
  }
  return {
    confidence: "reliable",
    driver:
      "Mixing risk is independent of OUR estimation; limited by Ruszkowski correlation accuracy.",
  };
}

export function calculateMixingRisk(
  inputs: ProcessInputs,
  derived: DerivedParameters,
): { result: MixingRiskResult; flags: AssessmentFlag[] } {
  const flags: AssessmentFlag[] = [];

  // Step 1: Mixing time at lab scale (Ruszkowski)
  const theta_mix_lab = ruszkowskiMixingTime(
    derived.lab_geometry.t_diameter,
    derived.lab_geometry.d_imp,
    derived.pv_lab,
  );

  // Scale to target: theta_mix_target = theta_mix_lab × (v_target / v_lab)^(1/3)
  const theta_mix_target =
    theta_mix_lab * Math.pow(inputs.v_target / inputs.v_lab, 1 / 3);

  // H/D warning flag
  if (inputs.h_d_target > 1.5) {
    flags.push({
      domain: "mixing",
      message:
        "Mixing time estimate carries significant additional uncertainty for H/D > 1.5. Multi-impeller configurations are standard practice at this scale. Ruszkowski validated for H/D 0.8–1.5 only.",
    });
  }

  // Input verification flag: lab theta_mix > 30 s AND v_lab < 20
  if (theta_mix_lab > 30 && inputs.v_lab < 20) {
    flags.push({
      domain: "mixing",
      message:
        "Unusual mixing time for this vessel size — verify RPM entry.",
    });
  }

  // Step 3: pH control risk
  const ph_score = scorePhControl(theta_mix_target);

  // Step 2: Damköhler number (fed-batch only)
  let da: number | undefined;
  let da_score: RiskScore | undefined;

  if (inputs.process_type === "fed_batch") {
    const tau_feed = resolveTauFeed(inputs);
    da = theta_mix_target / tau_feed;
    da_score = scoreDa(da);
  }

  // Overall mixing score = highest of Da score and pH score
  const score =
    da_score != null ? maxScore(da_score, ph_score) : ph_score;

  const { confidence, driver } = mixingConfidence(inputs);

  return {
    result: {
      score,
      theta_mix_lab,
      theta_mix_target,
      da,
      da_score,
      ph_score,
      confidence,
      driver,
    },
    flags,
  };
}
