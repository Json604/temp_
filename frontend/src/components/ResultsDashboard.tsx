"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { ThemeToggle, useTheme } from "@/components/ThemeProvider";
import type {
  RiskScore,
  Confidence,
  RiskDomain,
  OtrRiskResult,
  MixingRiskResult,
  ShearRiskResult,
  Co2RiskResult,
  HeatRiskResult,
  ProcessInputs,
  DerivedParameters,
} from "@/lib/types";
import type { PartialAssessmentResult } from "@/lib/engine";
import {
  RISK_COLOURS,
  VANT_RIET_COALESCING_COEFFICIENT,
  VANT_RIET_COALESCING_PV_EXPONENT,
  VANT_RIET_COALESCING_VS_EXPONENT,
  RUSZKOWSKI_CONSTANT,
  RHO,
  FEED_TAU_MAP,
  KLA_CO2_O2_RATIO,
  H_CO2,
  G,
  ATMOSPHERIC_PRESSURE_PA,
  METABOLIC_HEAT_FACTOR,
  U_JACKET,
  T_CW_OUTLET_OFFSET,
  RQ_DEFAULTS,
  CO2_BIOMASS_THRESHOLD,
  CO2_OUR_THRESHOLD,
} from "@/lib/constants";
import {
  deriveVesselGeometry,
  deriveGasVelocity,
} from "@/lib/engine";
import GeneratePdfButton from "@/components/GeneratePdfButton";
import type { StoredAssessment } from "@/lib/store";

// --- Props ---

export interface ResultsDashboardProps {
  data: StoredAssessment;
  isExample?: boolean;
  onBackClick?: () => void;
}

// --- Species display labels ---

const SPECIES_LABELS: Record<string, string> = {
  e_coli: "E. coli",
  b_subtilis: "B. subtilis",
  s_cerevisiae: "S. cerevisiae",
  p_pastoris: "P. pastoris",
  other_bacteria: "Other bacterium",
  other_yeast: "Other yeast",
};

const PROCESS_TYPE_LABELS: Record<string, string> = {
  batch: "Batch",
  fed_batch: "Fed-batch",
};

// --- Dark theme risk colours ---

const DARK_RISK_COLOURS: Record<RiskScore, string> = {
  low: "#34d399",
  moderate: "#fbbf24",
  high: "#fb923c",
  critical: "#f87171",
};

const LIGHT_RISK_COLOURS: Record<RiskScore, string> = {
  low: "#059669",
  moderate: "#b45309",
  high: "#c2410c",
  critical: "#dc2626",
};

// --- Composite score mapping ---

const SCORE_NUMERIC: Record<RiskScore, number> = {
  low: 15,
  moderate: 40,
  high: 70,
  critical: 95,
};

// --- Helpers ---

function fmt(n: number, decimals = 1): string {
  if (Math.abs(n) >= 1000) return n.toLocaleString("en-GB", { maximumFractionDigits: decimals });
  return n.toFixed(decimals);
}

function fmtInt(n: number): string {
  return Math.round(n).toLocaleString("en-GB");
}

function klaVantRiet(pv: number, vs: number): number {
  const kla_s =
    VANT_RIET_COALESCING_COEFFICIENT *
    Math.pow(pv, VANT_RIET_COALESCING_PV_EXPONENT) *
    Math.pow(vs, VANT_RIET_COALESCING_VS_EXPONENT);
  return kla_s * 3600;
}

function riskColour(score: RiskScore, theme: "light" | "dark" = "dark"): string {
  return theme === "light" ? LIGHT_RISK_COLOURS[score] : DARK_RISK_COLOURS[score];
}

function riskLabel(score: RiskScore): string {
  return score.charAt(0).toUpperCase() + score.slice(1);
}

function confidenceLabel(c: Confidence): string {
  switch (c) {
    case "high_confidence": return "High-confidence";
    case "reliable": return "Reliable";
    case "directional": return "Directional";
  }
}

function riskBadgeClass(score: RiskScore): string {
  return `risk-badge risk-badge-${score}`;
}

function riskGlowClass(score: RiskScore): string {
  return `risk-glow-${score}`;
}

function compositeScore(scores: RiskScore[]): number {
  const sum = scores.reduce((acc, s) => acc + SCORE_NUMERIC[s], 0);
  return Math.round(sum / scores.length);
}

function compositeLabel(score: number, theme: "light" | "dark" = "dark"): { label: string; colour: string } {
  const colours = theme === "light" ? LIGHT_RISK_COLOURS : DARK_RISK_COLOURS;
  if (score <= 20) return { label: "Low Risk", colour: colours.low };
  if (score <= 45) return { label: "Moderate Risk", colour: colours.moderate };
  if (score <= 70) return { label: "High Risk", colour: colours.high };
  return { label: "Critical Risk", colour: colours.critical };
}

// --- SVG Semicircular Risk Gauge ---

function RiskGauge({ score, label, colour, theme }: { score: number; label: string; colour: string; theme: "light" | "dark" }) {
  // Arc from 180° (left) to 0° (right) — semicircle
  const cx = 140;
  const cy = 130;
  const r = 100;
  const strokeWidth = 14;

  // Full arc path (semicircle, left to right)
  const startAngle = Math.PI; // 180°
  const endAngle = 0; // 0°

  function polarToCartesian(angle: number) {
    return {
      x: cx + r * Math.cos(angle),
      y: cy - r * Math.sin(angle),
    };
  }

  const arcStart = polarToCartesian(startAngle);
  const arcEnd = polarToCartesian(endAngle);

  // Background arc path
  const bgPath = `M ${arcStart.x} ${arcStart.y} A ${r} ${r} 0 0 1 ${arcEnd.x} ${arcEnd.y}`;

  // Value arc — sweeps proportionally along the same semicircle
  // large-arc-flag is always 0: the value arc is at most 180° (the full semicircle),
  // so the "short" arc around center (cx, cy) is always the correct one.
  const valueAngle = startAngle - (score / 100) * Math.PI;
  const valueEnd = polarToCartesian(valueAngle);
  const valuePath = `M ${arcStart.x} ${arcStart.y} A ${r} ${r} 0 0 1 ${valueEnd.x} ${valueEnd.y}`;

  // Needle position
  const needleAngle = startAngle - (score / 100) * Math.PI;
  const needleLength = r - 20;
  const needleTip = {
    x: cx + needleLength * Math.cos(needleAngle),
    y: cy - needleLength * Math.sin(needleAngle),
  };

  // Gradient stops for the arc
  const gradientId = "gauge-gradient";

  return (
    <div className="flex flex-col items-center">
      <svg width="280" height="160" viewBox="0 0 280 160">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="35%" stopColor="#fbbf24" />
            <stop offset="65%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#f87171" />
          </linearGradient>
          <filter id="gauge-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background track */}
        <path
          d={bgPath}
          fill="none"
          stroke={theme === "light" ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.06)"}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Value arc — exact same radius, drawn on top of background */}
        {score > 0 && (
          <path
            d={valuePath}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        )}

        {/* Tick marks */}
        {[0, 25, 50, 75, 100].map((tick) => {
          const angle = startAngle - (tick / 100) * Math.PI;
          const outerR = r + strokeWidth / 2 + 4;
          const innerR = r + strokeWidth / 2 + 10;
          const inner = { x: cx + outerR * Math.cos(angle), y: cy - outerR * Math.sin(angle) };
          const outer = { x: cx + innerR * Math.cos(angle), y: cy - innerR * Math.sin(angle) };
          return (
            <line
              key={tick}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke={theme === "light" ? "rgba(0,0,0,0.12)" : "rgba(192,192,208,0.2)"}
              strokeWidth="1.5"
            />
          );
        })}

        {/* Needle */}
        <line
          x1={cx}
          y1={cy}
          x2={needleTip.x}
          y2={needleTip.y}
          stroke={colour}
          strokeWidth="2.5"
          strokeLinecap="round"
          filter="url(#gauge-glow)"
        />
        {/* Needle hub */}
        <circle cx={cx} cy={cy} r="6" fill={colour} opacity="0.9" />
        <circle cx={cx} cy={cy} r="3" fill={theme === "light" ? "#f5f6fa" : "#0a0a0f"} />

        {/* Score text */}
        <text
          x={cx}
          y={cy - 20}
          textAnchor="middle"
          className="font-mono"
          style={{ fontSize: "36px", fontWeight: 700, fill: colour }}
        >
          {score}
        </text>
      </svg>
      <p className="text-base font-semibold -mt-2" style={{ color: colour }}>
        {label}
      </p>
      <p className="text-[11px] text-silver-600 mt-0.5">Composite across 5 risk domains</p>
    </div>
  );
}

// --- Pilot-scale helpers ---

function pilotVolume(vLab: number, vTarget: number): number {
  return Math.sqrt(vLab * vTarget);
}

function derivedAtScale(
  inputs: ProcessInputs,
  baseDerived: DerivedParameters,
  volume: number,
  hd: number,
): DerivedParameters {
  const geometry = deriveVesselGeometry(volume, hd, inputs.impeller_type);
  const gas = deriveGasVelocity(inputs.vvm, volume, geometry.a_cross);
  return {
    ...baseDerived,
    target_geometry: geometry,
    q_gas_target: gas.q_gas,
    vs_target: gas.vs,
  };
}

// --- Mitigation recommendation ---

function MitigationBlock({
  domain,
  results,
  inputs,
}: {
  domain: RiskDomain;
  results: PartialAssessmentResult;
  inputs: ProcessInputs;
}) {
  const { otr, mixing, shear, co2, heat } = results;
  const score =
    domain === "otr" ? otr.score :
    domain === "mixing" ? mixing.score :
    domain === "shear" ? shear.score :
    domain === "co2" ? co2.score :
    heat.score;

  if (score !== "high" && score !== "critical") return null;

  let recommendation: string;
  switch (domain) {
    case "otr":
      recommendation = `Required kLa of ${fmt(otr.kla_required)} h\u207B\u00B9 exceeds standard P/V achievability at ${fmtInt(inputs.v_target)} L. Options: (1) Reduce target biomass ~20% to bring OUR within standard kLa range. (2) Dual Rushton or Rushton-to-PBT cascade configuration. (3) Pressure overlay (+0.5 bar increases C* by ~15%).`;
      break;
    case "mixing":
      if (mixing.da != null) {
        recommendation = `Mixing time at ${fmtInt(inputs.v_target)} L is ~${fmt(mixing.theta_mix_target)} s. Feed produces Da = ${fmt(mixing.da, 3)} \u2014 substrate gradients expected. Options: (1) Switch to continuous feed. (2) Relocate feed port to impeller high-turbulence zone. (3) Reduce peak feed rate and extend feed duration.`;
      } else {
        recommendation = `Mixing time at ${fmtInt(inputs.v_target)} L is ~${fmt(mixing.theta_mix_target)} s \u2014 pH excursions likely. Options: (1) Add a second impeller. (2) Reduce target vessel H/D ratio. (3) Increase agitation speed within shear limits.`;
      }
      break;
    case "shear":
      recommendation = `Tip speed of ${fmt(shear.tip_speed)} m/s at constant P/V exceeds ${SPECIES_LABELS[inputs.organism_species] ?? inputs.organism_species} threshold of ${fmt(shear.tip_speed_threshold)} m/s. Options: (1) Switch to pitched blade turbine. (2) Accept lower P/V with supplementary O\u2082 strategy. (3) Consider scale-up at constant tip speed instead of constant P/V.`;
      break;
    case "co2":
      recommendation = `Estimated pCO\u2082 at vessel bottom is ${fmt(co2.pco2_bottom ?? 0, 2)} bar \u2014 above 0.15 bar inhibitory threshold. Options: (1) Increase sparging rate to enhance CO\u2082 stripping. (2) Reduce biomass target. (3) Lower H/D vessel geometry.`;
      break;
    case "heat":
      recommendation = `Metabolic heat generation of ${fmt(heat.q_metabolic)} kW exceeds jacket cooling capacity of ${fmt(heat.q_cool_max)} kW. Options: (1) Add internal cooling coil. (2) Reduce target biomass or OUR. (3) Lower process temperature if organism permits.`;
      break;
  }

  return (
    <div className="mt-4 glass-panel-sm border-risk-high/20 bg-risk-high/[0.04] p-4">
      <h4 className="text-[11px] font-semibold text-silver-500 uppercase tracking-[0.08em] mb-2">
        Mitigation Recommendation
      </h4>
      <p className="text-sm text-silver-300 leading-relaxed">{recommendation}</p>
    </div>
  );
}

// --- Table row helper ---

function Row({ label, value, estimated }: { label: string; value: string; estimated?: boolean }) {
  return (
    <tr className="border-b border-black/[0.04] dark:border-white/[0.03]">
      <td className="py-2 text-silver-500 text-sm">{label}</td>
      <td className={`py-2 text-right font-mono text-sm ${estimated ? "italic text-risk-moderate" : "text-silver-200"}`}>
        {value}
        {estimated && <span className="text-[10px] ml-1 opacity-70">(est.)</span>}
      </td>
    </tr>
  );
}

// --- Detail panels ---

function OtrDetail({ otr, derived, inputs, results }: {
  otr: OtrRiskResult;
  derived: DerivedParameters;
  inputs: ProcessInputs;
  results: PartialAssessmentResult;
}) {
  return (
    <div className="space-y-5 animate-fade-in">
      <h3 className="text-sm font-semibold text-silver-100 border-b border-black/[0.06] dark:border-white/[0.06] pb-2">
        OTR Calculation Breakdown
      </h3>
      <div>
        <h4 className="text-[11px] font-semibold text-silver-500 uppercase tracking-[0.08em] mb-1">Correlation</h4>
        <p className="text-sm text-silver-400">
          van&rsquo;t Riet (coalescing): kLa = 0.026 &times; (P/V)<sup>0.4</sup> &times; V<sub>s</sub><sup>0.5</sup>
        </p>
      </div>
      <div>
        <h4 className="text-[11px] font-semibold text-silver-500 uppercase tracking-[0.08em] mb-1">Key Parameters</h4>
        <table className="w-full text-sm">
          <tbody>
            <Row label="OUR peak" value={`${fmt(derived.our_peak)} mmol/L/h`} estimated={inputs.our_mode === "estimate"} />
            <Row label="C*" value={`${fmt(derived.c_star, 3)} mmol/L`} />
            <Row label="C_L (at DO setpoint)" value={`${fmt(derived.c_l, 3)} mmol/L`} />
            <Row label="Driving force (C* − C_L)" value={`${fmt(derived.driving_force, 3)} mmol/L`} />
            <Row label="kLa required" value={`${fmt(otr.kla_required)} h\u207B\u00B9`} />
            <Row label="P/V (lab)" value={`${fmt(derived.pv_lab)} W/m\u00B3`} />
            <Row label="Vs (lab)" value={`${fmt(derived.vs_lab, 4)} m/s`} />
            <Row label="Vs (target)" value={`${fmt(derived.vs_target, 4)} m/s`} />
          </tbody>
        </table>
      </div>
      <div>
        <h4 className="text-[11px] font-semibold text-silver-500 uppercase tracking-[0.08em] mb-1">P/V Scenarios at Target</h4>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] text-silver-600 border-b border-black/[0.06] dark:border-white/[0.06]">
              <th className="text-left py-1.5">Scenario</th>
              <th className="text-right py-1.5">P/V (W/m³)</th>
              <th className="text-right py-1.5">kLa (h⁻¹)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-black/[0.04] dark:border-white/[0.03]">
              <td className="py-1.5 text-silver-400">Conservative (0.5×)</td>
              <td className="text-right font-mono text-silver-200">{fmt(otr.pv_conservative)}</td>
              <td className="text-right font-mono text-silver-200">{fmt(otr.kla_target_conservative)}</td>
            </tr>
            <tr className="border-b border-black/[0.04] dark:border-white/[0.03]">
              <td className="py-1.5 text-silver-400">Moderate (1.0×)</td>
              <td className="text-right font-mono text-silver-200">{fmt(otr.pv_moderate)}</td>
              <td className="text-right font-mono text-silver-200">{fmt(otr.kla_target_moderate)}</td>
            </tr>
            <tr className="border-b border-black/[0.04] dark:border-white/[0.03]">
              <td className="py-1.5 text-silver-400">Aggressive (2.0×)</td>
              <td className="text-right font-mono text-silver-200">{fmt(otr.pv_aggressive)}</td>
              <td className="text-right font-mono text-silver-200">{fmt(otr.kla_target_aggressive)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div>
        <h4 className="text-[11px] font-semibold text-silver-500 uppercase tracking-[0.08em] mb-1">Scoring</h4>
        <p className="text-sm text-silver-400">
          kLa ratio (moderate scenario) = {fmt(otr.kla_ratio, 2)} &rarr; <strong style={{ color: riskColour(otr.score) }}>{riskLabel(otr.score)}</strong>
        </p>
        <p className="text-[11px] text-silver-600 mt-1">
          Thresholds: &gt;1.5 Low, &ge;1.0 Moderate, &ge;0.7 High, &lt;0.7 Critical
        </p>
      </div>
      <MitigationBlock domain="otr" results={results} inputs={inputs} />
    </div>
  );
}

function MixingDetail({ mixing, derived, inputs, results }: {
  mixing: MixingRiskResult;
  derived: DerivedParameters;
  inputs: ProcessInputs;
  results: PartialAssessmentResult;
}) {
  return (
    <div className="space-y-5 animate-fade-in">
      <h3 className="text-sm font-semibold text-silver-100 border-b border-black/[0.06] dark:border-white/[0.06] pb-2">
        Mixing Calculation Breakdown
      </h3>
      <div>
        <h4 className="text-[11px] font-semibold text-silver-500 uppercase tracking-[0.08em] mb-1">Correlation</h4>
        <p className="text-sm text-silver-400">
          Ruszkowski: &theta;<sub>mix</sub> = 5.9 &times; T&sup2; / (&epsilon;<sup>1/3</sup> &times; D<sub>imp</sub><sup>4/3</sup>)
        </p>
      </div>
      <div>
        <h4 className="text-[11px] font-semibold text-silver-500 uppercase tracking-[0.08em] mb-1">Key Parameters</h4>
        <table className="w-full text-sm">
          <tbody>
            <Row label="Tank diameter (lab)" value={`${fmt(derived.lab_geometry.t_diameter, 3)} m`} />
            <Row label="Tank diameter (target)" value={`${fmt(derived.target_geometry.t_diameter, 3)} m`} />
            <Row label="Impeller diameter (lab)" value={`${fmt(derived.lab_geometry.d_imp, 3)} m`} />
            <Row label="P/V (lab)" value={`${fmt(derived.pv_lab)} W/m\u00B3`} />
            <Row label="\u03B5 = P/V \u00F7 \u03C1" value={`${fmt(derived.pv_lab / RHO, 4)} m\u00B2/s\u00B3`} />
            <Row label="\u03B8_mix (lab)" value={`${fmt(mixing.theta_mix_lab)} s`} />
            <Row label="\u03B8_mix (target)" value={`${fmt(mixing.theta_mix_target)} s`} />
            <Row label="Scale factor" value={`(${fmt(inputs.v_target / inputs.v_lab, 1)})^(1/3) = ${fmt(Math.pow(inputs.v_target / inputs.v_lab, 1/3), 2)}`} />
          </tbody>
        </table>
      </div>
      {inputs.process_type === "fed_batch" && mixing.da != null && (
        <div>
          <h4 className="text-[11px] font-semibold text-silver-500 uppercase tracking-[0.08em] mb-1">Damköhler Number</h4>
          <table className="w-full text-sm">
            <tbody>
              <Row label="Da = \u03B8_mix / \u03C4_feed" value={fmt(mixing.da, 3)} />
              <Row label="Da score" value={mixing.da_score ? riskLabel(mixing.da_score) : "\u2014"} />
            </tbody>
          </table>
        </div>
      )}
      <div>
        <h4 className="text-[11px] font-semibold text-silver-500 uppercase tracking-[0.08em] mb-1">Scoring</h4>
        <p className="text-sm text-silver-400">
          pH control score: <strong className="text-silver-200">{riskLabel(mixing.ph_score)}</strong>
          {mixing.da_score && <>, Da score: <strong className="text-silver-200">{riskLabel(mixing.da_score)}</strong></>}
          {" \u2192 "}Overall: <strong style={{ color: riskColour(mixing.score) }}>{riskLabel(mixing.score)}</strong>
        </p>
      </div>
      <MitigationBlock domain="mixing" results={results} inputs={inputs} />
    </div>
  );
}

function ShearDetail({ shear, derived, inputs, results }: {
  shear: ShearRiskResult;
  derived: DerivedParameters;
  inputs: ProcessInputs;
  results: PartialAssessmentResult;
}) {
  const labTipSpeed = Math.PI * derived.n_rps * derived.lab_geometry.d_imp;
  return (
    <div className="space-y-5 animate-fade-in">
      <h3 className="text-sm font-semibold text-silver-100 border-b border-black/[0.06] dark:border-white/[0.06] pb-2">
        Shear Stress Calculation Breakdown
      </h3>
      <div>
        <h4 className="text-[11px] font-semibold text-silver-500 uppercase tracking-[0.08em] mb-1">Correlation</h4>
        <p className="text-sm text-silver-400">
          Constant P/V: N<sub>target</sub> = N<sub>lab</sub> &times; (D<sub>lab</sub>/D<sub>target</sub>)<sup>5/3</sup>; v<sub>tip</sub> = &pi; &times; N &times; D<sub>imp</sub>
        </p>
      </div>
      <div>
        <h4 className="text-[11px] font-semibold text-silver-500 uppercase tracking-[0.08em] mb-1">Key Parameters</h4>
        <table className="w-full text-sm">
          <tbody>
            <Row label="N (lab)" value={`${fmt(derived.n_rps, 2)} rev/s (${fmtInt(derived.n_rps * 60)} RPM)`} />
            <Row label="N (target)" value={`${fmt(shear.n_target, 3)} rev/s (${fmtInt(shear.n_target * 60)} RPM)`} />
            <Row label="D_imp (lab)" value={`${fmt(derived.lab_geometry.d_imp, 3)} m`} />
            <Row label="D_imp (target)" value={`${fmt(derived.target_geometry.d_imp, 3)} m`} />
            <Row label="Tip speed (lab)" value={`${fmt(labTipSpeed, 2)} m/s`} />
            <Row label="Tip speed (target)" value={`${fmt(shear.tip_speed, 2)} m/s`} />
            <Row label="Organism threshold" value={`${fmt(shear.tip_speed_threshold)} m/s`} />
            <Row label="Tip speed ratio" value={fmt(shear.tip_speed_ratio, 2)} />
          </tbody>
        </table>
      </div>
      <div>
        <h4 className="text-[11px] font-semibold text-silver-500 uppercase tracking-[0.08em] mb-1">Scoring</h4>
        <p className="text-sm text-silver-400">
          Tip speed ratio = {fmt(shear.tip_speed_ratio, 2)} &rarr; <strong style={{ color: riskColour(shear.score) }}>{riskLabel(shear.score)}</strong>
        </p>
        <p className="text-[11px] text-silver-600 mt-1">
          Thresholds: &lt;0.7 Low, 0.7&ndash;1.0 Moderate, 1.0&ndash;1.3 High, &gt;1.3 Critical
        </p>
      </div>
      <MitigationBlock domain="shear" results={results} inputs={inputs} />
    </div>
  );
}

function Co2Detail({ co2, derived, inputs, results }: {
  co2: Co2RiskResult;
  derived: DerivedParameters;
  inputs: ProcessInputs;
  results: PartialAssessmentResult;
}) {
  return (
    <div className="space-y-5 animate-fade-in">
      <h3 className="text-sm font-semibold text-silver-100 border-b border-black/[0.06] dark:border-white/[0.06] pb-2">
        CO&#x2082; Accumulation Calculation Breakdown
      </h3>
      {!co2.activated ? (
        <p className="text-sm text-silver-500">
          Detailed CO&#x2082; calculation not activated. Threshold: biomass &gt; {CO2_BIOMASS_THRESHOLD} g/L CDW or OUR &gt; {CO2_OUR_THRESHOLD} mmol/L/h.
        </p>
      ) : (
        <>
          <div>
            <h4 className="text-[11px] font-semibold text-silver-500 uppercase tracking-[0.08em] mb-1">Model</h4>
            <p className="text-sm text-silver-400">
              Simplified CO&#x2082; mass balance: CER = RQ &times; OUR; pCO&#x2082;_bulk = CER / (kLa_CO&#x2082; &times; H_CO&#x2082;); pCO&#x2082;_bottom = pCO&#x2082;_bulk + &Delta;P_hydro
            </p>
          </div>
          <div>
            <h4 className="text-[11px] font-semibold text-silver-500 uppercase tracking-[0.08em] mb-1">Key Parameters</h4>
            <table className="w-full text-sm">
              <tbody>
                <Row label="OUR peak" value={`${fmt(derived.our_peak)} mmol/L/h`} estimated={inputs.our_mode === "estimate"} />
                <Row label="CER" value={`${fmt(co2.cer ?? 0)} mmol/L/h`} estimated={inputs.our_mode === "estimate"} />
                <Row label="kLa_CO\u2082" value={`${fmt(co2.kla_co2 ?? 0)} h\u207B\u00B9`} />
                <Row label="H_CO\u2082" value={`${H_CO2} mol/L/atm`} />
                <Row label="pCO\u2082 bulk" value={`${fmt(co2.pco2_bulk ?? 0, 3)} bar`} />
                <Row label="H_liquid (target)" value={`${fmt(derived.target_geometry.h_liquid, 2)} m`} />
                <Row label="\u0394P hydrostatic" value={`${fmt((co2.dp_hydro ?? 0) / 1000, 2)} kPa`} />
                <Row label="pCO\u2082 bottom" value={`${fmt(co2.pco2_bottom ?? 0, 3)} bar`} />
              </tbody>
            </table>
          </div>
          <div>
            <h4 className="text-[11px] font-semibold text-silver-500 uppercase tracking-[0.08em] mb-1">Scoring</h4>
            <p className="text-sm text-silver-400">
              pCO&#x2082; bottom = {fmt(co2.pco2_bottom ?? 0, 3)} bar &rarr; <strong style={{ color: riskColour(co2.score) }}>{riskLabel(co2.score)}</strong>
            </p>
            <p className="text-[11px] text-silver-600 mt-1">
              Thresholds: &lt;0.08 Low, 0.08&ndash;0.15 Moderate, 0.15&ndash;0.25 High, &gt;0.25 Critical
            </p>
          </div>
        </>
      )}
      <MitigationBlock domain="co2" results={results} inputs={inputs} />
    </div>
  );
}

function HeatDetail({ heat, derived, inputs, results }: {
  heat: HeatRiskResult;
  derived: DerivedParameters;
  inputs: ProcessInputs;
  results: PartialAssessmentResult;
}) {
  const tCwOutlet = inputs.t_cw_inlet + T_CW_OUTLET_OFFSET;
  return (
    <div className="space-y-5 animate-fade-in">
      <h3 className="text-sm font-semibold text-silver-100 border-b border-black/[0.06] dark:border-white/[0.06] pb-2">
        Heat Removal Calculation Breakdown
      </h3>
      <div>
        <h4 className="text-[11px] font-semibold text-silver-500 uppercase tracking-[0.08em] mb-1">Model</h4>
        <p className="text-sm text-silver-400">
          Q_metabolic = {METABOLIC_HEAT_FACTOR} &times; OUR &times; V; Q_cool = U &times; A &times; &Delta;T_lm / 1000
        </p>
      </div>
      <div>
        <h4 className="text-[11px] font-semibold text-silver-500 uppercase tracking-[0.08em] mb-1">Key Parameters</h4>
        <table className="w-full text-sm">
          <tbody>
            <Row label="OUR peak" value={`${fmt(derived.our_peak)} mmol/L/h`} estimated={inputs.our_mode === "estimate"} />
            <Row label="V_target" value={`${fmt(derived.target_geometry.volume_m3, 3)} m\u00B3`} />
            <Row label="Q_metabolic" value={`${fmt(heat.q_metabolic, 2)} kW`} />
            <Row label="T_process" value={`${fmt(inputs.temperature)}\u00B0C`} />
            <Row label="T_cw inlet" value={`${fmt(inputs.t_cw_inlet)}\u00B0C`} />
            <Row label="T_cw outlet (assumed)" value={`${fmt(tCwOutlet)}\u00B0C`} />
            <Row label="\u0394T_lm" value={`${fmt(heat.dt_lm, 1)}\u00B0C`} />
            <Row label="U_jacket" value={`${U_JACKET} W/m\u00B2\u00B7K`} />
            <Row label="A_jacket" value={`${fmt(heat.a_jacket, 2)} m\u00B2`} />
            <Row label="Q_cool_max" value={`${fmt(heat.q_cool_max, 2)} kW`} />
            <Row label="Heat ratio" value={fmt(heat.heat_ratio, 2)} />
          </tbody>
        </table>
      </div>
      <div>
        <h4 className="text-[11px] font-semibold text-silver-500 uppercase tracking-[0.08em] mb-1">Scoring</h4>
        <p className="text-sm text-silver-400">
          Q_metabolic / Q_cool = {fmt(heat.heat_ratio, 2)} &rarr; <strong style={{ color: riskColour(heat.score) }}>{riskLabel(heat.score)}</strong>
        </p>
        <p className="text-[11px] text-silver-600 mt-1">
          Thresholds: &lt;0.60 Low, 0.60&ndash;0.85 Moderate, 0.85&ndash;1.00 High, &gt;1.00 Critical
        </p>
      </div>
      <MitigationBlock domain="heat" results={results} inputs={inputs} />
    </div>
  );
}

// --- Pilot results ---

interface PilotResults {
  klaAchievable: number;
  mixingTime: number;
  da: number | null;
  tipSpeed: number;
  pco2Bottom: number | null;
  heatKwM3: number;
}

function computePilotResults(
  inputs: ProcessInputs,
  baseDerived: DerivedParameters,
): PilotResults {
  const vPilot = pilotVolume(inputs.v_lab, inputs.v_target);
  const pilotDerived = derivedAtScale(inputs, baseDerived, vPilot, inputs.h_d_target);

  const klaAchievable = klaVantRiet(baseDerived.pv_lab, pilotDerived.vs_target);

  const pilotT = pilotDerived.target_geometry.t_diameter;
  const pilotDimp = pilotDerived.target_geometry.d_imp;
  const epsilon = baseDerived.pv_lab / RHO;
  const mixingTime = RUSZKOWSKI_CONSTANT * pilotT * pilotT / (Math.pow(epsilon, 1/3) * Math.pow(pilotDimp, 4/3));

  let da: number | null = null;
  if (inputs.process_type === "fed_batch" && inputs.feed_frequency) {
    const tau = FEED_TAU_MAP[inputs.feed_frequency];
    da = mixingTime / tau;
  }

  const dImpLab = baseDerived.lab_geometry.d_imp;
  const nTarget = baseDerived.n_rps * Math.pow(dImpLab / pilotDimp, 5/3);
  const tipSpeed = Math.PI * nTarget * pilotDimp;

  let pco2Bottom: number | null = null;
  const activated = baseDerived.biomass_cdw > CO2_BIOMASS_THRESHOLD || baseDerived.our_peak > CO2_OUR_THRESHOLD;
  if (activated) {
    const rq = inputs.organism_species === "p_pastoris" ? RQ_DEFAULTS.p_pastoris_methanol
      : inputs.organism_species === "s_cerevisiae" ? RQ_DEFAULTS.s_cerevisiae_aerobic
      : RQ_DEFAULTS.bacteria_aerobic;
    const cer = rq * baseDerived.our_peak;
    const klaO2Pilot = klaVantRiet(baseDerived.pv_lab, pilotDerived.vs_target);
    const klaCo2 = KLA_CO2_O2_RATIO * klaO2Pilot;
    const pco2BulkAtm = (cer / 1000) / (klaCo2 * H_CO2);
    const pco2Bulk = pco2BulkAtm * 1.01325;
    const hLiquid = pilotDerived.target_geometry.h_liquid;
    const dpHydro = RHO * G * hLiquid;
    pco2Bottom = pco2Bulk + (dpHydro / ATMOSPHERIC_PRESSURE_PA) * 1.01325;
  }

  const vPilotM3 = pilotDerived.target_geometry.volume_m3;
  const qMetabolic = METABOLIC_HEAT_FACTOR * baseDerived.our_peak * vPilotM3;
  const heatKwM3 = vPilotM3 > 0 ? qMetabolic / vPilotM3 : 0;

  return { klaAchievable, mixingTime, da, tipSpeed, pco2Bottom, heatKwM3 };
}

// --- Domain card icons ---

const DOMAIN_ICONS: Record<RiskDomain, React.ReactNode> = {
  otr: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v4m0 12v4M2 12h4m12 0h4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
    </svg>
  ),
  mixing: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 3v18M3 12h18M7.5 7.5l9 9M16.5 7.5l-9 9" strokeLinecap="round" />
    </svg>
  ),
  shear: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  co2: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 12a4 4 0 108 0 4 4 0 00-8 0z" />
      <path d="M3 12h2m14 0h2M5.636 5.636l1.414 1.414m9.9 9.9l1.414 1.414M12 3v2m0 14v2M5.636 18.364l1.414-1.414m9.9-9.9l1.414-1.414" />
    </svg>
  ),
  heat: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2c0 4-4 6-4 10a4 4 0 008 0c0-4-4-6-4-10z" />
      <path d="M12 18v4" strokeLinecap="round" />
    </svg>
  ),
};

const DOMAIN_LABELS: Record<RiskDomain, string> = {
  otr: "Oxygen Transfer",
  mixing: "Mixing",
  shear: "Shear Stress",
  co2: "CO\u2082",
  heat: "Heat Removal",
};

// --- Compact domain card for horizontal row ---

function DomainCard({
  domain,
  score,
  keyNumber,
  confidence,
  expanded,
  onClick,
  theme,
}: {
  domain: RiskDomain;
  score: RiskScore;
  keyNumber: string;
  confidence: Confidence;
  expanded: boolean;
  onClick: () => void;
  theme: "light" | "dark";
}) {
  const colour = riskColour(score, theme);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 min-w-0 rounded-2xl p-[1px] transition-all duration-300 text-left group relative overflow-hidden ${
        expanded ? "scale-[1.02]" : "hover:scale-[1.01]"
      }`}
      style={{
        background: expanded
          ? `linear-gradient(160deg, ${colour}40, ${colour}10 40%, rgba(255,255,255,0.06) 70%, ${colour}15)`
          : `linear-gradient(160deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03) 50%, ${colour}12)`,
      }}
    >
      {/* Inner card */}
      <div
        className="rounded-[15px] p-4 h-full relative overflow-hidden"
        style={{
          background: expanded
            ? `linear-gradient(165deg, ${colour}08, var(--card-inner-light) 40%, var(--card-inner-dark))`
            : `linear-gradient(165deg, var(--card-inner-light), var(--card-inner-dark))`,
        }}
      >
        {/* Subtle top-left risk glow */}
        <div
          className="absolute -top-8 -left-8 w-24 h-24 rounded-full blur-2xl transition-opacity duration-300"
          style={{
            background: colour,
            opacity: expanded ? 0.1 : 0.04,
          }}
        />

        {/* Icon + label */}
        <div className="relative flex items-center gap-2 mb-3">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: `${colour}15` }}
          >
            <span style={{ color: colour }} className="opacity-80 [&>svg]:w-3.5 [&>svg]:h-3.5">
              {DOMAIN_ICONS[domain]}
            </span>
          </div>
          <span className="text-xs font-semibold text-silver-200 truncate">
            {DOMAIN_LABELS[domain]}
          </span>
        </div>

        {/* Badge */}
        <div className="relative mb-2.5">
          <span className={riskBadgeClass(score)}>
            {riskLabel(score)}
          </span>
        </div>

        {/* Key number */}
        <p className="relative text-[13px] font-mono text-silver-100 truncate mb-3">{keyNumber}</p>

        {/* Bottom row: confidence + expand */}
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full"
              style={{
                background: confidence === "high_confidence" ? "#34d399"
                  : confidence === "reliable" ? "#fbbf24"
                  : "#fb923c",
              }}
            />
            <span className="text-[10px] text-silver-500 font-medium">{confidenceLabel(confidence)}</span>
          </div>
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 ${
              expanded ? "bg-black/[0.05] dark:bg-white/[0.08]" : "bg-black/[0.03] dark:bg-white/[0.04] group-hover:bg-black/[0.04] dark:bg-white/[0.06]"
            }`}
          >
            <svg
              className={`w-3 h-3 text-silver-500 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M4 6l4 4 4-4" />
            </svg>
          </div>
        </div>
      </div>
    </button>
  );
}

// --- Main dashboard component ---

export default function ResultsDashboard({ data, isExample, onBackClick }: ResultsDashboardProps) {
  const { theme } = useTheme();
  const [selectedDomain, setSelectedDomain] = useState<RiskDomain | null>(null);
  const [pvMultiplier, setPvMultiplier] = useState(1.0);
  const [showProjections, setShowProjections] = useState(true);

  const adjustedKla = useMemo(() => {
    return klaVantRiet(
      data.derived.pv_lab * pvMultiplier,
      data.derived.vs_target,
    );
  }, [data, pvMultiplier]);

  const pilot = useMemo(() => {
    return computePilotResults(data.inputs, data.derived);
  }, [data]);

  const { inputs, derived, results } = data;
  const { otr, mixing, shear, co2, heat } = results;
  const bottleneck = results.primary_bottleneck;
  const scaleRatio = inputs.v_target / inputs.v_lab;
  const vPilot = pilotVolume(inputs.v_lab, inputs.v_target);

  const labTipSpeed = Math.PI * derived.n_rps * derived.lab_geometry.d_imp;

  const heatKwM3Target = derived.target_geometry.volume_m3 > 0
    ? heat.q_metabolic / derived.target_geometry.volume_m3 : 0;
  const heatKwM3Lab = derived.lab_geometry.volume_m3 > 0
    ? (METABOLIC_HEAT_FACTOR * derived.our_peak * derived.lab_geometry.volume_m3) / derived.lab_geometry.volume_m3 : 0;

  const PV_SLIDER_OPTIONS = [
    { label: "0.25\u00D7", value: 0.25 },
    { label: "0.5\u00D7", value: 0.5 },
    { label: "1.0\u00D7", value: 1.0 },
    { label: "2.0\u00D7", value: 2.0 },
  ];

  const toggleDomain = (d: RiskDomain) =>
    setSelectedDomain(selectedDomain === d ? null : d);

  // Composite score
  const allScores: RiskScore[] = [otr.score, mixing.score, shear.score, co2.score, heat.score];
  const composite = compositeScore(allScores);
  const compositeInfo = compositeLabel(composite, theme);

  // Key numbers for each domain card
  const domainKeyNumbers: Record<RiskDomain, string> = {
    otr: `kLa ratio: ${fmt(otr.kla_ratio, 2)}`,
    mixing: mixing.da != null
      ? `\u03B8: ${fmt(mixing.theta_mix_target)}s \u00B7 Da: ${fmt(mixing.da, 3)}`
      : `\u03B8_mix: ${fmt(mixing.theta_mix_target)}s`,
    shear: `v_tip: ${fmt(shear.tip_speed)} m/s`,
    co2: co2.activated && co2.pco2_bottom != null
      ? `pCO\u2082: ${fmt(co2.pco2_bottom, 2)} bar`
      : "Not activated",
    heat: `Heat ratio: ${fmt(heat.heat_ratio * 100)}%`,
  };

  const domainScores: Record<RiskDomain, RiskScore> = {
    otr: otr.score,
    mixing: mixing.score,
    shear: shear.score,
    co2: co2.score,
    heat: heat.score,
  };

  const domainConfidence: Record<RiskDomain, Confidence> = {
    otr: otr.confidence,
    mixing: mixing.confidence,
    shear: shear.confidence,
    co2: co2.confidence,
    heat: heat.confidence,
  };

  return (
    <main className="min-h-screen relative pb-20 transition-colors duration-300" style={{ background: "var(--bg-base)" }}>
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-[20%] w-[500px] h-[500px] blur-[120px] rounded-full" style={{ background: "var(--ambient-accent)" }} />
        <div className="absolute bottom-[20%] left-[10%] w-[400px] h-[400px] blur-[100px] rounded-full" style={{ background: "var(--ambient-warm)" }} />
      </div>

      {/* Top bar */}
      <div className="relative z-10 border-b px-6 py-3 flex items-center justify-between" style={{ background: "var(--bar-bg)", backdropFilter: "blur(20px)", borderColor: "var(--bar-border)" }}>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-silver-300">Lemnisca</span>
          <span className="w-px h-4 bg-black/[0.04] dark:bg-white/[0.06]" />
          {isExample ? (
            <h1 className="text-sm text-silver-400">
              Example Assessment &mdash; <em className="text-silver-200">E.&nbsp;coli</em> fed-batch, 10&nbsp;L &rarr; 10,000&nbsp;L
            </h1>
          ) : (
            <h1 className="text-sm text-silver-400">Results Dashboard</h1>
          )}
        </div>
        <div className="flex items-center gap-3">
          {onBackClick && (
            <button
              type="button"
              onClick={onBackClick}
              className="text-sm text-silver-500 hover:text-accent transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M10 4l-4 4 4 4" />
              </svg>
              Back to inputs
            </button>
          )}
          <Link
            href="/dashboard"
            className="text-sm text-silver-500 hover:text-accent transition-colors"
          >
            Dashboard
          </Link>
          <ThemeToggle />
        </div>
      </div>

      {/* Example banner */}
      {isExample && (
        <div className="relative z-10 border-b border-accent/10 px-6 py-3 text-sm" style={{ background: "var(--accent-glow)", color: "var(--text-secondary)" }}>
          This is a pre-loaded example.{" "}
          <Link
            href="/"
            className="font-medium text-accent hover:text-accent-cool transition-colors"
          >
            Assess your own process &rarr;
          </Link>
        </div>
      )}

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* ===== SECTION 1: Risk Gauge + Context ===== */}
        <div className="glass-panel p-8 flex flex-col items-center">
          <RiskGauge score={composite} label={compositeInfo.label} colour={compositeInfo.colour} theme={theme} />

          {/* Context bar */}
          <div className="mt-6 flex items-center gap-3 text-sm text-silver-400 flex-wrap justify-center">
            <span className="font-medium text-silver-200">
              {SPECIES_LABELS[inputs.organism_species] ?? inputs.organism_species}
            </span>
            <span className="w-px h-3.5 bg-black/[0.06] dark:bg-white/[0.1]" />
            <span>{PROCESS_TYPE_LABELS[inputs.process_type] ?? inputs.process_type}</span>
            <span className="w-px h-3.5 bg-black/[0.06] dark:bg-white/[0.1]" />
            <span>{fmtInt(inputs.v_lab)} L &rarr; {fmtInt(inputs.v_target)} L</span>
            <span className="w-px h-3.5 bg-black/[0.06] dark:bg-white/[0.1]" />
            <span>
              Scale ratio: <strong className="text-silver-100 font-mono">{fmt(scaleRatio, 0)}&times;</strong>
            </span>
          </div>

          {/* Bottleneck callout */}
          {bottleneck && (
            <div className="animate-fade-in mt-8 w-full flex items-start gap-4 py-4 pl-5 pr-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-2" style={{ color: compositeInfo.colour }}>
                  Primary Bottleneck
                </p>
                <p className="text-base font-semibold text-silver-100 leading-snug mb-3">
                  {bottleneck.statement}
                </p>
                <p className="text-[10px] font-semibold text-silver-500 uppercase tracking-[0.08em] mb-1">
                  What would change this?
                </p>
                <p className="text-sm text-silver-400 leading-relaxed">{bottleneck.what_would_change}</p>
              </div>
            </div>
          )}
        </div>

        {/* ===== SECTION 3: Domain Cards Row ===== */}
        <div>
          <h2 className="text-[11px] font-semibold text-silver-500 uppercase tracking-[0.12em] mb-3">
            Risk Domains
          </h2>
          <div className="grid grid-cols-5 gap-3">
            {(["otr", "mixing", "shear", "co2", "heat"] as RiskDomain[]).map((d) => (
              <DomainCard
                key={d}
                domain={d}
                score={domainScores[d]}
                keyNumber={domainKeyNumbers[d]}
                confidence={domainConfidence[d]}
                expanded={selectedDomain === d}
                onClick={() => toggleDomain(d)}
                theme={theme}
              />
            ))}
          </div>

          {/* Expanded detail panel (accordion) */}
          {selectedDomain && (
            <div className="mt-4 rounded-2xl p-[1px]" style={{
              background: `linear-gradient(160deg, ${riskColour(domainScores[selectedDomain], theme)}25, var(--border-primary) 40%, var(--border-secondary))`,
            }}>
            <div className="rounded-[15px] p-6" style={{
              background: `linear-gradient(165deg, var(--card-inner-light), var(--card-inner-dark))`,
            }}>
              {selectedDomain === "otr" && (
                <OtrDetail otr={otr} derived={derived} inputs={inputs} results={results} />
              )}
              {selectedDomain === "mixing" && (
                <MixingDetail mixing={mixing} derived={derived} inputs={inputs} results={results} />
              )}
              {selectedDomain === "shear" && (
                <ShearDetail shear={shear} derived={derived} inputs={inputs} results={results} />
              )}
              {selectedDomain === "co2" && (
                <Co2Detail co2={co2} derived={derived} inputs={inputs} results={results} />
              )}
              {selectedDomain === "heat" && (
                <HeatDetail heat={heat} derived={derived} inputs={inputs} results={results} />
              )}
            </div>
            </div>
          )}
        </div>

        {/* ===== SECTION 4: Warnings/Flags ===== */}
        {results.flags.length > 0 && (
          <div>
            <h3 className="text-[11px] font-semibold text-silver-500 uppercase tracking-[0.08em] mb-2">Warnings</h3>
            <div className="space-y-1.5">
              {results.flags.map((f, i) => (
                <p key={i} className="text-xs text-risk-moderate glass-panel-sm border-risk-moderate/15 bg-risk-moderate/[0.04] px-3 py-2.5 flex items-start gap-2.5">
                  {f.domain && (
                    <span className="flex-shrink-0 inline-flex items-center gap-1 risk-badge risk-badge-moderate !text-[9px] !py-0.5 !px-2 uppercase">
                      {f.domain}
                    </span>
                  )}
                  <span className="leading-relaxed">{f.message}</span>
                </p>
              ))}
            </div>
          </div>
        )}

        {/* ===== SECTION 5: Collapsible Projections ===== */}
        <div>
          <button
            type="button"
            onClick={() => setShowProjections(!showProjections)}
            className="w-full flex items-center justify-between glass-panel-sm px-5 py-3.5 text-left transition-all duration-200 hover:border-black/[0.1] dark:hover:border-white/[0.1]"
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-silver-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 10h18M3 14h18M3 6h18M3 18h18" strokeLinecap="round" />
              </svg>
              <span className="text-sm font-semibold text-silver-200">Scale-Up Projections</span>
              <span className="text-[11px] text-silver-600 ml-1">Lab &rarr; Pilot &rarr; Production</span>
            </div>
            <svg
              className={`w-4 h-4 text-silver-500 transition-transform duration-200 ${showProjections ? "rotate-180" : ""}`}
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 6l4 4 4-4" />
            </svg>
          </button>

          {showProjections && (
            <div className="mt-3 glass-panel p-6 animate-fade-in space-y-6">
              <div className="overflow-hidden rounded-lg">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="text-left">Parameter</th>
                      <th className="text-right">Lab ({fmtInt(inputs.v_lab)} L)</th>
                      <th className="text-right">Pilot ({fmtInt(vPilot)} L)</th>
                      <th className="text-right">Production ({fmtInt(inputs.v_target)} L)</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono text-silver-200">
                    <tr>
                      <td className="font-sans text-silver-400">kLa achievable (h⁻¹)</td>
                      <td className="text-right">{fmt(otr.kla_lab)}</td>
                      <td className="text-right">{fmt(pilot.klaAchievable)}</td>
                      <td className="text-right">{fmt(adjustedKla ?? otr.kla_target_moderate)}</td>
                    </tr>
                    <tr>
                      <td className="font-sans text-silver-400">kLa required (h⁻¹)</td>
                      <td className="text-right">{fmt(otr.kla_required)}</td>
                      <td className="text-right">{fmt(otr.kla_required)}</td>
                      <td className="text-right">{fmt(otr.kla_required)}</td>
                    </tr>
                    <tr>
                      <td className="font-sans text-silver-400">Mixing time (s)</td>
                      <td className="text-right">{fmt(mixing.theta_mix_lab)}</td>
                      <td className="text-right">{fmt(pilot.mixingTime)}</td>
                      <td className="text-right">{fmt(mixing.theta_mix_target)}</td>
                    </tr>
                    {inputs.process_type === "fed_batch" && mixing.da != null && (
                      <tr>
                        <td className="font-sans text-silver-400">Da (mixing)</td>
                        <td className="text-right text-silver-600">&mdash;</td>
                        <td className="text-right">{fmt(pilot.da ?? 0, 3)}</td>
                        <td className="text-right">{fmt(mixing.da, 3)}</td>
                      </tr>
                    )}
                    <tr>
                      <td className="font-sans text-silver-400">Tip speed (m/s)</td>
                      <td className="text-right">{fmt(labTipSpeed)}</td>
                      <td className="text-right">{fmt(pilot.tipSpeed)}</td>
                      <td className="text-right">{fmt(shear.tip_speed)}</td>
                    </tr>
                    <tr>
                      <td className="font-sans text-silver-400">pCO₂ bottom (bar)</td>
                      <td className="text-right text-silver-600">&mdash;</td>
                      <td className="text-right">
                        {pilot.pco2Bottom != null ? fmt(pilot.pco2Bottom, 3) : <span className="text-silver-600">&mdash;</span>}
                      </td>
                      <td className="text-right">
                        {co2.pco2_bottom != null ? fmt(co2.pco2_bottom, 3) : <span className="text-silver-600">&mdash;</span>}
                      </td>
                    </tr>
                    <tr>
                      <td className="font-sans text-silver-400">Metabolic heat (kW/m³)</td>
                      <td className="text-right">{fmt(heatKwM3Lab, 2)}</td>
                      <td className="text-right">{fmt(pilot.heatKwM3, 2)}</td>
                      <td className="text-right">{fmt(heatKwM3Target, 2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* P/V Scenario selector — commented out, redundant with OTR detail card
              <div className="glass-panel-sm p-5">
                <h4 className="text-[11px] font-semibold text-silver-500 uppercase tracking-[0.08em] mb-3">
                  Adjust target P/V ratio relative to lab scale
                </h4>
                <div className="flex items-center gap-2">
                  {PV_SLIDER_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPvMultiplier(opt.value)}
                      className={`btn-toggle px-5 py-2.5 text-sm font-mono ${
                        pvMultiplier === opt.value ? "active" : ""
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-silver-600 mt-3">
                  P/V at target: <span className="font-mono text-silver-400">{fmt(derived.pv_lab * pvMultiplier)} W/m³</span> &rarr; kLa achievable: <span className="font-mono text-silver-400">{fmt(adjustedKla ?? otr.kla_target_moderate)} h⁻¹</span>
                </p>
              </div>
              */}
            </div>
          )}
        </div>
      </div>

      {/* ===== STICKY FOOTER: PDF Download ===== */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t px-6 py-3" style={{ background: "var(--bar-bg)", backdropFilter: "blur(20px)", borderColor: "var(--bar-border)" }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="text-sm text-silver-500">
            <span className="font-medium text-silver-300">{SPECIES_LABELS[inputs.organism_species] ?? inputs.organism_species}</span>
            {" \u2014 "}
            {fmtInt(inputs.v_lab)} L &rarr; {fmtInt(inputs.v_target)} L
            {" \u2014 "}
            <span style={{ color: compositeInfo.colour }} className="font-medium">{compositeInfo.label}</span>
          </div>
          <div className="flex items-center gap-3">
            {isExample ? (
              <div className="text-right relative group/pdf">
                <button
                  type="button"
                  disabled
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl border border-black/[0.06] dark:border-white/[0.06] text-silver-600 opacity-50 cursor-not-allowed bg-black/[0.02] dark:bg-white/[0.02]"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Generate PDF Report
                </button>
                <span className="absolute bottom-full right-0 mb-2 px-3 py-1.5 rounded-lg text-[10px] bg-[var(--bg-elevated)] border border-[var(--border-primary)] shadow-lg text-silver-400 opacity-0 pointer-events-none group-hover/pdf:opacity-100 transition-opacity duration-200 whitespace-nowrap z-30">
                  Sign in and run your own assessment to generate PDFs
                </span>
              </div>
            ) : (
              <GeneratePdfButton inputs={inputs} derived={derived} results={results} />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
