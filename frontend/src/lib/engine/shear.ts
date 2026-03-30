// R3 — Shear Stress Risk
// Per /docs/lemnisca_scaleup_app_dev_spec.md Section 2.2

import type {
  ProcessInputs,
  DerivedParameters,
  ShearRiskResult,
  RiskScore,
  Confidence,
  AssessmentFlag,
} from "@/lib/types";

import {
  TIP_SPEED_THRESHOLDS,
  SHEAR_THRESHOLDS,
} from "@/lib/constants";

/** Score tip speed ratio (v_tip / organism threshold) per spec thresholds. */
function scoreTipSpeedRatio(ratio: number): RiskScore {
  if (ratio < SHEAR_THRESHOLDS.low) return "low";
  if (ratio < SHEAR_THRESHOLDS.moderate) return "moderate";
  if (ratio < SHEAR_THRESHOLDS.high) return "high";
  return "critical";
}

/** Determine confidence based on OUR mode (shear is independent of OUR). */
function shearConfidence(inputs: ProcessInputs): { confidence: Confidence; driver: string } {
  if (inputs.our_mode === "measured" || inputs.our_mode === "exhaust_gas") {
    return {
      confidence: "reliable",
      driver: "Shear risk depends on geometry and agitation; independent of OUR estimation.",
    };
  }
  return {
    confidence: "reliable",
    driver: "Shear risk depends on geometry and agitation; independent of OUR estimation.",
  };
}

export function calculateShearRisk(
  inputs: ProcessInputs,
  derived: DerivedParameters,
): { result: ShearRiskResult; flags: AssessmentFlag[] } {
  const flags: AssessmentFlag[] = [];

  const d_imp_lab = derived.lab_geometry.d_imp;
  const d_imp_target = derived.target_geometry.d_imp;

  // Tip speed at target scale (constant P/V):
  // N_target = N_lab × (D_imp_lab / D_imp_target)^(5/3)
  const n_lab_rps = derived.n_rps; // rev/s
  const n_target = n_lab_rps * Math.pow(d_imp_lab / d_imp_target, 5 / 3);

  // v_tip = π × N_target × D_imp_target (m/s, N in rev/s)
  const tip_speed = Math.PI * n_target * d_imp_target;

  // Organism threshold
  const tip_speed_threshold = TIP_SPEED_THRESHOLDS[inputs.organism_species];

  // Ratio and scoring
  const tip_speed_ratio = tip_speed / tip_speed_threshold;
  const score = scoreTipSpeedRatio(tip_speed_ratio);

  const { confidence, driver } = shearConfidence(inputs);

  return {
    result: {
      score,
      n_target,
      tip_speed,
      tip_speed_threshold,
      tip_speed_ratio,
      confidence,
      driver,
    },
    flags,
  };
}
