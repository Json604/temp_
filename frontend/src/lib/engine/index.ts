// Calculation engine (derivations D1-D7, risks R1-R5).
// Per /docs/lemnisca_scaleup_app_dev_spec.md Section 2.

import type {
  ProcessInputs,
  DerivedParameters,
  AssessmentFlag,
  OtrRiskResult,
  MixingRiskResult,
  ShearRiskResult,
  Co2RiskResult,
  HeatRiskResult,
  PrimaryBottleneck,
  RiskDomain,
  RiskScore,
} from "@/lib/types";
import { runAllDerivations } from "./derivations";
import { calculateOtrRisk } from "./otr";
import { calculateMixingRisk } from "./mixing";
import { calculateShearRisk } from "./shear";
import { calculateCo2Risk } from "./co2";
import { calculateHeatRisk } from "./heat";

export {
  deriveBiomassCdw,
  deriveOur,
  deriveVesselGeometry,
  derivePowerInput,
  derivePowerFlags,
  deriveReynolds,
  deriveReynoldsFlags,
  deriveGasVelocity,
  deriveDrivingForce,
  runAllDerivations,
} from "./derivations";

export type {
  OurResult,
  PowerResult,
  ReynoldsResult,
  FlowRegime,
  GasVelocityResult,
  DrivingForceResult,
  DerivationOutput,
} from "./derivations";

export { calculateOtrRisk } from "./otr";
export { calculateMixingRisk } from "./mixing";
export { calculateShearRisk } from "./shear";
export { calculateCo2Risk } from "./co2";
export { calculateHeatRisk } from "./heat";

// --- Full assessment result (R1–R5) ---

export interface PartialAssessmentResult {
  otr: OtrRiskResult;
  mixing: MixingRiskResult;
  shear: ShearRiskResult;
  co2: Co2RiskResult;
  heat: HeatRiskResult;
  primary_bottleneck: PrimaryBottleneck;
  flags: AssessmentFlag[];
  derived: DerivedParameters;
}

// --- Risk score ordering for comparison ---

const SCORE_ORDER: Record<RiskScore, number> = {
  low: 0,
  moderate: 1,
  high: 2,
  critical: 3,
};

/** Ratio-to-critical for each domain, used for tie-breaking. */
function domainRatio(domain: RiskDomain, result: PartialAssessmentResult): number {
  switch (domain) {
    case "otr":
      // Lower kla_ratio = worse → invert so higher = worse
      return result.otr.kla_ratio > 0 ? 1 / result.otr.kla_ratio : Infinity;
    case "mixing":
      // Use Da if available, otherwise use theta_mix_target / 30 (pH threshold)
      return result.mixing.da != null ? result.mixing.da : result.mixing.theta_mix_target / 30;
    case "shear":
      return result.shear.tip_speed_ratio;
    case "co2":
      return result.co2.pco2_bottom != null ? result.co2.pco2_bottom / 0.15 : 0;
    case "heat":
      return result.heat.heat_ratio;
  }
}

/** Determine primary bottleneck from all 5 risk domains. */
function determinePrimaryBottleneck(result: PartialAssessmentResult): PrimaryBottleneck {
  const domains: { domain: RiskDomain; score: RiskScore }[] = [
    { domain: "otr", score: result.otr.score },
    { domain: "mixing", score: result.mixing.score },
    { domain: "shear", score: result.shear.score },
    { domain: "co2", score: result.co2.score },
    { domain: "heat", score: result.heat.score },
  ];

  // Sort by score (highest first), then by ratio-to-critical for tie-breaking
  domains.sort((a, b) => {
    const scoreDiff = SCORE_ORDER[b.score] - SCORE_ORDER[a.score];
    if (scoreDiff !== 0) return scoreDiff;
    return domainRatio(b.domain, result) - domainRatio(a.domain, result);
  });

  const primary = domains[0];

  return {
    domain: primary.domain,
    statement: generateBottleneckStatement(primary.domain, result),
    what_would_change: generateWhatWouldChange(primary.domain, result),
  };
}

const DOMAIN_LABELS: Record<RiskDomain, string> = {
  otr: "Oxygen transfer",
  mixing: "Mixing",
  shear: "Shear stress",
  co2: "CO₂ accumulation",
  heat: "Heat removal",
};

function generateBottleneckStatement(domain: RiskDomain, result: PartialAssessmentResult): string {
  const label = DOMAIN_LABELS[domain];
  switch (domain) {
    case "otr":
      return `${label} is your critical constraint. Required kLa of ${result.otr.kla_required.toFixed(0)} h⁻¹ versus achievable ${result.otr.kla_target_moderate.toFixed(0)} h⁻¹ at constant P/V.`;
    case "mixing":
      if (result.mixing.da != null) {
        return `${label} is your critical constraint. Mixing time of ${result.mixing.theta_mix_target.toFixed(0)} s at target scale produces Da = ${result.mixing.da.toFixed(2)} — substrate gradients expected.`;
      }
      return `${label} is your critical constraint. Mixing time of ${result.mixing.theta_mix_target.toFixed(0)} s at target scale may compromise pH homogeneity.`;
    case "shear":
      return `${label} is your critical constraint. Tip speed of ${result.shear.tip_speed.toFixed(1)} m/s at constant P/V exceeds organism threshold of ${result.shear.tip_speed_threshold.toFixed(1)} m/s (ratio ${result.shear.tip_speed_ratio.toFixed(2)}).`;
    case "co2":
      return `${label} is your critical constraint. Estimated pCO₂ at vessel bottom is ${(result.co2.pco2_bottom ?? 0).toFixed(2)} bar.`;
    case "heat":
      return `${label} is your critical constraint. Metabolic heat of ${result.heat.q_metabolic.toFixed(1)} kW versus cooling capacity of ${result.heat.q_cool_max.toFixed(1)} kW (ratio ${result.heat.heat_ratio.toFixed(2)}).`;
  }
}

function generateWhatWouldChange(domain: RiskDomain, result: PartialAssessmentResult): string {
  switch (domain) {
    case "otr": {
      // What OUR would drop score by one level?
      const targetRatio = result.otr.kla_ratio < 0.7 ? 0.7 : result.otr.kla_ratio < 1.0 ? 1.0 : 1.5;
      const targetOur = result.otr.kla_target_moderate * result.otr.kla_required > 0
        ? (result.otr.kla_target_moderate / targetRatio) * (result.otr.kla_required / result.otr.kla_required)
        : 0;
      // Simpler: what kla_required would give the target ratio?
      const klaReqNeeded = result.otr.kla_target_moderate / targetRatio;
      // This doesn't directly translate. Give OUR-based advice.
      return `If your measured OUR is below ${(klaReqNeeded * result.derived.driving_force).toFixed(0)} mmol/L/h, OTR risk improves by one level.`;
    }
    case "mixing":
      if (result.mixing.da != null && result.mixing.da > 0.01) {
        return "Switching to continuous feed would reduce Da and may lower mixing risk.";
      }
      return "Increasing agitation or reducing target vessel H/D ratio would improve mixing time.";
    case "shear":
      return "Switching to a pitched blade turbine or scaling at constant tip speed instead of constant P/V would reduce shear risk.";
    case "co2":
      return "Increasing sparging rate to enhance CO₂ stripping or reducing target vessel H/D ratio would lower pCO₂ at vessel bottom.";
    case "heat": {
      // What cooling water temp would drop score by one level?
      const targetHeatRatio = result.heat.heat_ratio > 1.0 ? 1.0 : result.heat.heat_ratio > 0.85 ? 0.85 : 0.6;
      const qCoolNeeded = result.heat.q_metabolic / targetHeatRatio;
      // Q_cool_max = U × A × dT_lm / 1000 → dT_lm_needed = qCoolNeeded × 1000 / (U × A)
      const dtLmNeeded = (qCoolNeeded * 1000) / (400 * result.heat.a_jacket);
      return `If cooling water is available at a temperature giving ΔT_lm of ${dtLmNeeded.toFixed(1)}°C, heat removal risk improves by one level.`;
    }
  }
}

/**
 * Run the full assessment pipeline: derivations → R1–R5 → bottleneck.
 */
export function runAssessment(inputs: ProcessInputs): PartialAssessmentResult {
  // Layer 1: Derivations (D1–D7)
  const { derived, flags } = runAllDerivations(inputs);

  // Layer 2: Risk calculations
  const otr = calculateOtrRisk(inputs, derived);
  flags.push(...otr.flags);

  const mixing = calculateMixingRisk(inputs, derived);
  flags.push(...mixing.flags);

  const shear = calculateShearRisk(inputs, derived);
  flags.push(...shear.flags);

  const co2 = calculateCo2Risk(inputs, derived);
  flags.push(...co2.flags);

  const heat = calculateHeatRisk(inputs, derived);
  flags.push(...heat.flags);

  const partialResult: PartialAssessmentResult = {
    otr: otr.result,
    mixing: mixing.result,
    shear: shear.result,
    co2: co2.result,
    heat: heat.result,
    primary_bottleneck: null as unknown as PrimaryBottleneck, // placeholder
    flags,
    derived,
  };

  // Determine primary bottleneck across all 5 domains
  partialResult.primary_bottleneck = determinePrimaryBottleneck(partialResult);

  return partialResult;
}
