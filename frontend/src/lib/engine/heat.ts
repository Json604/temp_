// R5 — Heat Removal Risk
// Per /docs/lemnisca_scaleup_app_dev_spec.md Section 2.2

import type {
  ProcessInputs,
  DerivedParameters,
  HeatRiskResult,
  RiskScore,
  Confidence,
  AssessmentFlag,
} from "@/lib/types";

import {
  METABOLIC_HEAT_FACTOR,
  U_JACKET,
  T_CW_OUTLET_OFFSET,
  HEAT_THRESHOLDS,
} from "@/lib/constants";

/** Score heat ratio (Q_metabolic / Q_cool_max) per spec thresholds. */
function scoreHeatRatio(ratio: number): RiskScore {
  if (ratio < HEAT_THRESHOLDS.low) return "low";
  if (ratio < HEAT_THRESHOLDS.moderate) return "moderate";
  if (ratio < HEAT_THRESHOLDS.high) return "high";
  return "critical";
}

/** Determine confidence based on OUR mode. */
function heatConfidence(inputs: ProcessInputs): { confidence: Confidence; driver: string } {
  if (inputs.our_mode === "measured" || inputs.our_mode === "exhaust_gas") {
    return {
      confidence: "reliable",
      driver: "OUR user-provided; heat model uses standard jacket U-value assumption.",
    };
  }
  return {
    confidence: "directional",
    driver: "OUR estimated from literature; heat generation scales directly with OUR. Provide measured OUR to improve confidence.",
  };
}

export function calculateHeatRisk(
  inputs: ProcessInputs,
  derived: DerivedParameters,
): { result: HeatRiskResult; flags: AssessmentFlag[] } {
  const flags: AssessmentFlag[] = [];

  const v_target_m3 = derived.target_geometry.volume_m3;
  const t_target = derived.target_geometry.t_diameter;
  const h_liquid_target = derived.target_geometry.h_liquid;

  // Q_metabolic = 0.46 × our_peak × V_target_m3 (kW)
  const q_metabolic = METABOLIC_HEAT_FACTOR * derived.our_peak * v_target_m3;

  // A_jacket = π × T_target × H_liquid_target + (π/4) × T_target² (m²)
  const a_jacket =
    Math.PI * t_target * h_liquid_target +
    (Math.PI / 4) * t_target * t_target;

  // Dynamic ΔT_lm from user cooling water temp
  const t_cw_inlet = inputs.t_cw_inlet;
  const t_cw_outlet = t_cw_inlet + T_CW_OUTLET_OFFSET;
  const t_process = inputs.temperature;

  const dt_hot = t_process - t_cw_inlet;   // hot end ΔT
  const dt_cold = t_process - t_cw_outlet;  // cold end ΔT

  // Log-mean temperature difference
  // Guard against dt_hot === dt_cold (would cause ln(1) = 0 division)
  let dt_lm: number;
  if (Math.abs(dt_hot - dt_cold) < 0.001) {
    dt_lm = dt_hot; // When equal, LMTD = ΔT
  } else {
    dt_lm = (dt_hot - dt_cold) / Math.log(dt_hot / dt_cold);
  }

  // Q_cool_max = U × A_jacket × dT_lm / 1000 (kW), U = 400 W/m²·K
  const q_cool_max = (U_JACKET * a_jacket * dt_lm) / 1000;

  // heat_ratio = Q_metabolic / Q_cool_max
  const heat_ratio = q_cool_max > 0 ? q_metabolic / q_cool_max : Infinity;
  const score = scoreHeatRatio(heat_ratio);

  const { confidence, driver } = heatConfidence(inputs);

  return {
    result: {
      score,
      q_metabolic,
      a_jacket,
      dt_lm,
      q_cool_max,
      heat_ratio,
      confidence,
      driver,
    },
    flags,
  };
}
