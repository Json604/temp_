// Layer 1: Parameter Derivation (D1–D7)
// Per /docs/lemnisca_scaleup_app_dev_spec.md Section 2.1

import type {
  ProcessInputs,
  DerivedParameters,
  VesselGeometry,
  OurMode,
} from "@/lib/types";

import {
  QO2_RANGES,
  CDW_OD_FACTORS,
  IMPELLER_CONSTANTS,
  VISCOSITY_TABLE,
  C_STAR_TABLE,
  MOLAR_VOLUME_STP,
  RHO,
  PV_LOW_SANITY,
  PV_HIGH_SANITY,
  VVM_VALID_LOW,
  VVM_VALID_HIGH,
  interpolateTable,
} from "@/lib/constants";

import type { AssessmentFlag } from "@/lib/types";

// --- D7: OD600 → CDW Conversion ---

export function deriveBiomassCdw(inputs: ProcessInputs): number {
  if (inputs.biomass_unit === "OD600") {
    const factor = CDW_OD_FACTORS[inputs.organism_species];
    return inputs.biomass * factor;
  }
  return inputs.biomass;
}

// --- D1: OUR Derivation ---

export interface OurResult {
  our_peak: number;
  our_min?: number;
  our_max?: number;
}

export function deriveOur(inputs: ProcessInputs, biomass_cdw: number): OurResult {
  const mode: OurMode = inputs.our_mode;

  if (mode === "measured") {
    return { our_peak: inputs.our_measured! };
  }

  if (mode === "exhaust_gas") {
    const o2_inlet = inputs.o2_inlet ?? 20.9;
    const o2_outlet = inputs.o2_outlet!;
    const gas_flow = inputs.gas_flow!;

    // Convert gas_flow from L/min to m³/s
    const gas_flow_m3s = gas_flow / (1000 * 60);

    // OUR = (o2_inlet/100 - o2_outlet/100) × gas_flow_m3s × (1/22.4e-3) × (1000 / v_lab)
    // 1/22.4e-3 = 1000/22.4
    const our_peak =
      (o2_inlet / 100 - o2_outlet / 100) *
      gas_flow_m3s *
      (1000 / MOLAR_VOLUME_STP) *
      (1000 / inputs.v_lab);

    return { our_peak };
  }

  // estimate mode
  const qo2 = QO2_RANGES[inputs.organism_species];
  return {
    our_peak: qo2.qo2_midpoint * biomass_cdw,
    our_min: qo2.qo2_min * biomass_cdw,
    our_max: qo2.qo2_max * biomass_cdw,
  };
}

// --- D2: Vessel Geometry ---

export function deriveVesselGeometry(
  volume_litres: number,
  h_d: number,
  impeller_type: ProcessInputs["impeller_type"],
): VesselGeometry {
  const volume_m3 = volume_litres / 1000;
  const t_diameter = Math.pow((4 * volume_m3) / (Math.PI * h_d), 1 / 3);
  const h_liquid = h_d * t_diameter;
  const d_t_ratio = IMPELLER_CONSTANTS[impeller_type].d_t_ratio;
  const d_imp = d_t_ratio * t_diameter;
  const a_cross = (Math.PI / 4) * t_diameter * t_diameter;

  return {
    t_diameter,
    h_liquid,
    d_imp,
    a_cross,
    volume_m3,
  };
}

// --- D3: Power Input ---

export interface PowerResult {
  n_rps: number;
  p_ungassed: number;
  p_gassed: number;
  p_total: number;
  pv_lab: number;
}

export function derivePowerInput(
  inputs: ProcessInputs,
  lab_geometry: VesselGeometry,
): PowerResult {
  const impeller = IMPELLER_CONSTANTS[inputs.impeller_type];
  const n_rps = inputs.rpm / 60;
  const d_imp = lab_geometry.d_imp;

  const p_ungassed =
    impeller.np * RHO * Math.pow(n_rps, 3) * Math.pow(d_imp, 5);
  const p_gassed = impeller.pg_p_factor * p_ungassed;
  const p_total = inputs.n_impellers * p_gassed;
  const pv_lab = p_total / lab_geometry.volume_m3;

  return { n_rps, p_ungassed, p_gassed, p_total, pv_lab };
}

/** Check Pg/P validity and P/V sanity, returning flags. */
export function derivePowerFlags(
  inputs: ProcessInputs,
  pv_lab: number,
): AssessmentFlag[] {
  const flags: AssessmentFlag[] = [];

  // Pg/P validity flag
  if (inputs.vvm > VVM_VALID_HIGH || inputs.vvm < VVM_VALID_LOW) {
    flags.push({
      message:
        "Gassed power correction carries additional uncertainty outside VVM 0.5–2.0 range.",
    });
  }

  // P/V sanity check across all three scenarios
  const pv_conservative = 0.5 * pv_lab;
  const pv_moderate = 1.0 * pv_lab;
  const pv_aggressive = 2.0 * pv_lab;

  const allBelow =
    pv_conservative < PV_LOW_SANITY &&
    pv_moderate < PV_LOW_SANITY &&
    pv_aggressive < PV_LOW_SANITY;
  const allAbove =
    pv_conservative > PV_HIGH_SANITY &&
    pv_moderate > PV_HIGH_SANITY &&
    pv_aggressive > PV_HIGH_SANITY;

  if (allBelow || allAbove) {
    flags.push({
      message: "Atypical operating envelope — verify inputs.",
    });
  }

  return flags;
}

// --- D4: Reynolds Number ---

export type FlowRegime = "turbulent" | "transitional" | "laminar";

export interface ReynoldsResult {
  re: number;
  regime: FlowRegime;
}

export function deriveReynolds(
  n_rps: number,
  d_imp: number,
  mu: number,
): ReynoldsResult {
  const re = (RHO * n_rps * d_imp * d_imp) / mu;

  let regime: FlowRegime;
  if (re > 10000) {
    regime = "turbulent";
  } else if (re >= 1000) {
    regime = "transitional";
  } else {
    regime = "laminar";
  }

  return { re, regime };
}

export function deriveReynoldsFlags(regime: FlowRegime): AssessmentFlag[] {
  const flags: AssessmentFlag[] = [];
  if (regime === "transitional") {
    flags.push({
      message:
        "Transitional flow regime — power number assumption may not hold.",
    });
  } else if (regime === "laminar") {
    flags.push({
      message: "Laminar flow — correlations invalid.",
    });
  }
  return flags;
}

// --- D5: Superficial Gas Velocity ---

export interface GasVelocityResult {
  q_gas: number; // m³/s
  vs: number;    // m/s
}

export function deriveGasVelocity(
  vvm: number,
  volume_litres: number,
  a_cross: number,
): GasVelocityResult {
  // Q_gas = (vvm × V_working_litres) / (1000 × 60)   in m³/s
  const q_gas = (vvm * volume_litres) / (1000 * 60);
  const vs = q_gas / a_cross;
  return { q_gas, vs };
}

// --- D6: C* and Driving Force ---

export interface DrivingForceResult {
  c_star: number;
  c_l: number;
  driving_force: number;
}

export function deriveDrivingForce(
  temperature: number,
  do_setpoint: number,
): DrivingForceResult {
  const c_star = interpolateTable(C_STAR_TABLE, temperature);
  const c_l = (do_setpoint / 100) * c_star;
  const driving_force = c_star - c_l;
  return { c_star, c_l, driving_force };
}

// --- Top-level: Run All Derivations ---

export interface DerivationOutput {
  derived: DerivedParameters;
  flags: AssessmentFlag[];
}

export function runAllDerivations(inputs: ProcessInputs): DerivationOutput {
  const flags: AssessmentFlag[] = [];

  // D7 — Biomass conversion (run first as D1 depends on CDW)
  const biomass_cdw = deriveBiomassCdw(inputs);

  // D1 — OUR
  const our = deriveOur(inputs, biomass_cdw);

  // D2 — Vessel geometry
  const lab_geometry = deriveVesselGeometry(
    inputs.v_lab,
    inputs.h_d_lab,
    inputs.impeller_type,
  );
  const target_geometry = deriveVesselGeometry(
    inputs.v_target,
    inputs.h_d_target,
    inputs.impeller_type,
  );

  // D3 — Power input
  const power = derivePowerInput(inputs, lab_geometry);
  flags.push(...derivePowerFlags(inputs, power.pv_lab));

  // Viscosity interpolation
  const mu = interpolateTable(VISCOSITY_TABLE, inputs.temperature);

  // D4 — Reynolds number
  const reynolds = deriveReynolds(power.n_rps, lab_geometry.d_imp, mu);
  flags.push(...deriveReynoldsFlags(reynolds.regime));

  // D5 — Superficial gas velocity (lab and target)
  const gasLab = deriveGasVelocity(
    inputs.vvm,
    inputs.v_lab,
    lab_geometry.a_cross,
  );
  const gasTarget = deriveGasVelocity(
    inputs.vvm,
    inputs.v_target,
    target_geometry.a_cross,
  );

  // D6 — C* and driving force
  const df = deriveDrivingForce(inputs.temperature, inputs.do_setpoint);

  const derived: DerivedParameters = {
    // D1
    our_peak: our.our_peak,
    our_min: our.our_min,
    our_max: our.our_max,

    // D2
    lab_geometry,
    target_geometry,

    // D3
    n_rps: power.n_rps,
    p_ungassed: power.p_ungassed,
    p_gassed: power.p_gassed,
    p_total: power.p_total,
    pv_lab: power.pv_lab,

    // D4
    re: reynolds.re,

    // D5
    q_gas_lab: gasLab.q_gas,
    vs_lab: gasLab.vs,
    q_gas_target: gasTarget.q_gas,
    vs_target: gasTarget.vs,

    // D6
    c_star: df.c_star,
    c_l: df.c_l,
    driving_force: df.driving_force,

    // D7
    biomass_cdw,

    // Viscosity
    mu,
  };

  return { derived, flags };
}
