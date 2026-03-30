// All organism defaults, thresholds, and lookup tables.
// Every value from /docs/lemnisca_scaleup_app_dev_spec.md Sections 1.3 and 7.

import type {
  OrganismSpecies,
  ImpellerType,
  FeedFrequency,
} from "@/lib/types";

// --- qO₂ Ranges (mmol O₂ / g CDW / h) — Section 1.3 ---

export interface QO2Range {
  qo2_min: number;
  qo2_max: number;
  qo2_midpoint: number;
}

// P. pastoris has two metabolic phases; the main table uses glycerol defaults.
// Methanol-phase values are exported separately.
export const QO2_RANGES: Record<OrganismSpecies, QO2Range> = {
  e_coli:         { qo2_min: 5.0,  qo2_max: 15.0, qo2_midpoint: 8.0  },
  b_subtilis:     { qo2_min: 3.0,  qo2_max: 8.0,  qo2_midpoint: 5.5  },
  s_cerevisiae:   { qo2_min: 2.0,  qo2_max: 6.0,  qo2_midpoint: 3.5  },
  p_pastoris:     { qo2_min: 3.0,  qo2_max: 8.0,  qo2_midpoint: 5.0  },  // glycerol phase
  other_bacteria: { qo2_min: 3.0,  qo2_max: 10.0, qo2_midpoint: 6.0  },
  other_yeast:    { qo2_min: 2.0,  qo2_max: 7.0,  qo2_midpoint: 4.0  },
};

export const QO2_P_PASTORIS_METHANOL: QO2Range = {
  qo2_min: 8.0,
  qo2_max: 20.0,
  qo2_midpoint: 13.0,
};

// --- Shear Tip Speed Thresholds (m/s) — Section 1.3 ---

export const TIP_SPEED_THRESHOLDS: Record<OrganismSpecies, number> = {
  e_coli:         8.0,
  b_subtilis:     7.0,
  s_cerevisiae:   5.0,
  p_pastoris:     4.0,
  other_bacteria: 7.0,
  other_yeast:    5.0,
};

// --- RQ Defaults — Section 1.3 ---

export const RQ_DEFAULTS = {
  bacteria_aerobic: 1.0,
  s_cerevisiae_aerobic: 1.0,
  s_cerevisiae_mixed: 1.1,
  p_pastoris_methanol: 0.67,
} as const;

// --- CDW/OD600 Conversion Factors (g/L per OD unit) — Section 1.3 ---

export const CDW_OD_FACTORS: Record<OrganismSpecies, number> = {
  e_coli:         0.37,
  b_subtilis:     0.36,
  s_cerevisiae:   0.40,
  p_pastoris:     0.38,
  other_bacteria: 0.38,
  other_yeast:    0.38,
};

// --- Impeller Constants — Section 1.3 ---

export interface ImpellerConstants {
  np: number;            // Power number (Np)
  pg_p_factor: number;   // Gassed/ungassed power ratio (Pg/P)
  d_t_ratio: number;     // Impeller-to-tank diameter ratio (d/T)
}

export const IMPELLER_CONSTANTS: Record<ImpellerType, ImpellerConstants> = {
  rushton:        { np: 5.0,  pg_p_factor: 0.60, d_t_ratio: 0.33 },
  pitched_blade:  { np: 1.5,  pg_p_factor: 0.80, d_t_ratio: 0.33 },
  marine:         { np: 0.35, pg_p_factor: 0.85, d_t_ratio: 0.40 },
  unknown:        { np: 5.0,  pg_p_factor: 0.60, d_t_ratio: 0.33 },
};

// --- Feed Frequency → τ_feed Mapping (seconds) — Section 1.3 ---

export const FEED_TAU_MAP: Record<FeedFrequency, number> = {
  continuous:  10,
  "1_10min":   60,
  "10_30min":  900,
  "30plus_min": 2400,
};

// --- Viscosity at Process Temperature (Pa·s) — Section 1.3 ---
// Interpolate linearly between table values.

export interface LookupPoint {
  temperature: number;  // °C
  value: number;
}

export const VISCOSITY_TABLE: LookupPoint[] = [
  { temperature: 20, value: 0.00100 },
  { temperature: 25, value: 0.00089 },
  { temperature: 30, value: 0.00080 },
  { temperature: 37, value: 0.00069 },
  { temperature: 42, value: 0.00062 },
];

// --- Oxygen Saturation Concentration C* (mmol/L, air, 1 atm) — Section 1.3 ---
// Interpolate linearly between table values.

export const C_STAR_TABLE: LookupPoint[] = [
  { temperature: 20, value: 0.276 },
  { temperature: 25, value: 0.258 },
  { temperature: 30, value: 0.237 },
  { temperature: 35, value: 0.213 },
  { temperature: 37, value: 0.204 },
  { temperature: 42, value: 0.186 },
];

// --- Linear interpolation helper ---

export function interpolateTable(table: LookupPoint[], temperature: number): number {
  if (temperature <= table[0].temperature) {
    return table[0].value;
  }
  if (temperature >= table[table.length - 1].temperature) {
    return table[table.length - 1].value;
  }
  for (let i = 0; i < table.length - 1; i++) {
    const t0 = table[i].temperature;
    const t1 = table[i + 1].temperature;
    if (temperature >= t0 && temperature <= t1) {
      const fraction = (temperature - t0) / (t1 - t0);
      return table[i].value + fraction * (table[i + 1].value - table[i].value);
    }
  }
  return table[table.length - 1].value;
}

// --- Hardcoded Constants (Section 7) ---

/** Broth density (kg/m³) — used in D3, D4, R2, R4, R5 */
export const RHO = 1000;

/** Gravitational acceleration (m/s²) — used in R4 */
export const G = 9.81;

/** Van't Riet coalescing correlation coefficient — used in R1 */
export const VANT_RIET_COALESCING_COEFFICIENT = 0.026;

/** Van't Riet coalescing P/V exponent — used in R1 */
export const VANT_RIET_COALESCING_PV_EXPONENT = 0.4;

/** Van't Riet coalescing Vs exponent — used in R1 */
export const VANT_RIET_COALESCING_VS_EXPONENT = 0.5;

/** Van't Riet non-coalescing correlation coefficient — used in R1 (informational) */
export const VANT_RIET_NON_COALESCING_COEFFICIENT = 0.002;

/** Van't Riet non-coalescing P/V exponent — used in R1 (informational) */
export const VANT_RIET_NON_COALESCING_PV_EXPONENT = 0.7;

/** Van't Riet non-coalescing Vs exponent — used in R1 (informational) */
export const VANT_RIET_NON_COALESCING_VS_EXPONENT = 0.2;

/** Ruszkowski constant — used in R2 */
export const RUSZKOWSKI_CONSTANT = 5.9;

/** kLa_CO₂ / kLa_O₂ ratio — used in R4 */
export const KLA_CO2_O2_RATIO = 0.9;

/** Henry's constant for CO₂ in water (~30°C) (mol/L/atm) — used in R4 */
export const H_CO2 = 0.034;

/** CO₂ inhibitory threshold (bar) — used in R4 scoring */
export const CO2_INHIBITORY_THRESHOLD = 0.15;

/** Metabolic heat factor (kW per (mmol/L/h) per m³) — used in R5 */
export const METABOLIC_HEAT_FACTOR = 0.46;

/** Jacket heat transfer coefficient (W/m²·K) — used in R5 */
export const U_JACKET = 400;

/** Cooling water outlet temperature offset (°C) — used in R5 */
export const T_CW_OUTLET_OFFSET = 10;

/** CO₂ activation biomass threshold (g/L CDW) — used in R4 */
export const CO2_BIOMASS_THRESHOLD = 20;

/** CO₂ activation OUR threshold (mmol/L/h) — used in R4 */
export const CO2_OUR_THRESHOLD = 30;

/** P/V low sanity bound (W/m³) — used in D3 flag */
export const PV_LOW_SANITY = 500;

/** P/V high sanity bound (W/m³) — used in D3 flag */
export const PV_HIGH_SANITY = 8000;

/** Atmospheric pressure (Pa) — used in R4, D6 */
export const ATMOSPHERIC_PRESSURE_PA = 101325;

/** Atmospheric pressure (atm) — used in R4 */
export const ATMOSPHERIC_PRESSURE_ATM = 1;

// --- Risk Scoring Thresholds — Section 2.2 ---

/** OTR kLa ratio thresholds (achievable / required) */
export const OTR_THRESHOLDS = {
  low: 1.5,        // ratio > 1.5 → low
  moderate: 1.0,   // ratio 1.0–1.5 → moderate
  high: 0.7,       // ratio 0.7–1.0 → high
  // below 0.7 → critical
} as const;

/** Mixing Damköhler number thresholds */
export const DA_THRESHOLDS = {
  low: 0.01,       // Da < 0.01 → low
  moderate: 0.1,   // Da 0.01–0.1 → moderate
  high: 1.0,       // Da 0.1–1.0 → high
  // above 1.0 → critical
} as const;

/** pH control mixing time thresholds (seconds) */
export const PH_MIX_THRESHOLDS = {
  low: 30,         // θ_mix < 30 s → low
  moderate: 60,    // θ_mix 30–60 s → moderate
  // above 60 s → high
} as const;

/** Shear tip speed ratio thresholds (v_tip / organism threshold) */
export const SHEAR_THRESHOLDS = {
  low: 0.7,        // ratio < 0.7 → low
  moderate: 1.0,   // ratio 0.7–1.0 → moderate
  high: 1.3,       // ratio 1.0–1.3 → high
  // above 1.3 → critical
} as const;

/** CO₂ pCO₂ at vessel bottom thresholds (bar) */
export const CO2_THRESHOLDS = {
  low: 0.08,       // pCO₂ < 0.08 → low
  moderate: 0.15,  // pCO₂ 0.08–0.15 → moderate
  high: 0.25,      // pCO₂ 0.15–0.25 → high
  // above 0.25 → critical
} as const;

/** Heat removal ratio thresholds (Q_metabolic / Q_cool_max) */
export const HEAT_THRESHOLDS = {
  low: 0.60,       // ratio < 0.60 → low
  moderate: 0.85,  // ratio 0.60–0.85 → moderate
  high: 1.0,       // ratio 0.85–1.00 → high
  // above 1.00 → critical
} as const;

// --- P/V Scenario Multipliers — Section 2.2 R1 ---

export const PV_SCENARIO_MULTIPLIERS = {
  conservative: 0.5,
  moderate: 1.0,
  aggressive: 2.0,
} as const;

// --- Risk Score Colour Codes — Section 4.3 ---

export const RISK_COLOURS = {
  low: "#27AE60",
  moderate: "#F39C12",
  high: "#E67E22",
  critical: "#C0392B",
} as const;

// --- Molar Volume (L/mol at STP) — used in exhaust gas OUR calc ---

export const MOLAR_VOLUME_STP = 22.4;

// --- VVM validity range for Pg/P flag — Section 2.1 D3 ---

export const VVM_VALID_LOW = 0.3;
export const VVM_VALID_HIGH = 2.0;

// --- Default input values — Section 1.1 ---

export const INPUT_DEFAULTS = {
  h_d_lab: 1.2,
  impeller_type: "rushton" as ImpellerType,
  vvm: 1.0,
  biomass_unit: "g_L_CDW" as const,
  our_mode: "estimate" as const,
  o2_inlet: 20.9,
  do_setpoint: 30,
  temperature_bacteria: 37,
  temperature_yeast: 30,
  t_cw_inlet: 12,
} as const;
