// R4 — CO₂ Accumulation Risk
// Per /docs/lemnisca_scaleup_app_dev_spec.md Section 2.2

import type {
  ProcessInputs,
  DerivedParameters,
  Co2RiskResult,
  RiskScore,
  Confidence,
  AssessmentFlag,
} from "@/lib/types";

import {
  RQ_DEFAULTS,
  KLA_CO2_O2_RATIO,
  H_CO2,
  RHO,
  G,
  ATMOSPHERIC_PRESSURE_PA,
  CO2_BIOMASS_THRESHOLD,
  CO2_OUR_THRESHOLD,
  CO2_THRESHOLDS,
  VANT_RIET_COALESCING_COEFFICIENT,
  VANT_RIET_COALESCING_PV_EXPONENT,
  VANT_RIET_COALESCING_VS_EXPONENT,
  PV_SCENARIO_MULTIPLIERS,
} from "@/lib/constants";

/** Compute kLa (h⁻¹) using the van't Riet coalescing correlation. */
function klaVantRiet(pv: number, vs: number): number {
  const kla_s =
    VANT_RIET_COALESCING_COEFFICIENT *
    Math.pow(pv, VANT_RIET_COALESCING_PV_EXPONENT) *
    Math.pow(vs, VANT_RIET_COALESCING_VS_EXPONENT);
  return kla_s * 3600;
}

/** Score pCO₂ at vessel bottom per spec thresholds. */
function scorePco2(pco2_bottom: number): RiskScore {
  if (pco2_bottom < CO2_THRESHOLDS.low) return "low";
  if (pco2_bottom < CO2_THRESHOLDS.moderate) return "moderate";
  if (pco2_bottom < CO2_THRESHOLDS.high) return "high";
  return "critical";
}

/** Resolve RQ for the organism/condition. */
function resolveRq(inputs: ProcessInputs): number {
  if (inputs.organism_species === "p_pastoris") {
    // Use corrected RQ = 0.67 for P. pastoris methanol phase
    return RQ_DEFAULTS.p_pastoris_methanol;
  }
  if (inputs.organism_species === "s_cerevisiae") {
    return RQ_DEFAULTS.s_cerevisiae_aerobic;
  }
  return RQ_DEFAULTS.bacteria_aerobic;
}

/** Determine confidence — CO₂ domain always carries widest interval note. */
function co2Confidence(inputs: ProcessInputs): { confidence: Confidence; driver: string } {
  if (inputs.our_mode === "measured" || inputs.our_mode === "exhaust_gas") {
    return {
      confidence: "reliable",
      driver: "Widest confidence interval of the five domains. OUR user-provided; CO₂ model is a simplified mass-balance estimate.",
    };
  }
  return {
    confidence: "directional",
    driver: "Widest confidence interval of the five domains. OUR estimated from literature; provide measured OUR to improve confidence.",
  };
}

export function calculateCo2Risk(
  inputs: ProcessInputs,
  derived: DerivedParameters,
): { result: Co2RiskResult; flags: AssessmentFlag[] } {
  const flags: AssessmentFlag[] = [];
  const { confidence, driver } = co2Confidence(inputs);

  // Activation check: only run detailed calc when biomass_cdw > 20 OR our_peak > 30
  const activated =
    derived.biomass_cdw > CO2_BIOMASS_THRESHOLD ||
    derived.our_peak > CO2_OUR_THRESHOLD;

  if (!activated) {
    return {
      result: {
        score: "low",
        activated: false,
        confidence,
        driver,
      },
      flags,
    };
  }

  // CER = rq × our_peak (mmol CO₂/L/h)
  const rq = resolveRq(inputs);
  const cer = rq * derived.our_peak;

  // kLa_O2 at target scale (moderate P/V scenario)
  const pv_target = PV_SCENARIO_MULTIPLIERS.moderate * derived.pv_lab;
  const kla_o2_target = klaVantRiet(pv_target, derived.vs_target);

  // kLa_CO2 = 0.9 × kLa_O2 at target scale
  const kla_co2 = KLA_CO2_O2_RATIO * kla_o2_target;

  // pCO2_bulk estimated from CER / (kLa_CO2 × H_CO2)
  // CER in mmol/L/h, kLa_CO2 in h⁻¹, H_CO2 in mol/L/atm
  // Convert CER to mol/L/h: CER / 1000
  // pCO2_bulk = (CER / 1000) / (kLa_CO2 × H_CO2)  → atm, then convert to bar (1 atm ≈ 1.01325 bar)
  const pco2_bulk_atm = (cer / 1000) / (kla_co2 * H_CO2);
  const pco2_bulk = pco2_bulk_atm * 1.01325; // convert atm to bar

  // Hydrostatic pressure: dP = rho × g × H_liquid_target (Pa)
  const h_liquid_target = derived.target_geometry.h_liquid;
  const dp_hydro = RHO * G * h_liquid_target;

  // pCO2_bottom = pCO2_bulk + dP / 101325 (bar)
  // dP/101325 converts Pa to atm, then multiply by 1.01325 to get bar
  const pco2_bottom = pco2_bulk + (dp_hydro / ATMOSPHERIC_PRESSURE_PA) * 1.01325;

  const score = scorePco2(pco2_bottom);

  return {
    result: {
      score,
      activated: true,
      cer,
      kla_co2,
      pco2_bulk: pco2_bulk,
      pco2_bottom,
      dp_hydro,
      confidence,
      driver,
    },
    flags,
  };
}
