"use client";

import { useMemo } from "react";
import type {
  ProcessInputs,
  OrganismClass,
  OrganismSpecies,
  ProcessType,
  RiskScore,
  Confidence,
} from "@/lib/types";
import { runAssessment } from "@/lib/engine";
import type { PartialAssessmentResult } from "@/lib/engine";
import { INPUT_DEFAULTS } from "@/lib/constants";

// Mirrors FormState from InputForm — kept in sync manually
export interface PreviewFormState {
  organism_class: OrganismClass | "";
  organism_species: OrganismSpecies | "";
  process_type: ProcessType | "";
  v_lab: string;
  v_target: string;
  h_d_lab: string;
  h_d_target: string;
  n_impellers: string;
  impeller_type: string;
  rpm: string;
  vvm: string;
  biomass: string;
  biomass_unit: string;
  our_mode: string;
  our_measured: string;
  o2_inlet: string;
  o2_outlet: string;
  gas_flow: string;
  do_setpoint: string;
  temperature: string;
  t_cw_inlet: string;
  feed_frequency: string;
  feed_interval_seconds: string;
  // extra
  vessel_model?: string;
  our_estimate_override?: string;
  n_impellers_overridden?: boolean;
}

interface LivePreviewProps {
  formState: PreviewFormState | null;
}

// Risk domain display config
const DOMAIN_CONFIG: {
  key: string;
  label: string;
  icon: string;
  colorVar: string;
}[] = [
  { key: "otr", label: "Oxygen Transfer", icon: "O\u2082", colorVar: "otr" },
  { key: "mixing", label: "Mixing", icon: "\u21bb", colorVar: "mixing" },
  { key: "shear", label: "Shear Stress", icon: "\u26a1", colorVar: "shear" },
  { key: "co2", label: "CO\u2082 Accumulation", icon: "CO\u2082", colorVar: "co2" },
  { key: "heat", label: "Heat Removal", icon: "\u0394T", colorVar: "heat" },
];

function getRiskColor(score: RiskScore): string {
  switch (score) {
    case "low": return "text-risk-low";
    case "moderate": return "text-risk-moderate";
    case "high": return "text-risk-high";
    case "critical": return "text-risk-critical";
  }
}

function getRiskBg(score: RiskScore): string {
  switch (score) {
    case "low": return "bg-risk-low/[0.08] border-risk-low/20";
    case "moderate": return "bg-risk-moderate/[0.08] border-risk-moderate/20";
    case "high": return "bg-risk-high/[0.08] border-risk-high/20";
    case "critical": return "bg-risk-critical/[0.08] border-risk-critical/20";
  }
}

function getRiskGlow(score: RiskScore): string {
  switch (score) {
    case "low": return "risk-glow-low";
    case "moderate": return "risk-glow-moderate";
    case "high": return "risk-glow-high";
    case "critical": return "risk-glow-critical";
  }
}

function getConfidenceColor(c: Confidence): string {
  switch (c) {
    case "high_confidence": return "text-risk-low";
    case "reliable": return "text-accent";
    case "directional": return "text-risk-moderate";
  }
}

function getConfidenceLabel(c: Confidence): string {
  switch (c) {
    case "high_confidence": return "High-confidence";
    case "reliable": return "Reliable";
    case "directional": return "Directional";
  }
}

function getDomainKeyNumber(key: string, results: PartialAssessmentResult): string {
  switch (key) {
    case "otr": return `kLa ratio: ${results.otr.kla_ratio.toFixed(2)}`;
    case "mixing": return `\u03B8_mix: ${results.mixing.theta_mix_target.toFixed(0)}s`;
    case "shear": return `Tip: ${results.shear.tip_speed.toFixed(1)} m/s`;
    case "co2": return results.co2.activated && results.co2.pco2_bottom
      ? `pCO\u2082: ${results.co2.pco2_bottom.toFixed(3)} bar`
      : "Below threshold";
    case "heat": return `Q ratio: ${results.heat.heat_ratio.toFixed(2)}`;
    default: return "";
  }
}

function getDomainScore(key: string, results: PartialAssessmentResult): RiskScore {
  switch (key) {
    case "otr": return results.otr.score;
    case "mixing": return results.mixing.score;
    case "shear": return results.shear.score;
    case "co2": return results.co2.score;
    case "heat": return results.heat.score;
    default: return "low";
  }
}

export default function LivePreview({ formState }: LivePreviewProps) {
  // Count filled fields for progress
  const progress = useMemo(() => {
    if (!formState) return { filled: 0, total: 7, percentage: 0 };
    let filled = 0;
    const total = 7; // minimum required fields
    if (formState.organism_class) filled++;
    if (formState.organism_species) filled++;
    if (formState.v_lab && parseFloat(formState.v_lab) > 0) filled++;
    if (formState.v_target && parseFloat(formState.v_target) > 0) filled++;
    if (formState.rpm && parseFloat(formState.rpm) > 0) filled++;
    if (formState.biomass && parseFloat(formState.biomass) > 0) filled++;
    if (formState.temperature && parseFloat(formState.temperature) > 0) filled++;
    return { filled, total, percentage: Math.round((filled / total) * 100) };
  }, [formState]);

  // Try to run assessment with available data
  const liveResults = useMemo<PartialAssessmentResult | null>(() => {
    if (!formState) return null;

    // Minimum required: organism_class, organism_species, v_lab, v_target, rpm, biomass, temperature
    const oc = formState.organism_class;
    const os = formState.organism_species;
    const vLab = parseFloat(formState.v_lab);
    const vTarget = parseFloat(formState.v_target);
    const rpm = parseFloat(formState.rpm);
    const biomass = parseFloat(formState.biomass);
    const temp = parseFloat(formState.temperature);

    if (
      !oc || !os ||
      isNaN(vLab) || vLab <= 0 ||
      isNaN(vTarget) || vTarget <= vLab ||
      isNaN(rpm) || rpm <= 0 ||
      isNaN(biomass) || biomass <= 0 ||
      isNaN(temp) || temp <= 0
    ) {
      return null;
    }

    try {
      const inputs: ProcessInputs = {
        organism_class: oc as ProcessInputs["organism_class"],
        organism_species: os as ProcessInputs["organism_species"],
        process_type: (formState.process_type || "batch") as ProcessInputs["process_type"],
        v_lab: vLab,
        v_target: vTarget,
        h_d_lab: parseFloat(formState.h_d_lab) || INPUT_DEFAULTS.h_d_lab,
        h_d_target: parseFloat(formState.h_d_target) || 1.0,
        n_impellers: parseInt(formState.n_impellers) || 1,
        impeller_type: (formState.impeller_type || "rushton") as ProcessInputs["impeller_type"],
        rpm,
        vvm: parseFloat(formState.vvm) || INPUT_DEFAULTS.vvm,
        biomass,
        biomass_unit: (formState.biomass_unit || "g_L_CDW") as ProcessInputs["biomass_unit"],
        our_mode: (formState.our_mode || "estimate") as ProcessInputs["our_mode"],
        our_measured: formState.our_mode === "measured" && formState.our_measured
          ? parseFloat(formState.our_measured)
          : undefined,
        o2_inlet: formState.our_mode === "exhaust_gas" && formState.o2_inlet
          ? parseFloat(formState.o2_inlet)
          : undefined,
        o2_outlet: formState.our_mode === "exhaust_gas" && formState.o2_outlet
          ? parseFloat(formState.o2_outlet)
          : undefined,
        gas_flow: formState.our_mode === "exhaust_gas" && formState.gas_flow
          ? parseFloat(formState.gas_flow)
          : undefined,
        do_setpoint: parseFloat(formState.do_setpoint) || INPUT_DEFAULTS.do_setpoint,
        temperature: temp,
        t_cw_inlet: parseFloat(formState.t_cw_inlet) || INPUT_DEFAULTS.t_cw_inlet,
        feed_frequency: formState.process_type === "fed_batch" && formState.feed_frequency
          ? formState.feed_frequency as ProcessInputs["feed_frequency"]
          : undefined,
        feed_interval_seconds: formState.process_type === "fed_batch" && formState.feed_interval_seconds
          ? parseFloat(formState.feed_interval_seconds)
          : undefined,
      };

      return runAssessment(inputs);
    } catch {
      return null;
    }
  }, [formState]);

  // Confidence tracking
  const confidence = useMemo(() => {
    if (!formState) return { level: "directional" as Confidence, label: "Directional", tip: "Fill in core parameters to begin" };

    const ourProvided = formState.our_mode === "measured" || formState.our_mode === "exhaust_gas";

    let estimated = 0;
    const vvmVal = parseFloat(formState.vvm);
    if (!isNaN(vvmVal) && vvmVal === INPUT_DEFAULTS.vvm) estimated++;
    const doVal = parseFloat(formState.do_setpoint);
    if (!isNaN(doVal) && doVal === INPUT_DEFAULTS.do_setpoint) estimated++;
    const tcwVal = parseFloat(formState.t_cw_inlet);
    if (!isNaN(tcwVal) && tcwVal === INPUT_DEFAULTS.t_cw_inlet) estimated++;
    if (!ourProvided) estimated++;

    let level: Confidence;
    let tip: string;
    if (estimated === 0 && ourProvided) {
      level = "high_confidence";
      tip = "All parameters user-provided";
    } else if (ourProvided) {
      level = "reliable";
      tip = `${estimated} parameter${estimated > 1 ? "s" : ""} using defaults`;
    } else {
      level = "directional";
      tip = "Provide measured OUR to upgrade confidence";
    }

    return { level, label: getConfidenceLabel(level), tip };
  }, [formState]);

  // Scale ratio
  const scaleRatio = useMemo(() => {
    if (!formState) return null;
    const lab = parseFloat(formState.v_lab);
    const target = parseFloat(formState.v_target);
    if (lab > 0 && target > lab) return target / lab;
    return null;
  }, [formState]);

  return (
    <div className="sticky top-8 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-silver-500">
          Live Risk Preview
        </h3>
        <div className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
          liveResults ? "border-risk-low/30 text-risk-low bg-risk-low/[0.06]" : "border-silver-700 text-silver-600"
        }`} style={{ ...(!liveResults ? { background: "var(--input-bg)" } : {}) }}>
          {liveResults ? "LIVE" : "AWAITING DATA"}
        </div>
      </div>

      {/* Confidence Meter */}
      <div className="glass-panel-sm p-4">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] text-silver-500 uppercase tracking-[0.08em]">Assessment Confidence</span>
          <span className={`text-xs font-medium ${getConfidenceColor(confidence.level)}`}>
            {confidence.label}
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ background: "var(--range-track)" }}>
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${confidence.level === "high_confidence" ? 100 : confidence.level === "reliable" ? 66 : 33}%`,
              background: confidence.level === "high_confidence"
                ? "linear-gradient(90deg, #34d399, #5bbaa8)"
                : confidence.level === "reliable"
                  ? "linear-gradient(90deg, #e2a052, #5bbaa8)"
                  : "linear-gradient(90deg, #fbbf24, #fb923c)",
            }}
          />
        </div>
        <p className="text-[10px] text-silver-600">{confidence.tip}</p>
      </div>

      {/* Scale Visualisation */}
      {scaleRatio && (
        <div className="glass-panel-sm p-4">
          <div className="flex items-end justify-center gap-6">
            {/* Lab vessel */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <svg width="28" height="40" viewBox="0 0 28 40" fill="none">
                  <rect x="4" y="8" width="20" height="28" rx="3" stroke="rgba(226,160,82,0.3)" strokeWidth="1.5" fill="rgba(226,160,82,0.04)" />
                  <rect x="8" y="4" width="12" height="6" rx="1" stroke="rgba(226,160,82,0.2)" strokeWidth="1" fill="none" />
                  <line x1="4" y1="20" x2="24" y2="20" stroke="rgba(226,160,82,0.15)" strokeWidth="1" strokeDasharray="2 2" />
                </svg>
              </div>
              <span className="text-[10px] text-silver-500 mt-1 font-mono">
                {formState?.v_lab || "?"} L
              </span>
              <span className="text-[9px] text-silver-600">Lab</span>
            </div>

            {/* Arrow */}
            <div className="flex flex-col items-center pb-6">
              <svg width="32" height="12" viewBox="0 0 32 12" fill="none">
                <path d="M0 6h28m0 0l-4-4m4 4l-4 4" stroke="rgba(74,158,142,0.4)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span className="text-[11px] font-mono text-accent-warm font-medium mt-0.5">
                {scaleRatio.toLocaleString("en-GB", { maximumFractionDigits: 0 })}&times;
              </span>
            </div>

            {/* Target vessel */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <svg width="44" height="60" viewBox="0 0 44 60" fill="none">
                  <rect x="4" y="8" width="36" height="48" rx="4" stroke="rgba(74,158,142,0.3)" strokeWidth="1.5" fill="rgba(74,158,142,0.04)" />
                  <rect x="12" y="2" width="20" height="8" rx="2" stroke="rgba(74,158,142,0.2)" strokeWidth="1" fill="none" />
                  <line x1="4" y1="32" x2="40" y2="32" stroke="rgba(74,158,142,0.15)" strokeWidth="1" strokeDasharray="2 2" />
                </svg>
              </div>
              <span className="text-[10px] text-silver-500 mt-1 font-mono">
                {formState?.v_target ? Number(formState.v_target).toLocaleString("en-GB") : "?"} L
              </span>
              <span className="text-[9px] text-silver-600">Target</span>
            </div>
          </div>
        </div>
      )}

      {/* Data Completeness */}
      <div className="glass-panel-sm p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] text-silver-500 uppercase tracking-[0.08em]">Core Parameters</span>
          <span className="text-xs font-mono text-silver-300">{progress.filled}/{progress.total}</span>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: progress.total }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                i < progress.filled
                  ? "bg-accent/60"
                  : ""
              }`}
              style={i >= progress.filled ? { background: "var(--range-track)" } : {}}
            />
          ))}
        </div>
      </div>

      {/* Risk Domain Cards */}
      <div className="space-y-2">
        {DOMAIN_CONFIG.map((domain) => {
          const hasResults = liveResults !== null;
          const score = hasResults ? getDomainScore(domain.key, liveResults!) : null;
          const keyNumber = hasResults ? getDomainKeyNumber(domain.key, liveResults!) : null;

          return (
            <div
              key={domain.key}
              className={`glass-panel-sm p-3.5 transition-all duration-300 border ${
                hasResults && score
                  ? `${getRiskBg(score)} ${getRiskGlow(score)}`
                  : "opacity-40"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className={`text-sm font-mono w-8 text-center ${
                    hasResults && score ? getRiskColor(score) : "text-silver-700"
                  }`}>
                    {domain.icon}
                  </span>
                  <div>
                    <span className="text-xs font-medium text-silver-300">{domain.label}</span>
                    {keyNumber && (
                      <p className="text-[10px] text-silver-500 font-mono mt-0.5">{keyNumber}</p>
                    )}
                  </div>
                </div>
                {hasResults && score ? (
                  <span className={`risk-badge risk-badge-${score}`}>
                    {score}
                  </span>
                ) : (
                  <span className="text-[10px] text-silver-600 font-mono">&mdash;</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottleneck Statement */}
      {liveResults && (
        <div className="glass-panel-sm p-4 border-accent/10">
          <p className="text-[10px] text-silver-500 uppercase tracking-[0.08em] mb-1.5">Primary Bottleneck</p>
          <p className="text-xs text-silver-200 leading-relaxed">
            {liveResults.primary_bottleneck.statement}
          </p>
          <p className="text-[10px] text-accent/70 mt-2 italic leading-relaxed">
            {liveResults.primary_bottleneck.what_would_change}
          </p>
        </div>
      )}

      {/* Hint when no results */}
      {!liveResults && progress.filled > 0 && (
        <div className="text-center py-3">
          <p className="text-[11px] text-accent/70 italic">
            {progress.total - progress.filled} more parameter{progress.total - progress.filled > 1 ? "s" : ""} needed for live preview
          </p>
        </div>
      )}
    </div>
  );
}
