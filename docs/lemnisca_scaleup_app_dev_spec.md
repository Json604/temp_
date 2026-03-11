# Lemnisca — Fermentation Scale-Up Risk Predictor

## Development Specification v2.0

**What this is:** A web application that takes lab-scale fermentation process data and produces a structured engineering risk assessment across five physical domains (oxygen transfer, mixing, shear, CO₂ accumulation, heat removal) for scale-up to pilot or production scale.

**Scope:** Bacterial and yeast fermentation in standard stirred-tank reactors (STR). Batch and fed-batch processes. Newtonian broths only.

**Language:** All UI copy, reports, and user-facing text in British English.

---

## Sprint Plan

| Sprint | Deliverable | Acceptance Criteria |
|--------|-------------|-------------------|
| **1** | Input form (all sections, open layout) + OTR calculation (R1) + Mixing calculation (R2) + basic results display. Includes: multi-impeller P/V correction, Pg/P validity notes, P/V sanity check. | User can enter lab parameters and see OTR and mixing risk scores with supporting numbers. Multi-impeller correction functional. All input validation working. |
| **2** | Shear (R3) + CO₂ (R4) + Heat removal (R5) + estimation scaffolding + organism-specific defaults + numeric feed interval override + dynamic cooling water ΔT_lm + H/D > 1.5 warnings. | All five risk domains calculated. Estimated values visually distinct. Organism thresholds applied. Feed interval numeric override functional. |
| **3** | Company email authentication + PDF report generation (4 pages) + 90-day report persistence + pre-filled example assessment + "What would change this?" micro-section. **This sprint = launch.** | Auth working. Reports persist 90 days with unique URL. Example assessment visible without login. Tool deployable to real users. |
| **v1.1** | Assumption transparency layer + scale-up strategy comparison table + mitigation detail panels + UC2 (post-failure comparative mode). Target: 4–6 weeks post-launch. | Full assumption drill-down operational. UC2 functional end-to-end. Strategy comparison table with 4 criteria. |

---

## 1. Input Specification

### 1.1 All Input Parameters

| Parameter | ID | Type | Default | Required | Validation | Notes |
|-----------|-----|------|---------|----------|------------|-------|
| Organism class | `organism_class` | Toggle | — | Yes | `bacteria` or `yeast` | Configures qO₂ range, shear thresholds, archetype weighting |
| Organism species | `organism_species` | Dropdown | — | Yes | One of: `e_coli`, `b_subtilis`, `s_cerevisiae`, `p_pastoris`, `other_bacteria`, `other_yeast` | |
| Process type | `process_type` | Toggle | — | Yes | `batch` or `fed_batch` | Fed-batch activates Section E |
| Lab working volume | `v_lab` | Number (L) | — | Yes | > 0, ≤ 1000 | |
| Target working volume | `v_target` | Number (L) | — | Yes | > `v_lab` | Show scale ratio = `v_target / v_lab` immediately on entry |
| Lab vessel brand/model | `vessel_model` | Dropdown | Generic STR | No | From vessel database | Auto-populates `h_d_lab` and `d_t_ratio` if known vessel |
| H/D ratio (lab) | `h_d_lab` | Number | 1.2 | No | 0.5–4.0 | |
| H/D ratio (target) | `h_d_target` | Number | Auto-inferred from `v_target` | No | 0.5–4.0 | Show warning when > 1.5 |
| Number of impellers (target) | `n_impellers` | Integer selector (1–4) | Auto: 1 if H/D ≤ 1.5, 2 if H/D > 1.5, 3 if H/D > 2.5 | No | 1–4 | Scales P by `n_impellers` |
| Impeller type | `impeller_type` | Visual selector | `rushton` | No | `rushton`, `pitched_blade`, `marine`, `unknown` | Icons for visual recognition |
| Agitation at peak demand | `rpm` | Number (RPM) | — | Yes | > 0, ≤ 3000 | Label: "at your highest-demand operating point" |
| Airflow at peak demand | `vvm` | Number (VVM) | 1.0 | No | 0.1–5.0 | |
| Peak biomass | `biomass` | Number | — | Yes | > 0, ≤ 200 | With unit toggle: `g_L_CDW` or `OD600` |
| Biomass unit | `biomass_unit` | Toggle | `g_L_CDW` | Yes | `g_L_CDW` or `OD600` | Auto-convert OD600 → CDW using organism factor |
| OUR at peak | `our_mode` | 3-way selector | `estimate` | Yes | `measured`, `estimate`, `exhaust_gas` | See Section 1.2 |
| OUR measured value | `our_measured` | Number (mmol/L/h) | — | If `our_mode == measured` | > 0, ≤ 500 | |
| Exhaust gas: inlet O₂% | `o2_inlet` | Number (%) | 20.9 | If `our_mode == exhaust_gas` | 0–100 | |
| Exhaust gas: outlet O₂% | `o2_outlet` | Number (%) | — | If `our_mode == exhaust_gas` | 0–`o2_inlet` | |
| Exhaust gas: flow rate | `gas_flow` | Number (L/min) | — | If `our_mode == exhaust_gas` | > 0 | |
| DO setpoint | `do_setpoint` | Slider + numeric (%) | 30 | No | 0–100 | |
| Process temperature | `temperature` | Number (°C) | 37 (bacteria) / 30 (yeast) | No | 15–55 | |
| Feed frequency | `feed_frequency` | 4-option selector | — | If `process_type == fed_batch` | `continuous`, `1_10min`, `10_30min`, `30plus_min` | |
| Feed interval override | `feed_interval_seconds` | Number (seconds) | — | No | > 0 | Optional numeric override below selector; when provided, used directly as τ_feed |
| Cooling water inlet temp | `t_cw_inlet` | Number (°C) | 12 | No | 0–40 | Dynamic ΔT_lm computed from this |

### 1.2 OUR 3-Way Selector Logic

**Mode: `measured`**
- Input: `our_measured` (mmol/L/h)
- Confidence: `high_confidence`
- Display: value as entered, marked "User-provided"

**Mode: `estimate`**
- Derive: `our_peak = qo2_midpoint × biomass_cdw`
- Show range **inline immediately**: `our_min = qo2_min × biomass_cdw` to `our_max = qo2_max × biomass_cdw`
- Display example: "OUR estimated: 45–135 mmol/L/h (based on E. coli qO₂ range 5–15 mmol/g/h × your 9 g/L biomass)"
- User can override the estimate value
- Confidence: `directional`

**Mode: `exhaust_gas`**
- Calculate: OUR from O₂ mass balance = `(o2_inlet/100 - o2_outlet/100) × gas_flow × 60 / (22.4 × v_lab / 1000)`
- Confidence: `high_confidence`
- Display: calculated value, marked "Calculated from exhaust gas data"

### 1.3 Organism-Specific Default Tables

#### qO₂ Ranges (mmol O₂ / g CDW / h)

| `organism_species` | `qo2_min` | `qo2_max` | `qo2_midpoint` | Notes |
|--------------------|-----------|-----------|-----------------|-------|
| `e_coli` | 5.0 | 15.0 | 8.0 | Midpoint 8.0 for fed-batch (not 9.0) |
| `b_subtilis` | 3.0 | 8.0 | 5.5 | |
| `s_cerevisiae` | 2.0 | 6.0 | 3.5 | |
| `p_pastoris_glycerol` | 3.0 | 8.0 | 5.0 | When `organism_species == p_pastoris`, use glycerol-phase defaults unless methanol mode detected |
| `p_pastoris_methanol` | 8.0 | 20.0 | 13.0 | |
| `other_bacteria` | 3.0 | 10.0 | 6.0 | |
| `other_yeast` | 2.0 | 7.0 | 4.0 | |

#### Shear Tip Speed Thresholds (m/s)

| `organism_species` | `tip_speed_max` |
|--------------------|-----------------|
| `e_coli` | 8.0 |
| `b_subtilis` | 7.0 |
| `s_cerevisiae` | 5.0 |
| `p_pastoris` | 4.0 |
| `other_bacteria` | 7.0 |
| `other_yeast` | 5.0 |

#### RQ Defaults

| Condition | `rq` |
|-----------|------|
| Bacteria aerobic | 1.0 |
| S. cerevisiae fully aerobic | 1.0 |
| S. cerevisiae mixed | 1.1 |
| P. pastoris methanol phase | **0.67** |

#### CDW/OD600 Conversion Factors (g/L per OD unit)

| `organism_species` | `cdw_od_factor` |
|--------------------|-----------------|
| `e_coli` | 0.37 |
| `b_subtilis` | 0.36 |
| `s_cerevisiae` | 0.40 |
| `p_pastoris` | 0.38 |
| `other_bacteria` | 0.38 |
| `other_yeast` | 0.38 |

#### Impeller Constants

| `impeller_type` | `Np` (Power Number) | `Pg_P_factor` (Gassed/Ungassed) | `d_t_ratio` |
|-----------------|---------------------|----------------------------------|-------------|
| `rushton` | 5.0 | 0.60 | 0.33 |
| `pitched_blade` | 1.5 | 0.80 | 0.33 |
| `marine` | 0.35 | 0.85 | 0.40 |
| `unknown` | 5.0 | 0.60 | 0.33 |

#### Feed Frequency → τ_feed Mapping

| `feed_frequency` | `tau_feed` (seconds) |
|-------------------|---------------------|
| `continuous` | 10 |
| `1_10min` | 60 |
| `10_30min` | 900 |
| `30plus_min` | 2400 |

If `feed_interval_seconds` is provided by user, use that value directly instead of the mapping above.

#### Viscosity at Process Temperature (Pa·s)

| Temperature (°C) | `mu` (Pa·s) |
|-------------------|------------|
| 20 | 0.00100 |
| 25 | 0.00089 |
| 30 | 0.00080 |
| 37 | 0.00069 |
| 42 | 0.00062 |

Interpolate linearly between table values.

#### Oxygen Saturation Concentration C* (mmol/L, air, 1 atm)

| Temperature (°C) | `c_star` (mmol/L) |
|-------------------|-------------------|
| 20 | 0.276 |
| 25 | 0.258 |
| 30 | 0.237 |
| 35 | 0.213 |
| 37 | 0.204 |
| 42 | 0.186 |

Interpolate linearly between table values.

### 1.4 Estimation Transparency Bar

Persistent at bottom of form. Updates in real time as user fills fields.

Format: `Parameters entered: X/Y | Estimated values: Z | Assessment confidence: [LABEL]`

Confidence label logic:
- All user-provided or exhaust-gas-derived → `High-confidence`
- Mix of user-provided and estimated, OUR is user-provided → `Reliable`
- OUR is estimated → `Directional`

---

## 2. Calculation Engine

All calculations operate at **peak process demand** — simultaneous worst-case for all physical parameters.

### 2.1 Layer 1: Parameter Derivation

#### D1 — OUR Derivation

If `our_mode == estimate`:
```
our_peak = qo2_midpoint × biomass_cdw
our_min  = qo2_min × biomass_cdw
our_max  = qo2_max × biomass_cdw
```

If `our_mode == measured`:
```
our_peak = our_measured
```

If `our_mode == exhaust_gas`:
```
our_peak = (o2_inlet/100 - o2_outlet/100) × gas_flow_m3s × (1/22.4e-3) × (1000 / v_lab)
```
Convert gas_flow from L/min to m³/s: `gas_flow_m3s = gas_flow / (1000 × 60)`

#### D2 — Vessel Geometry

For any vessel (lab or target) given working volume `V` (in m³ = L/1000) and `h_d`:
```
T         = (4 × V / (π × h_d))^(1/3)          # tank diameter (m)
H_liquid  = h_d × T                              # liquid height (m)
D_imp     = d_t_ratio × T                        # impeller diameter (m)
A_cross   = (π/4) × T²                           # cross-sectional area (m²)
```

#### D3 — Power Input (P/V)

```
N         = rpm / 60                              # rev/s
P_ungassed = Np × ρ × N³ × D_imp⁵               # W (ρ = 1000 kg/m³)
P_gassed   = Pg_P_factor × P_ungassed            # W (single impeller)
P_total    = n_impellers × P_gassed               # W (multi-impeller correction)
PV         = P_total / V                          # W/m³ (V in m³)
```

**Pg/P validity flag:** If `vvm > 2.0` or `vvm < 0.3`, flag: "Gassed power correction carries additional uncertainty outside VVM 0.5–2.0 range."

**P/V sanity check:** Compute P/V for all three scenarios (0.5×, 1.0×, 2.0×). If all three fall below 500 W/m³ or all above 8,000 W/m³, flag: "Atypical operating envelope — verify inputs."

#### D4 — Reynolds Number

```
Re = ρ × N × D_imp² / mu
```

- `Re > 10,000` → turbulent (standard assumption, proceed normally)
- `1,000 ≤ Re ≤ 10,000` → flag: "Transitional flow regime — power number assumption may not hold."
- `Re < 1,000` → flag: "Laminar flow — correlations invalid."

#### D5 — Superficial Gas Velocity

```
Q_gas = (vvm × V_working_litres) / (1000 × 60)   # m³/s (V in litres)
Vs    = Q_gas / A_cross                             # m/s
```

#### D6 — C* and Driving Force

```
c_star  = interpolate(temperature)                  # from C* table
c_L     = (do_setpoint / 100) × c_star
driving_force = c_star - c_L                        # = c_star × (1 - do_setpoint/100)
```

#### D7 — OD600 → CDW Conversion

If `biomass_unit == OD600`:
```
biomass_cdw = biomass × cdw_od_factor
```

### 2.2 Layer 2: Risk Calculations

#### R1 — Oxygen Transfer Risk

**Step 1: Required kLa**
```
kLa_required = our_peak / driving_force             # h⁻¹
```

**Step 2: Achievable kLa (van't Riet, coalescing — conservative)**
```
kLa = 0.026 × (PV)^0.4 × (Vs)^0.5                 # s⁻¹
kLa_h = kLa × 3600                                  # h⁻¹
```
Units: PV in W/m³, Vs in m/s.

Non-coalescing (informational only): `kLa = 0.002 × (PV)^0.7 × (Vs)^0.2`

**Step 3: Three P/V scenarios at target scale**
```
PV_conservative = 0.5 × PV_lab
PV_moderate     = 1.0 × PV_lab       ← used for risk scoring
PV_aggressive   = 2.0 × PV_lab
```
`Vs_target` derived from constant VVM assumption at target scale geometry.
Calculate `kLa_target` for all three.

**Step 4: Risk scoring**

| kLa Ratio (Achievable / Required) | Score |
|------------------------------------|-------|
| > 1.5 | `low` |
| 1.0 – 1.5 | `moderate` |
| 0.7 – 1.0 | `high` |
| < 0.7 | `critical` |

Use moderate P/V scenario for scoring.

**Additional flags:**
- If `kLa_lab < kLa_required` → immediate warning: "Your lab process appears oxygen-limited. Resolve this before scale-up assessment is meaningful."
- If lab-scale mixing time (from R2) > 30 s AND `v_lab < 20` → soft flag: "Unusual mixing time for this vessel size — verify RPM entry."

#### R2 — Mixing Risk

**Step 1: Mixing time (Ruszkowski)**
```
epsilon  = PV / ρ                                    # m²/s³ (specific energy dissipation)
theta_mix = 5.9 × T² / (epsilon^(1/3) × D_imp^(4/3))  # seconds
```

Scaling at constant P/V:
```
theta_mix_target = theta_mix_lab × (v_target / v_lab)^(1/3)
```

**H/D warning:** If `h_d_target > 1.5`, display: "Mixing time estimate carries significant additional uncertainty for H/D > 1.5. Multi-impeller configurations are standard practice at this scale. Ruszkowski validated for H/D 0.8–1.5 only."

**Step 2: Damköhler number (fed-batch only)**
```
Da = theta_mix_target / tau_feed
```

| Da | Score |
|----|-------|
| < 0.01 | `low` |
| 0.01 – 0.1 | `moderate` |
| 0.1 – 1.0 | `high` |
| > 1.0 | `critical` |

**Step 3: pH control risk**

| θ_mix_target | Score |
|--------------|-------|
| < 30 s | `low` |
| 30–60 s | `moderate` |
| > 60 s | `high` |

**Overall mixing score:** highest of Da score and pH score. For batch processes (no Da), use pH score only.

#### R3 — Shear Stress Risk

**Tip speed at target scale (constant P/V):**
```
N_target = N_lab × (D_imp_lab / D_imp_target)^(5/3)
v_tip    = π × N_target × D_imp_target               # m/s (N in rev/s)
```

**Scoring:**

| v_tip vs. organism threshold | Score |
|------------------------------|-------|
| < 70% of threshold | `low` |
| 70–100% of threshold | `moderate` |
| 100–130% of threshold | `high` |
| > 130% of threshold | `critical` |

#### R4 — CO₂ Accumulation Risk

**Activation:** Only run detailed calculation when `biomass_cdw > 20` OR `our_peak > 30`. Otherwise score `low`.

```
CER           = rq × our_peak                        # mmol CO₂/L/h
kLa_CO2       = 0.9 × kLa_O2                         # at target scale
H_liquid_tgt  = h_d_target × T_target
dP_hydro      = ρ × 9.81 × H_liquid_tgt              # Pa
pCO2_bottom   = pCO2_bulk + (dP_hydro / 101325)      # bar
```

For `pCO2_bulk`, estimate from CER and kLa_CO2 using mass balance:
```
pCO2_bulk = CER / (kLa_CO2 × H_CO2)
```
where `H_CO2 ≈ 0.034 mol/L/atm` (Henry's constant for CO₂ in water at ~30°C). Simplification acceptable for risk triage.

| pCO₂ at vessel bottom (bar) | Score |
|------------------------------|-------|
| < 0.08 | `low` |
| 0.08 – 0.15 | `moderate` |
| 0.15 – 0.25 | `high` |
| > 0.25 | `critical` |

#### R5 — Heat Removal Risk

```
Q_metabolic = 0.46 × our_peak × V_target_m3          # kW

A_jacket    = π × T_target × H_liquid_tgt + (π/4) × T_target²   # m²

T_cw_outlet = t_cw_inlet + 10                         # standard assumption
dT_lm       = ((temperature - t_cw_inlet) - (temperature - T_cw_outlet)) /
              ln((temperature - t_cw_inlet) / (temperature - T_cw_outlet))

Q_cool_max  = 400 × A_jacket × dT_lm / 1000          # kW (U = 400 W/m²·K)

heat_ratio  = Q_metabolic / Q_cool_max
```

| Heat ratio | Score |
|------------|-------|
| < 0.60 | `low` |
| 0.60 – 0.85 | `moderate` |
| 0.85 – 1.00 | `high` |
| > 1.00 | `critical` |

### 2.3 Risk Aggregation

**Primary bottleneck:** The domain with the highest score. If tied, the one with the higher ratio to its critical threshold is primary.

Score ordering: `low` < `moderate` < `high` < `critical`

**Confidence per domain:**
- If OUR is user-provided and all other inputs user-provided → `high_confidence`
- If OUR is estimated → `directional` for OTR; `reliable` for others
- CO₂ domain always carries a note: "Widest confidence interval of the five domains."

Each domain confidence also includes a brief driver string. Example: "OUR estimated from literature; provide measured OUR to upgrade to High-confidence."

**"What would change this?" logic:**
For the primary bottleneck domain, compute the sensitivity: what single input change would shift the score down by one level? Generate a sentence. Examples:
- OTR: "If your measured OUR is below [X] mmol/L/h, OTR risk drops to Moderate."
- Mixing: "Switching to continuous feed (Da drops to [X]) would reduce mixing risk to Low."
- Heat: "If cooling water is available at [X]°C, heat removal risk drops to Moderate."

### 2.4 Scale-Up Strategy Comparison (v1.1)

For each of four criteria, calculate at target scale:

| Criterion | N_target derivation | Display columns |
|-----------|--------------------|---------------------------------|
| Constant P/V | `N_target = N_lab × (D_lab/D_target)^(5/3)` | N (RPM), tip speed (m/s), kLa (h⁻¹), P/V (W/m³), θ_mix (s) |
| Constant kLa | Iterate van't Riet to match kLa_lab | Same columns |
| Constant tip speed | `N_target = N_lab × (D_lab/D_target)` | Same columns |
| Constant Re | `N_target = N_lab × (D_lab/D_target)²` | Same columns |

Auto-flag any criterion that produces a constraint violation (e.g., tip speed > organism threshold).

---

## 3. Edge Cases & Input Validation

### 3.1 Hard Validation (form does not submit)

| Condition | Error message |
|-----------|--------------|
| Any required field empty | "[Field name] is required." |
| `v_lab ≤ 0` or `v_target ≤ 0` | "Volume must be greater than zero." |
| `v_target ≤ v_lab` | "Target scale must be larger than lab scale." |
| `biomass ≤ 0` | "Biomass must be greater than zero." |
| `biomass > 200` (g/L CDW) | "Biomass of [X] g/L exceeds maximum supported value (200 g/L)." |
| `rpm ≤ 0` | "RPM must be greater than zero." |
| `temperature < 15` or `> 55` | "Temperature must be between 15°C and 55°C." |
| `do_setpoint < 0` or `> 100` | "DO setpoint must be between 0% and 100%." |
| `o2_outlet ≥ o2_inlet` (exhaust gas mode) | "Outlet O₂ must be lower than inlet O₂." |
| Fed-batch with no feed frequency and no numeric override | "Feed frequency is required for fed-batch processes." |

### 3.2 Soft Flags (warnings, do not block submission)

| Condition | Warning message |
|-----------|----------------|
| `v_target / v_lab > 10000` | "Extreme scale ratio — predictions carry very high uncertainty. Intermediate scale assessment strongly recommended." |
| kLa_lab < kLa_required | "Your lab process appears oxygen-limited. Resolve this before scale-up assessment is meaningful." |
| Re < 10,000 at lab scale | "Transitional flow regime — power number assumption may not hold. P/V less reliable." |
| `biomass_cdw > 60` | "High biomass — Newtonian viscosity assumption may not hold. Mixing and kLa predictions carry additional uncertainty." |
| `temperature < 20` or `> 45` | "Outside validated range for C* and viscosity correlations." |
| `h_d_target > 1.5` | "Mixing time estimate carries additional uncertainty for H/D > 1.5. Multi-impeller configurations are standard at this scale." |
| Lab θ_mix > 30 s AND `v_lab < 20` | "Unusual mixing time for this vessel size — verify RPM entry." |
| All P/V scenarios < 500 or > 8000 W/m³ | "Atypical operating envelope — verify inputs." |
| `vvm > 2.0` or `vvm < 0.3` | "Gassed power correction carries additional uncertainty outside VVM 0.5–2.0." |

### 3.3 Loading & Error States

- **Calculation in progress:** Show a brief loading indicator. Calculations should be near-instant (client-side math).
- **Server error (auth, report save):** "Something went wrong. Please try again." with retry button.
- **Report generation failure:** "Report could not be generated. Your assessment results are still available above."

---

## 4. UX Specification

### 4.1 Screen 1: Landing Page

| Element | Content |
|---------|---------|
| Headline | "See where your fermentation process is vulnerable at scale." |
| Sub-headline | "Enter your lab-scale process parameters. Get a structured engineering risk assessment across oxygen transfer, mixing, shear, CO₂ accumulation, and heat removal — with full calculation transparency." |
| Trust signal 1 | "Built on peer-reviewed correlations: van't Riet, Ruszkowski, power number theory" |
| Trust signal 2 | "Designed for bacterial and yeast fermentation in stirred-tank reactors" |
| Trust signal 3 | "Every assumption is visible and overridable" |
| Example link | "See an example assessment" → loads pre-filled E. coli fed-batch, 10L → 10,000L results (no auth required) |
| CTA | "Assess my process" → triggers company email login |
| Privacy line | "Your process data is encrypted in transit and at rest, never shared, and deletable on demand." |
| **Not present** | Screenshots, pricing, team bios, customer logos, feature lists |

**Mobile visitors:** Display message: "This tool is designed for desktop use. Visit on your laptop or desktop for the full experience." Do not attempt to render the full application on mobile.

### 4.2 Screen 2: Input Form

**Layout:** Open scrollable form. All five sections visible from the start. NOT a wizard — do not gate sections behind previous sections. Each section is collapsible/expandable. Empty-state guidance text in each section for first-time users.

| Section | Fields | Visibility |
|---------|--------|------------|
| A: Process Identity | `organism_class`, `organism_species`, `process_type` | Always visible |
| B: Scale Definition | `v_lab`, `v_target` | Always visible. Scale ratio displayed as derived output. |
| C: Vessel & Agitation | `vessel_model`, `impeller_type`, `rpm`, `vvm`, `h_d_target`, `n_impellers` | Always visible |
| D: Process Characterisation | `biomass` (with unit toggle), OUR 3-way selector, `do_setpoint`, `temperature`, `t_cw_inlet` | Always visible |
| E: Fed-batch Parameters | `feed_frequency` + `feed_interval_seconds` optional override | Visible only when `process_type == fed_batch`. Section heading: "These parameters affect mixing risk assessment" |

**Estimation transparency bar:** Persistent at bottom of form. See Section 1.4.

**Estimated values display:** Italic text preceded by `~`. Visually distinct from user-provided values (e.g., different text colour or background).

**CTA:** "Run risk assessment" button.

### 4.3 Screen 3: Results Dashboard

**Layout:** Two-panel desktop layout.

#### Left Panel (40%) — Risk Summary

1. **Full-width context header:** `[Species] | [Process Type] | [Lab Vol] → [Target Vol] | Scale ratio: [X]×`

2. **Primary bottleneck statement:** Single sentence. Large text. Plain language. Specific. Quantified. This is what the engineer screenshots.
   - Example: "Oxygen transfer is your critical constraint at 10,000L. Your required kLa of 340 h⁻¹ cannot be achieved at standard P/V ratios on typical industrial STR configurations."

3. **"What would change this?" micro-section:** Directly below bottleneck statement. Shows the single most actionable input change.
   - Example: "If your measured OUR is below 80 mmol/L/h, OTR risk drops to Moderate."

4. **Five risk domain cards:** Each card shows:
   - Domain name
   - Risk level (colour-coded: Low = muted green `#27AE60`, Moderate = amber `#F39C12`, High = deep orange `#E67E22`, Critical = red `#C0392B`)
   - Single most important number for that domain
   - One-line interpretation
   - Confidence indicator: `High-confidence` / `Reliable` / `Directional` with driver string
   - `Directional` carries label: "Treat as directional only."

**No animations. No congratulatory copy. Professional instrument aesthetic.**

#### Right Panel (60%) — Quantitative Detail

**Default view:** Projections table across three scales:

| Parameter | Lab (input) | Pilot (interpolated) | Production (target) |
|-----------|-------------|---------------------|---------------------|
| kLa achievable (h⁻¹) | [calc] | [interp] | [range: conservative–aggressive] |
| kLa required (h⁻¹) | [calc] | [same] | [same] |
| Mixing time (s) | [calc] | [scaled] | [scaled] |
| Da_mixing | [calc] | [scaled] | [scaled] |
| Tip speed (m/s) | [calc] | [scaled] | [scaled] |
| pCO₂ bottom (bar) | [calc] | [scaled] | [scaled] |
| Metabolic heat (kW/m³) | [calc] | [scaled] | [scaled] |

Pilot scale = geometric mean of lab and target volumes.

**Scenario sensitivity slider:**
- Label: "Adjust target P/V ratio relative to lab scale"
- Range: 0.25× | 0.5× | 1.0× | 2.0×
- As slider moves: kLa achievable column updates in real time

**Risk domain card click:** Right panel loads full calculation breakdown for that domain — correlation used, all constants, all assumed values flagged as `estimated` or `user-provided`, uncertainty range.

### 4.4 Screen 4: PDF Report

**4 pages. Downloadable PDF with unique URL. 90-day persistence. User can delete on demand.**

| Page | Section | Content |
|------|---------|---------|
| 1 | Executive Summary | Process parameters summary. Primary bottleneck statement + "What would change this?" Risk scores across five domains (colour-coded). Plain-language paragraph suitable for non-technical management. |
| 2 | Risk Assessment Detail | Full five-domain breakdown: score, key calculated parameters, threshold comparison, uncertainty range, mitigation recommendation per domain. |
| 3 | Quantitative Projections | Full projections table across lab, pilot, and production scales. |
| 4 | Reliability Statement | Input provenance summary (user-provided vs. estimated, count each). Top 2–3 highest-impact assumptions with directional impact. Single measurement that would most improve assessment. Scope limitation statement. |

**Report tone:** Short declarative sentences. No passive voice. No marketing language. No hedging beyond legitimate uncertainty. Consultant's technical memo.

**Report footer on every page:** "Generated by Lemnisca Fermentation Scale-Up Risk Predictor — lemnisca.com/assess"

**Report persistence:**
- Unique URL per report
- 90-day lifetime, auto-deleted after
- User can manually delete at any time
- Re-running assessment with updated inputs generates new report; old reports remain accessible

### 4.5 Pre-Filled Example Assessment

Available from landing page without authentication. Pre-loaded with:

| Parameter | Value |
|-----------|-------|
| Organism | E. coli |
| Process type | Fed-batch |
| Lab volume | 10 L |
| Target volume | 10,000 L |
| Impeller | Rushton |
| RPM | 800 |
| VVM | 1.0 |
| Peak biomass | 40 g/L CDW |
| OUR mode | Estimated from biomass |
| DO setpoint | 30% |
| Temperature | 37°C |
| Feed frequency | Every 1–10 min |
| n_impellers (target) | 2 (auto from H/D) |

Shows complete results dashboard. User cannot modify inputs or generate a report without authenticating.

### 4.6 Mitigation Recommendations

For each domain scored `high` or `critical`, generate one specific, actionable recommendation. **Not generic advice.**

Examples:

| Domain | Score | Recommendation Template |
|--------|-------|------------------------|
| OTR | Critical | "Required kLa of [X] h⁻¹ exceeds standard P/V achievability at [scale]L. Options: (1) Reduce target biomass ~[Y]% to bring OUR within standard kLa range. (2) Dual Rushton or Rushton-to-PBT cascade configuration. (3) Pressure overlay (+0.5 bar increases C* by ~15%)." |
| Mixing | High | "Mixing time at [scale]L is ~[X] s. Feed every [Y] s produces Da = [Z] — substrate gradients expected. Options: (1) Switch to continuous feed. (2) Relocate feed port to impeller high-turbulence zone. (3) Reduce peak feed rate and extend feed duration." |
| Shear | High | "Tip speed of [X] m/s at constant P/V exceeds [organism] threshold of [Y] m/s. Options: (1) Switch to pitched blade turbine. (2) Accept lower P/V with supplementary O₂ strategy. (3) Consider scale-up at constant tip speed instead of constant P/V." |
| CO₂ | High | "Estimated pCO₂ at vessel bottom is [X] bar — above 0.15 bar inhibitory threshold. Options: (1) Increase sparging rate to enhance CO₂ stripping. (2) Reduce biomass target. (3) Lower H/D vessel geometry." |
| Heat | Critical | "Metabolic heat generation of [X] kW exceeds jacket cooling capacity of [Y] kW. Options: (1) Add internal cooling coil. (2) Reduce target biomass or OUR. (3) Lower process temperature if organism permits." |

---

## 5. Authentication

- **Method:** Company email login (SSO where available, magic link fallback).
- **Data collected at login:** Email address only.
- **Data collected at report generation:** Name (single field).
- **Company-email-only:** Block known personal email domains (gmail.com, yahoo.com, hotmail.com, outlook.com, etc.). Show fallback for freelancers: "Using a personal email? Tell us briefly about your work" — single free-text field that lets them through.
- **No demographic questionnaire.**
- **Domain analytics:** Track unique company domains for traction metrics. Alert if > 50% academic domains (`.edu`, `.ac.uk`, etc.) by month 3.

---

## 6. Data Model (Conceptual)

### Assessment

```
{
  id: uuid,
  user_id: uuid,
  created_at: timestamp,
  inputs: { ... all input parameters ... },
  derived: { ... all derived parameters (D1-D7) ... },
  results: {
    otr: { score, kla_required, kla_achievable_range, ratio, confidence, driver },
    mixing: { score, theta_mix_target, da, ph_score, confidence, driver },
    shear: { score, tip_speed, threshold, ratio, confidence, driver },
    co2: { score, pco2_bottom, activated, confidence, driver },
    heat: { score, q_metabolic, q_cool_max, heat_ratio, confidence, driver },
    primary_bottleneck: { domain, statement, what_would_change },
    overall_confidence: string,
  },
  report_id: uuid | null,
  flags: [ ... array of warning strings ... ],
}
```

### Report

```
{
  id: uuid,
  assessment_id: uuid,
  user_name: string,
  created_at: timestamp,
  expires_at: timestamp,          // created_at + 90 days
  url_token: string,              // unique token for shareable URL
  deleted: boolean,
  pdf_blob: binary,
}
```

### User

```
{
  id: uuid,
  email: string,
  company_domain: string,         // extracted from email
  created_at: timestamp,
  name: string | null,            // collected at first report generation
  is_freelance: boolean,
  freelance_description: string | null,
}
```

---

## 7. Key Constants Reference

Quick-access table of all hardcoded constants used in the calculation engine:

| Constant | Value | Used In |
|----------|-------|---------|
| ρ (broth density) | 1000 kg/m³ | D3, D4, R2, R4, R5 |
| g (gravitational acceleration) | 9.81 m/s² | R4 |
| Van't Riet coalescing coefficient | 0.026 | R1 |
| Van't Riet coalescing P/V exponent | 0.4 | R1 |
| Van't Riet coalescing Vs exponent | 0.5 | R1 |
| Van't Riet non-coalescing coefficient | 0.002 | R1 (informational) |
| Van't Riet non-coalescing P/V exponent | 0.7 | R1 (informational) |
| Van't Riet non-coalescing Vs exponent | 0.2 | R1 (informational) |
| Ruszkowski constant | 5.9 | R2 |
| kLa_CO₂ / kLa_O₂ ratio | 0.9 | R4 |
| H_CO₂ (Henry's constant) | 0.034 mol/L/atm | R4 |
| CO₂ inhibitory threshold | 0.15 bar | R4 scoring |
| Metabolic heat factor | 0.46 kW/(mmol/L/h)/m³ | R5 |
| U (jacket heat transfer coeff) | 400 W/m²·K | R5 |
| T_cw_outlet assumption | T_cw_inlet + 10°C | R5 |
| CO₂ activation: biomass threshold | 20 g/L CDW | R4 |
| CO₂ activation: OUR threshold | 30 mmol/L/h | R4 |
| P/V low sanity bound | 500 W/m³ | D3 flag |
| P/V high sanity bound | 8000 W/m³ | D3 flag |
| Atmospheric pressure | 101325 Pa (1 atm) | R4, D6 |
