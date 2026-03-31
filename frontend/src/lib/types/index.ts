// TypeScript interfaces for Lemnisca Fermentation Scale-Up Risk Predictor
// All field IDs and structures per /docs/lemnisca_scaleup_app_dev_spec.md

// --- Enums and Literal Types ---

export type OrganismClass = "bacteria" | "yeast";

export type OrganismSpecies =
  | "e_coli"
  | "b_subtilis"
  | "s_cerevisiae"
  | "p_pastoris"
  | "other_bacteria"
  | "other_yeast";

export type ProcessType = "batch" | "fed_batch";

export type ImpellerType = "rushton" | "pitched_blade" | "marine" | "unknown";

export type BiomassUnit = "g_L_CDW" | "OD600";

export type OurMode = "measured" | "estimate" | "exhaust_gas";

export type FeedFrequency = "continuous" | "1_10min" | "10_30min" | "30plus_min";

export type RiskScore = "low" | "moderate" | "high" | "critical";

export type Confidence = "high_confidence" | "reliable" | "directional";

// --- Input Parameters (Section 1.1) ---

export interface ProcessInputs {
  // Section A: Process Identity
  organism_class: OrganismClass;
  organism_species: OrganismSpecies;
  process_type: ProcessType;

  // Section B: Scale Definition
  v_lab: number;        // Lab working volume (L), > 0, <= 1000
  v_target: number;     // Target working volume (L), > v_lab

  // Section C: Vessel & Agitation
  vessel_model?: string;            // Lab vessel brand/model (optional)
  h_d_lab: number;                  // H/D ratio (lab), default 1.2, range 0.5–4.0
  h_d_target: number;               // H/D ratio (target), range 0.5–4.0
  n_impellers: number;              // Number of impellers (target), 1–4
  impeller_type: ImpellerType;      // Default: rushton
  rpm: number;                      // Agitation at peak demand (RPM), > 0, <= 3000
  vvm: number;                      // Airflow at peak demand (VVM), default 1.0, 0.1–5.0

  // Section D: Process Characterisation
  biomass: number;                  // Peak biomass, > 0, <= 200
  biomass_unit: BiomassUnit;        // Default: g_L_CDW
  our_mode: OurMode;                // OUR input mode, default: estimate
  our_measured?: number;            // OUR measured value (mmol/L/h), required if our_mode == measured
  o2_inlet?: number;                // Exhaust gas inlet O2 (%), default 20.9
  o2_outlet?: number;               // Exhaust gas outlet O2 (%)
  gas_flow?: number;                // Exhaust gas flow rate (L/min)
  do_setpoint: number;              // DO setpoint (%), default 30, 0–100
  temperature: number;              // Process temperature (°C), 15–55
  t_cw_inlet: number;               // Cooling water inlet temp (°C), default 12, 0–40

  // Section E: Fed-batch Parameters (visible when process_type == fed_batch)
  feed_frequency?: FeedFrequency;
  feed_interval_seconds?: number;   // Optional numeric override, > 0
}

// --- Derived Parameters (Section 2.1, D1–D7) ---

export interface VesselGeometry {
  t_diameter: number;    // Tank diameter (m)
  h_liquid: number;      // Liquid height (m)
  d_imp: number;         // Impeller diameter (m)
  a_cross: number;       // Cross-sectional area (m²)
  volume_m3: number;     // Working volume (m³)
}

export interface DerivedParameters {
  // D1 — OUR derivation
  our_peak: number;               // mmol/L/h
  our_min?: number;               // mmol/L/h (only when our_mode == estimate)
  our_max?: number;               // mmol/L/h (only when our_mode == estimate)

  // D2 — Vessel geometry
  lab_geometry: VesselGeometry;
  target_geometry: VesselGeometry;

  // D3 — Power input
  n_rps: number;                  // Revolutions per second
  p_ungassed: number;             // Ungassed power (W)
  p_gassed: number;               // Gassed power per impeller (W)
  p_total: number;                // Total gassed power (W)
  pv_lab: number;                 // P/V at lab scale (W/m³)

  // D4 — Reynolds number
  re: number;                     // Reynolds number (dimensionless)

  // D5 — Superficial gas velocity
  q_gas_lab: number;              // Gas flow rate at lab (m³/s)
  vs_lab: number;                 // Superficial gas velocity at lab (m/s)
  q_gas_target: number;           // Gas flow rate at target (m³/s)
  vs_target: number;              // Superficial gas velocity at target (m/s)

  // D6 — C* and driving force
  c_star: number;                 // O₂ saturation concentration (mmol/L)
  c_l: number;                    // Dissolved O₂ at setpoint (mmol/L)
  driving_force: number;          // c_star - c_l (mmol/L)

  // D7 — Biomass conversion
  biomass_cdw: number;            // Biomass in g/L CDW (converted if OD600)

  // Viscosity at process temperature
  mu: number;                     // Dynamic viscosity (Pa·s)
}

// --- Risk Domain Results (Section 2.2) ---

export interface OtrRiskResult {
  score: RiskScore;
  kla_required: number;                     // h⁻¹
  kla_lab: number;                          // h⁻¹ (achievable at lab)
  kla_target_conservative: number;          // h⁻¹ (0.5× P/V)
  kla_target_moderate: number;              // h⁻¹ (1.0× P/V)
  kla_target_aggressive: number;            // h⁻¹ (2.0× P/V)
  kla_ratio: number;                        // achievable / required (moderate scenario)
  pv_conservative: number;                  // W/m³
  pv_moderate: number;                      // W/m³
  pv_aggressive: number;                    // W/m³
  confidence: Confidence;
  driver: string;
}

export interface MixingRiskResult {
  score: RiskScore;
  theta_mix_lab: number;                    // Lab mixing time (s)
  theta_mix_target: number;                 // Target mixing time (s)
  da?: number;                              // Damköhler number (fed-batch only)
  da_score?: RiskScore;                     // Da-based score (fed-batch only)
  ph_score: RiskScore;                      // pH control score
  confidence: Confidence;
  driver: string;
}

export interface ShearRiskResult {
  score: RiskScore;
  n_target: number;                         // Target impeller speed (rev/s)
  tip_speed: number;                        // Tip speed at target (m/s)
  tip_speed_threshold: number;              // Organism threshold (m/s)
  tip_speed_ratio: number;                  // tip_speed / threshold
  confidence: Confidence;
  driver: string;
}

export interface Co2RiskResult {
  score: RiskScore;
  activated: boolean;                       // Whether detailed calc was triggered
  cer?: number;                             // CO₂ evolution rate (mmol/L/h)
  kla_co2?: number;                         // kLa for CO₂ (h⁻¹)
  pco2_bulk?: number;                       // Bulk pCO₂ (bar)
  pco2_bottom?: number;                     // pCO₂ at vessel bottom (bar)
  dp_hydro?: number;                        // Hydrostatic pressure (Pa)
  confidence: Confidence;
  driver: string;
}

export interface HeatRiskResult {
  score: RiskScore;
  q_metabolic: number;                      // Metabolic heat generation (kW)
  a_jacket: number;                         // Jacket surface area (m²)
  dt_lm: number;                            // Log-mean temperature difference (K)
  q_cool_max: number;                       // Maximum cooling capacity (kW)
  heat_ratio: number;                       // Q_metabolic / Q_cool_max
  confidence: Confidence;
  driver: string;
}

// --- Primary Bottleneck (Section 2.3) ---

export type RiskDomain = "otr" | "mixing" | "shear" | "co2" | "heat";

export interface PrimaryBottleneck {
  domain: RiskDomain;
  statement: string;                        // Plain-language bottleneck sentence
  what_would_change: string;                // Actionable input change suggestion
}

// --- Overall Assessment Result (Section 6) ---

export interface AssessmentResults {
  otr: OtrRiskResult;
  mixing: MixingRiskResult;
  shear: ShearRiskResult;
  co2: Co2RiskResult;
  heat: HeatRiskResult;
  primary_bottleneck: PrimaryBottleneck;
  overall_confidence: Confidence;
}

// --- Flag (soft warnings, Section 3.2) ---

export interface AssessmentFlag {
  domain?: RiskDomain;                      // Which domain the flag relates to (optional)
  message: string;                          // Warning message text
}

// --- Full Assessment (Section 6 Data Model) ---

export interface Assessment {
  id: string;                               // UUID
  user_id: string;                          // UUID
  created_at: string;                       // ISO timestamp
  inputs: ProcessInputs;
  derived: DerivedParameters;
  results: AssessmentResults;
  report_id: string | null;
  flags: AssessmentFlag[];
}

// --- Estimation Transparency (Section 1.4) ---

export interface EstimationTransparency {
  parameters_entered: number;
  parameters_total: number;
  estimated_count: number;
  confidence_label: Confidence;
}
