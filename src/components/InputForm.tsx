"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type {
  OrganismClass,
  OrganismSpecies,
  ProcessType,
  ProcessInputs,
  ImpellerType,
  BiomassUnit,
  OurMode,
  FeedFrequency,
  Confidence,
} from "@/lib/types";
import {
  QO2_RANGES,
  CDW_OD_FACTORS,
  INPUT_DEFAULTS,
  IMPELLER_CONSTANTS,
} from "@/lib/constants";
import { runAssessment } from "@/lib/engine";
import { setAssessment } from "@/lib/store";

// --- Organism species options filtered by class ---

const BACTERIA_SPECIES: { value: OrganismSpecies; label: string }[] = [
  { value: "e_coli", label: "Escherichia coli" },
  { value: "b_subtilis", label: "Bacillus subtilis" },
  { value: "other_bacteria", label: "Other bacterium" },
];

const YEAST_SPECIES: { value: OrganismSpecies; label: string }[] = [
  { value: "s_cerevisiae", label: "Saccharomyces cerevisiae" },
  { value: "p_pastoris", label: "Pichia pastoris" },
  { value: "other_yeast", label: "Other yeast" },
];

const IMPELLER_OPTIONS: { value: ImpellerType; label: string; icon: string; desc: string }[] = [
  { value: "rushton", label: "Rushton", icon: "\u229e", desc: "High shear, high kLa" },
  { value: "pitched_blade", label: "Pitched blade", icon: "\u22bf", desc: "Axial flow, moderate shear" },
  { value: "marine", label: "Marine", icon: "\u2301", desc: "Low shear, gentle mixing" },
  { value: "unknown", label: "Unknown", icon: "?", desc: "Conservative estimates" },
];

const FEED_FREQUENCY_OPTIONS: { value: FeedFrequency; label: string }[] = [
  { value: "continuous", label: "Continuous" },
  { value: "1_10min", label: "Every 1\u201310 min" },
  { value: "10_30min", label: "Every 10\u201330 min" },
  { value: "30plus_min", label: "> 30 min intervals" },
];

const HD_PRESETS = [1.0, 1.2, 1.5, 2.0, 2.5, 3.0];

// --- Form state ---

export interface FormState {
  organism_class: OrganismClass | "";
  organism_species: OrganismSpecies | "";
  process_type: ProcessType | "";
  v_lab: string;
  v_target: string;
  vessel_model: string;
  h_d_lab: string;
  h_d_target: string;
  n_impellers: string;
  n_impellers_overridden: boolean;
  impeller_type: ImpellerType;
  rpm: string;
  vvm: string;
  biomass: string;
  biomass_unit: BiomassUnit;
  our_mode: OurMode;
  our_measured: string;
  our_estimate_override: string;
  o2_inlet: string;
  o2_outlet: string;
  gas_flow: string;
  do_setpoint: string;
  temperature: string;
  t_cw_inlet: string;
  feed_frequency: FeedFrequency | "";
  feed_interval_seconds: string;
}

const INITIAL_STATE: FormState = {
  organism_class: "",
  organism_species: "",
  process_type: "",
  v_lab: "",
  v_target: "",
  vessel_model: "",
  h_d_lab: String(INPUT_DEFAULTS.h_d_lab),
  h_d_target: "",
  n_impellers: "",
  n_impellers_overridden: false,
  impeller_type: INPUT_DEFAULTS.impeller_type,
  rpm: "",
  vvm: String(INPUT_DEFAULTS.vvm),
  biomass: "",
  biomass_unit: INPUT_DEFAULTS.biomass_unit,
  our_mode: INPUT_DEFAULTS.our_mode,
  our_measured: "",
  our_estimate_override: "",
  o2_inlet: String(INPUT_DEFAULTS.o2_inlet),
  o2_outlet: "",
  gas_flow: "",
  do_setpoint: String(INPUT_DEFAULTS.do_setpoint),
  temperature: "",
  t_cw_inlet: String(INPUT_DEFAULTS.t_cw_inlet),
  feed_frequency: "",
  feed_interval_seconds: "",
};

// --- Validation types ---

interface ValidationErrors {
  [key: string]: string | undefined;
}

interface SoftWarning {
  message: string;
}

// --- Step definitions ---

interface StepDef {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
}

const ALL_STEPS: StepDef[] = [
  { id: "a", title: "What are you scaling?", subtitle: "Organism & process type", icon: "01" },
  { id: "b", title: "How big are you going?", subtitle: "Lab & target volumes", icon: "02" },
  { id: "c", title: "Your equipment setup", subtitle: "Vessel, impeller & agitation", icon: "03" },
  { id: "d", title: "Your process at peak demand", subtitle: "Biomass, OUR, temperature", icon: "04" },
  { id: "e", title: "Your feeding strategy", subtitle: "Feed frequency & interval", icon: "05" },
];

// --- Helpers ---

function inferImpellers(hd: number): number {
  if (hd > 2.5) return 3;
  if (hd > 1.5) return 2;
  return 1;
}

function getBiomassCdw(
  biomass: number,
  unit: BiomassUnit,
  species: OrganismSpecies | ""
): number {
  if (unit === "g_L_CDW") return biomass;
  const factor = species ? CDW_OD_FACTORS[species as OrganismSpecies] : 0.38;
  return biomass * factor;
}

function speciesDisplayName(species: OrganismSpecies | ""): string {
  const all = [...BACTERIA_SPECIES, ...YEAST_SPECIES];
  return all.find((s) => s.value === species)?.label ?? "organism";
}

// --- Organism descriptions for cards ---
const ORGANISM_INFO: Record<string, { traits: string }> = {
  e_coli: { traits: "High OUR, shear tolerant" },
  b_subtilis: { traits: "Moderate OUR, sporulation" },
  s_cerevisiae: { traits: "Lower OUR, shear sensitive" },
  p_pastoris: { traits: "Dual metabolism, shear sensitive" },
  other_bacteria: { traits: "Conservative estimates" },
  other_yeast: { traits: "Conservative estimates" },
};

// --- Component ---

interface InputFormProps {
  onStateChange?: (state: FormState) => void;
}

export default function InputForm({ onStateChange }: InputFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const stepContentRef = useRef<HTMLDivElement>(null);

  // Compute visible steps (E only if fed_batch)
  const steps = useMemo(() => {
    if (form.process_type === "fed_batch") return ALL_STEPS;
    return ALL_STEPS.filter((s) => s.id !== "e");
  }, [form.process_type]);

  const totalSteps = steps.length;
  const isLastStep = currentStep >= totalSteps - 1;

  // Stream form state to parent for live preview
  useEffect(() => {
    onStateChange?.(form);
  }, [form, onStateChange]);

  // Scroll to top of step content on step change
  useEffect(() => {
    stepContentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [currentStep]);

  const set = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((prev) => {
        const next = { ...prev, [key]: value };

        if (key === "organism_class") {
          if (value === "bacteria" && !prev.temperature) {
            next.temperature = String(INPUT_DEFAULTS.temperature_bacteria);
          } else if (value === "yeast" && !prev.temperature) {
            next.temperature = String(INPUT_DEFAULTS.temperature_yeast);
          }
          next.organism_species = "";
        }

        if (key === "h_d_target" && !prev.n_impellers_overridden) {
          const hd = parseFloat(value as string);
          if (!isNaN(hd) && hd > 0) {
            next.n_impellers = String(inferImpellers(hd));
          }
        }

        return next;
      });

      if (submitted) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
    },
    [submitted]
  );

  // --- Scale ratio ---

  const scaleRatio = useMemo(() => {
    const lab = parseFloat(form.v_lab);
    const target = parseFloat(form.v_target);
    if (lab > 0 && target > 0) return target / lab;
    return null;
  }, [form.v_lab, form.v_target]);

  // --- OUR estimation ---

  const ourEstimation = useMemo(() => {
    if (form.our_mode !== "estimate") return null;
    const biomassVal = parseFloat(form.biomass);
    if (!biomassVal || biomassVal <= 0 || !form.organism_species) return null;

    const biomassCdw = getBiomassCdw(
      biomassVal,
      form.biomass_unit,
      form.organism_species
    );
    const qo2 = QO2_RANGES[form.organism_species as OrganismSpecies];
    if (!qo2) return null;

    return {
      our_min: qo2.qo2_min * biomassCdw,
      our_max: qo2.qo2_max * biomassCdw,
      our_mid: qo2.qo2_midpoint * biomassCdw,
      qo2_min: qo2.qo2_min,
      qo2_max: qo2.qo2_max,
      biomass_cdw: biomassCdw,
      species_name: speciesDisplayName(form.organism_species),
    };
  }, [form.our_mode, form.biomass, form.biomass_unit, form.organism_species]);

  // --- Exhaust gas OUR ---

  const exhaustGasOur = useMemo(() => {
    if (form.our_mode !== "exhaust_gas") return null;
    const inlet = parseFloat(form.o2_inlet);
    const outlet = parseFloat(form.o2_outlet);
    const gasFlow = parseFloat(form.gas_flow);
    const vLab = parseFloat(form.v_lab);
    if (
      isNaN(inlet) ||
      isNaN(outlet) ||
      isNaN(gasFlow) ||
      isNaN(vLab) ||
      vLab <= 0 ||
      gasFlow <= 0
    )
      return null;
    const gasFlowM3s = gasFlow / (1000 * 60);
    const our =
      ((inlet / 100 - outlet / 100) * gasFlowM3s * (1 / 22.4e-3) * 1000) /
      vLab;
    return our * 3600;
  }, [form.our_mode, form.o2_inlet, form.o2_outlet, form.gas_flow, form.v_lab]);

  // --- Estimation transparency ---

  const transparency = useMemo(() => {
    const totalParams = form.process_type === "fed_batch" ? 14 : 12;
    let entered = 0;
    let estimated = 0;

    if (form.organism_class) entered++;
    if (form.organism_species) entered++;
    if (form.process_type) entered++;
    if (form.v_lab) entered++;
    if (form.v_target) entered++;
    if (form.rpm) entered++;
    if (form.biomass) entered++;
    if (form.impeller_type !== "rushton" || form.impeller_type) entered++;

    const vvmVal = parseFloat(form.vvm);
    if (!isNaN(vvmVal)) {
      if (vvmVal !== INPUT_DEFAULTS.vvm) entered++;
      else estimated++;
    }
    const doVal = parseFloat(form.do_setpoint);
    if (!isNaN(doVal)) {
      if (doVal !== INPUT_DEFAULTS.do_setpoint) entered++;
      else estimated++;
    }
    const tempVal = parseFloat(form.temperature);
    if (!isNaN(tempVal)) entered++;
    const tcwVal = parseFloat(form.t_cw_inlet);
    if (!isNaN(tcwVal)) {
      if (tcwVal !== INPUT_DEFAULTS.t_cw_inlet) entered++;
      else estimated++;
    }

    if (form.process_type === "fed_batch") {
      if (form.feed_frequency || form.feed_interval_seconds) entered++;
    }

    const ourProvided =
      form.our_mode === "measured" || form.our_mode === "exhaust_gas";
    if (ourProvided) entered++;
    else estimated++;

    let confidence: Confidence;
    if (estimated === 0 && ourProvided) {
      confidence = "high_confidence";
    } else if (ourProvided) {
      confidence = "reliable";
    } else {
      confidence = "directional";
    }

    const confidenceLabels: Record<Confidence, string> = {
      high_confidence: "High-confidence",
      reliable: "Reliable",
      directional: "Directional",
    };

    return {
      entered,
      total: totalParams,
      estimated,
      confidence,
      label: confidenceLabels[confidence],
    };
  }, [form]);

  // --- Per-step validation ---

  const validateStep = useCallback(
    (stepId: string): ValidationErrors => {
      const errs: ValidationErrors = {};

      if (stepId === "a") {
        if (!form.organism_class) errs.organism_class = "Organism class is required.";
        if (!form.organism_species) errs.organism_species = "Organism species is required.";
        if (!form.process_type) errs.process_type = "Process type is required.";
      }

      if (stepId === "b") {
        const vLab = parseFloat(form.v_lab);
        if (!form.v_lab) errs.v_lab = "Lab working volume is required.";
        else if (vLab <= 0) errs.v_lab = "Volume must be greater than zero.";
        else if (vLab > 1000) errs.v_lab = "Lab volume must not exceed 1000 L.";

        const vTarget = parseFloat(form.v_target);
        if (!form.v_target) errs.v_target = "Target working volume is required.";
        else if (vTarget <= 0) errs.v_target = "Volume must be greater than zero.";
        else if (!isNaN(vLab) && vTarget <= vLab)
          errs.v_target = "Target scale must be larger than lab scale.";
      }

      if (stepId === "c") {
        const rpm = parseFloat(form.rpm);
        if (!form.rpm) errs.rpm = "RPM is required.";
        else if (rpm <= 0) errs.rpm = "RPM must be greater than zero.";
        else if (rpm > 3000) errs.rpm = "RPM must not exceed 3000.";

        const vvm = parseFloat(form.vvm);
        if (form.vvm && (vvm < 0.1 || vvm > 5.0))
          errs.vvm = "VVM must be between 0.1 and 5.0.";

        const hdTarget = parseFloat(form.h_d_target);
        if (form.h_d_target && (hdTarget < 0.5 || hdTarget > 4.0))
          errs.h_d_target = "H/D ratio must be between 0.5 and 4.0.";

        const hdLab = parseFloat(form.h_d_lab);
        if (form.h_d_lab && (hdLab < 0.5 || hdLab > 4.0))
          errs.h_d_lab = "H/D ratio must be between 0.5 and 4.0.";
      }

      if (stepId === "d") {
        const biomass = parseFloat(form.biomass);
        if (!form.biomass) errs.biomass = "Biomass is required.";
        else if (biomass <= 0) errs.biomass = "Biomass must be greater than zero.";
        else if (form.biomass_unit === "g_L_CDW" && biomass > 200)
          errs.biomass = `Biomass of ${biomass} g/L exceeds maximum supported value (200 g/L).`;

        const temp = parseFloat(form.temperature);
        if (!form.temperature) errs.temperature = "Temperature is required.";
        else if (temp < 15 || temp > 55)
          errs.temperature = "Temperature must be between 15\u00B0C and 55\u00B0C.";

        const dosp = parseFloat(form.do_setpoint);
        if (form.do_setpoint !== "" && (dosp < 0 || dosp > 100))
          errs.do_setpoint = "DO setpoint must be between 0% and 100%.";

        if (form.our_mode === "measured") {
          const ourMeasured = parseFloat(form.our_measured);
          if (!form.our_measured)
            errs.our_measured = "Measured OUR value is required.";
          else if (ourMeasured <= 0 || ourMeasured > 500)
            errs.our_measured = "OUR must be between 0 and 500 mmol/L/h.";
        }

        if (form.our_mode === "exhaust_gas") {
          if (!form.o2_outlet) errs.o2_outlet = "Outlet O\u2082% is required.";
          if (!form.gas_flow) errs.gas_flow = "Gas flow rate is required.";
          const inlet = parseFloat(form.o2_inlet);
          const outlet = parseFloat(form.o2_outlet);
          if (!isNaN(inlet) && !isNaN(outlet) && outlet >= inlet)
            errs.o2_outlet = "Outlet O\u2082 must be lower than inlet O\u2082.";
        }
      }

      if (stepId === "e") {
        if (form.process_type === "fed_batch") {
          if (!form.feed_frequency && !form.feed_interval_seconds)
            errs.feed_frequency =
              "Feed frequency is required for fed-batch processes.";
        }
      }

      return errs;
    },
    [form]
  );

  // --- Full validation (for submit) ---

  const validate = useCallback((): ValidationErrors => {
    let allErrs: ValidationErrors = {};
    for (const step of steps) {
      allErrs = { ...allErrs, ...validateStep(step.id) };
    }
    return allErrs;
  }, [steps, validateStep]);

  // --- Soft flags ---

  const softWarnings = useMemo((): SoftWarning[] => {
    const warnings: SoftWarning[] = [];
    const vLab = parseFloat(form.v_lab);
    const vTarget = parseFloat(form.v_target);
    const temp = parseFloat(form.temperature);
    const hdTarget = parseFloat(form.h_d_target);
    const vvm = parseFloat(form.vvm);
    const biomass = parseFloat(form.biomass);
    const biomassCdw =
      !isNaN(biomass) && biomass > 0
        ? getBiomassCdw(
            biomass,
            form.biomass_unit,
            form.organism_species as OrganismSpecies
          )
        : 0;

    if (
      !isNaN(vTarget) &&
      !isNaN(vLab) &&
      vLab > 0 &&
      vTarget / vLab > 10000
    ) {
      warnings.push({
        message:
          "Extreme scale ratio \u2014 predictions carry very high uncertainty. Intermediate scale assessment strongly recommended.",
      });
    }

    if (!isNaN(temp) && (temp < 20 || temp > 45)) {
      warnings.push({
        message:
          "Outside validated range for C* and viscosity correlations.",
      });
    }

    if (!isNaN(hdTarget) && hdTarget > 1.5) {
      warnings.push({
        message:
          "Mixing time estimate carries additional uncertainty for H/D > 1.5. Multi-impeller configurations are standard at this scale.",
      });
    }

    if (biomassCdw > 60) {
      warnings.push({
        message:
          "High biomass \u2014 Newtonian viscosity assumption may not hold. Mixing and kLa predictions carry additional uncertainty.",
      });
    }

    if (!isNaN(vvm) && (vvm > 2.0 || vvm < 0.3)) {
      warnings.push({
        message:
          "Gassed power correction carries additional uncertainty outside VVM 0.5\u20132.0.",
      });
    }

    return warnings;
  }, [
    form.v_lab,
    form.v_target,
    form.temperature,
    form.h_d_target,
    form.vvm,
    form.biomass,
    form.biomass_unit,
    form.organism_species,
  ]);

  // --- Navigation ---

  const goNext = useCallback(() => {
    const stepId = steps[currentStep].id;
    const errs = validateStep(stepId);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      const firstKey = Object.keys(errs)[0];
      document.getElementById(firstKey)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setDirection("forward");
    setCurrentStep((s) => Math.min(s + 1, totalSteps - 1));
  }, [currentStep, steps, totalSteps, validateStep]);

  const goBack = useCallback(() => {
    setDirection("back");
    setCurrentStep((s) => Math.max(s - 1, 0));
  }, []);

  const goToStep = useCallback(
    (index: number) => {
      // Only allow going to completed steps or the next step
      if (index > currentStep + 1) return;
      if (index < currentStep) {
        setDirection("back");
      } else {
        // Validate current step before jumping forward
        const stepId = steps[currentStep].id;
        const errs = validateStep(stepId);
        setErrors(errs);
        if (Object.keys(errs).length > 0) return;
        setDirection("forward");
      }
      setCurrentStep(index);
    },
    [currentStep, steps, validateStep]
  );

  // --- Submit ---

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitted(true);
      const errs = validate();
      setErrors(errs);
      if (Object.keys(errs).length > 0) {
        // Find which step has the first error and jump there
        for (let i = 0; i < steps.length; i++) {
          const stepErrs = validateStep(steps[i].id);
          if (Object.keys(stepErrs).length > 0) {
            setCurrentStep(i);
            setTimeout(() => {
              const firstKey = Object.keys(stepErrs)[0];
              document.getElementById(firstKey)?.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 100);
            return;
          }
        }
        return;
      }

      const processInputs: ProcessInputs = {
        organism_class: form.organism_class as ProcessInputs["organism_class"],
        organism_species: form.organism_species as ProcessInputs["organism_species"],
        process_type: form.process_type as ProcessInputs["process_type"],
        v_lab: parseFloat(form.v_lab),
        v_target: parseFloat(form.v_target),
        vessel_model: form.vessel_model || undefined,
        h_d_lab: parseFloat(form.h_d_lab) || INPUT_DEFAULTS.h_d_lab,
        h_d_target: parseFloat(form.h_d_target) || 1.0,
        n_impellers: parseInt(form.n_impellers) || 1,
        impeller_type: form.impeller_type,
        rpm: parseFloat(form.rpm),
        vvm: parseFloat(form.vvm) || INPUT_DEFAULTS.vvm,
        biomass: parseFloat(form.biomass),
        biomass_unit: form.biomass_unit,
        our_mode: form.our_mode,
        our_measured:
          form.our_mode === "measured"
            ? parseFloat(form.our_measured)
            : undefined,
        o2_inlet:
          form.our_mode === "exhaust_gas"
            ? parseFloat(form.o2_inlet)
            : undefined,
        o2_outlet:
          form.our_mode === "exhaust_gas"
            ? parseFloat(form.o2_outlet)
            : undefined,
        gas_flow:
          form.our_mode === "exhaust_gas"
            ? parseFloat(form.gas_flow)
            : undefined,
        do_setpoint: parseFloat(form.do_setpoint) ?? INPUT_DEFAULTS.do_setpoint,
        temperature: parseFloat(form.temperature),
        t_cw_inlet: parseFloat(form.t_cw_inlet) || INPUT_DEFAULTS.t_cw_inlet,
        feed_frequency:
          form.process_type === "fed_batch"
            ? (form.feed_frequency as ProcessInputs["feed_frequency"]) || undefined
            : undefined,
        feed_interval_seconds:
          form.process_type === "fed_batch" && form.feed_interval_seconds
            ? parseFloat(form.feed_interval_seconds)
            : undefined,
      };

      const results = runAssessment(processInputs);

      setAssessment({
        inputs: processInputs,
        derived: results.derived,
        results,
      });

      const storedEmail = localStorage.getItem("lemnisca_work_email");
      if (storedEmail) {
        fetch("/api/save-assessment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: storedEmail,
            inputs: processInputs,
            results,
          }),
        }).catch((err) => console.error("Failed to save assessment:", err));
      }

      router.push("/results");
    },
    [form, validate, steps, validateStep, ourEstimation, exhaustGasOur, softWarnings, router]
  );

  // --- Render helpers ---

  const speciesOptions =
    form.organism_class === "bacteria"
      ? BACTERIA_SPECIES
      : form.organism_class === "yeast"
        ? YEAST_SPECIES
        : [];

  const fieldError = (key: string) =>
    errors[key] ? (
      <p className="text-risk-critical text-xs mt-1.5">{errors[key]}</p>
    ) : null;

  const inputCls = (key: string, extra = "") =>
    `glass-input block w-full px-3.5 py-2.5 text-sm ${
      errors[key] ? "border-risk-critical/40 bg-risk-critical/[0.03]" : ""
    } ${extra}`;

  const organismAccent = form.organism_class === "yeast"
    ? "organism-yeast"
    : form.organism_class === "bacteria"
      ? "organism-bacteria"
      : "";

  // Current step info
  const activeStepDef = steps[currentStep];

  return (
    <form onSubmit={handleSubmit} noValidate className={`max-w-3xl mx-auto ${organismAccent}`}>
      {/* Step progress indicator */}
      <div className="mb-6">
        <div className="flex items-center gap-1">
          {steps.map((step, i) => {
            const isActive = i === currentStep;
            const isCompleted = i < currentStep;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => goToStep(i)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all duration-200 ${
                  isActive
                    ? "bg-accent/[0.1] border border-accent/25 text-accent"
                    : isCompleted
                      ? "bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] text-silver-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] cursor-pointer"
                      : "bg-transparent border border-transparent text-silver-600"
                }`}
                disabled={i > currentStep + 1}
              >
                {isCompleted ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
                    <circle cx="7" cy="7" r="6" stroke="rgba(52,211,153,0.5)" strokeWidth="1.5" />
                    <path d="M4.5 7l1.5 1.5 3.5-3.5" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                    isActive ? "bg-accent/20 text-accent" : "bg-black/[0.03] dark:bg-white/[0.04] text-silver-600"
                  }`}>
                    {step.icon}
                  </span>
                )}
                <span className="hidden sm:inline">{step.subtitle}</span>
              </button>
            );
          })}
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-0.5 rounded-full overflow-hidden" style={{ background: "var(--range-track)" }}>
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${((currentStep + 1) / totalSteps) * 100}%`,
              background: "linear-gradient(90deg, #7dd3fc, #a78bfa)",
            }}
          />
        </div>
      </div>

      {/* Soft warnings for current step */}
      {softWarnings.length > 0 && (
        <div className="mb-4 space-y-2">
          {softWarnings.map((w, i) => (
            <div
              key={i}
              className="glass-panel-sm border-risk-moderate/20 bg-risk-moderate/[0.04] text-risk-moderate text-sm px-4 py-2.5 flex items-start gap-2"
            >
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 11a1 1 0 110-2 1 1 0 010 2zm.75-3.5a.75.75 0 01-1.5 0V5a.75.75 0 011.5 0v3.5z" />
              </svg>
              <span>{w.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Step content */}
      <div ref={stepContentRef}>
        <div className="glass-panel overflow-hidden">
          {/* Step header */}
          <div className="px-6 py-5 border-b border-black/[0.04] dark:border-white/[0.04]">
            <h2 className="text-lg font-semibold text-silver-100">{activeStepDef.title}</h2>
            <p className="text-xs text-silver-500 mt-0.5">{activeStepDef.subtitle}</p>
          </div>

          {/* Step body — animated */}
          <div
            key={activeStepDef.id}
            className={`px-6 py-6 ${direction === "forward" ? "animate-step-forward" : "animate-step-back"}`}
          >
            {/* ==================== STEP A ==================== */}
            {activeStepDef.id === "a" && (
              <div className="space-y-5">
                <div id="organism_class">
                  <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-silver-500 mb-2">
                    Organism class
                  </label>
                  <div className="flex gap-2">
                    {(["bacteria", "yeast"] as OrganismClass[]).map((cls) => (
                      <button
                        key={cls}
                        type="button"
                        onClick={() => set("organism_class", cls)}
                        className={`btn-toggle px-5 py-2.5 text-sm flex items-center gap-2 ${
                          form.organism_class === cls ? "active" : ""
                        }`}
                      >
                        <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold bg-black/[0.04] dark:bg-white/[0.06]">
                          {cls === "bacteria" ? "B" : "Y"}
                        </span>
                        {cls === "bacteria" ? "Bacteria" : "Yeast"}
                      </button>
                    ))}
                  </div>
                  {fieldError("organism_class")}
                </div>

                {form.organism_class && (
                  <div id="organism_species" className="animate-fade-in">
                    <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-silver-500 mb-2">
                      Select your organism
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {speciesOptions.map((s) => {
                        const info = ORGANISM_INFO[s.value];
                        return (
                          <button
                            key={s.value}
                            type="button"
                            onClick={() => set("organism_species", s.value)}
                            className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all duration-200 ${
                              form.organism_species === s.value
                                ? "border-accent/30 bg-accent/[0.06] shadow-glow"
                                : "border-black/[0.06] dark:border-white/[0.06] bg-black/[0.01] dark:bg-white/[0.01] hover:border-black/[0.1] dark:hover:border-white/[0.12] hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
                            }`}
                          >
                            <span className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold ${
                              form.organism_species === s.value
                                ? "bg-accent/[0.15] text-accent"
                                : "bg-black/[0.03] dark:bg-white/[0.04] text-silver-500"
                            }`}>
                              {s.value.split("_").map(w => w[0].toUpperCase()).slice(0, 2).join("")}
                            </span>
                            <div className="flex-1 min-w-0">
                              <span className={`text-sm font-medium block ${
                                form.organism_species === s.value ? "text-silver-100" : "text-silver-300"
                              }`}>
                                <em>{s.label}</em>
                              </span>
                              {info && <span className="text-[11px] text-silver-600">{info.traits}</span>}
                            </div>
                            {form.organism_species === s.value && (
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
                                <circle cx="8" cy="8" r="7" stroke="rgba(125,211,252,0.4)" strokeWidth="1.5" />
                                <path d="M5 8l2 2 4-4" stroke="#7dd3fc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {fieldError("organism_species")}
                  </div>
                )}

                <div id="process_type">
                  <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-silver-500 mb-2">
                    Process type
                  </label>
                  <div className="flex gap-2">
                    {(["batch", "fed_batch"] as ProcessType[]).map((pt) => (
                      <button
                        key={pt}
                        type="button"
                        onClick={() => set("process_type", pt)}
                        className={`btn-toggle px-5 py-2.5 text-sm ${
                          form.process_type === pt ? "active" : ""
                        }`}
                      >
                        {pt === "batch" ? "Batch" : "Fed-batch"}
                      </button>
                    ))}
                  </div>
                  {fieldError("process_type")}
                </div>
              </div>
            )}

            {/* ==================== STEP B ==================== */}
            {activeStepDef.id === "b" && (
              <div>
                <div className="grid grid-cols-2 gap-4">
                  <div id="v_lab">
                    <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-silver-500 mb-2">
                      Lab working volume (L)
                    </label>
                    <input
                      type="number"
                      value={form.v_lab}
                      onChange={(e) => set("v_lab", e.target.value)}
                      className={inputCls("v_lab")}
                      placeholder="e.g. 10"
                      min={0}
                      max={1000}
                      step="any"
                    />
                    {fieldError("v_lab")}
                  </div>
                  <div id="v_target">
                    <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-silver-500 mb-2">
                      Target working volume (L)
                    </label>
                    <input
                      type="number"
                      value={form.v_target}
                      onChange={(e) => set("v_target", e.target.value)}
                      className={inputCls("v_target")}
                      placeholder="e.g. 10000"
                      min={0}
                      step="any"
                    />
                    {fieldError("v_target")}
                  </div>
                </div>
                {scaleRatio !== null && scaleRatio > 0 && (
                  <div className="mt-4 glass-panel-sm px-4 py-3 flex items-center gap-3">
                    <div className="flex items-end gap-1.5 flex-shrink-0">
                      <div className="w-3 h-5 rounded-sm border border-accent/30 bg-accent/[0.06]" />
                      <svg width="16" height="8" viewBox="0 0 16 8" fill="none" className="mb-1">
                        <path d="M0 4h12m0 0l-3-3m3 3l-3 3" stroke="rgba(167,139,250,0.5)" strokeWidth="1" strokeLinecap="round" />
                      </svg>
                      <div className="w-5 h-8 rounded-sm border border-accent-warm/30 bg-accent-warm/[0.06]" />
                    </div>
                    <div className="text-sm text-silver-400">
                      Scale ratio:{" "}
                      <span className="font-semibold text-silver-100 font-mono">
                        {scaleRatio.toLocaleString("en-GB", { maximumFractionDigits: 0 })}&times;
                      </span>
                      <span className="text-silver-600 ml-2 text-xs">
                        ({form.v_lab} L &rarr; {Number(form.v_target).toLocaleString("en-GB")} L)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ==================== STEP C ==================== */}
            {activeStepDef.id === "c" && (
              <div className="space-y-5">
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-silver-500 mb-2">
                    Lab vessel brand/model (optional)
                  </label>
                  <select
                    value={form.vessel_model}
                    onChange={(e) => set("vessel_model", e.target.value)}
                    className="glass-select w-full px-3.5 py-2.5 text-sm"
                  >
                    <option value="">Generic STR</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-silver-500 mb-2">
                    Impeller type
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {IMPELLER_OPTIONS.map((imp) => (
                      <button
                        key={imp.value}
                        type="button"
                        onClick={() => set("impeller_type", imp.value)}
                        className={`flex flex-col items-center py-3.5 px-2 rounded-xl border text-sm transition-all duration-200 ${
                          form.impeller_type === imp.value
                            ? "bg-accent/[0.08] border-accent/30 text-silver-100 shadow-glow"
                            : "bg-black/[0.02] dark:bg-white/[0.02] border-black/[0.06] dark:border-white/[0.06] text-silver-500 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] hover:border-black/[0.08] dark:hover:border-white/[0.1]"
                        }`}
                      >
                        <span className="text-2xl mb-1">{imp.icon}</span>
                        <span className="text-xs font-medium">{imp.label}</span>
                        <span className="text-[9px] text-silver-600 mt-0.5">{imp.desc}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-silver-600 mt-1.5">
                    d/T ratio: {IMPELLER_CONSTANTS[form.impeller_type].d_t_ratio} | Np: {IMPELLER_CONSTANTS[form.impeller_type].np}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div id="rpm">
                    <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-silver-500 mb-2">
                      Agitation at peak demand (RPM)
                    </label>
                    <input
                      type="number"
                      value={form.rpm}
                      onChange={(e) => set("rpm", e.target.value)}
                      className={inputCls("rpm")}
                      placeholder="At highest-demand point"
                      min={0}
                      max={3000}
                    />
                    {fieldError("rpm")}
                  </div>
                  <div id="vvm">
                    <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-silver-500 mb-2">
                      Airflow at peak demand (VVM)
                    </label>
                    <input
                      type="number"
                      value={form.vvm}
                      onChange={(e) => set("vvm", e.target.value)}
                      className={inputCls("vvm")}
                      min={0.1}
                      max={5}
                      step="0.1"
                    />
                    {fieldError("vvm")}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div id="h_d_lab">
                    <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-silver-500 mb-2">
                      H/D ratio (lab)
                    </label>
                    <input
                      type="number"
                      value={form.h_d_lab}
                      onChange={(e) => set("h_d_lab", e.target.value)}
                      className={inputCls("h_d_lab")}
                      min={0.5}
                      max={4}
                      step="0.1"
                    />
                    {fieldError("h_d_lab")}
                  </div>
                  <div id="h_d_target">
                    <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-silver-500 mb-2">
                      H/D ratio (target)
                    </label>
                    <input
                      type="number"
                      value={form.h_d_target}
                      onChange={(e) => set("h_d_target", e.target.value)}
                      className={inputCls("h_d_target")}
                      placeholder="Auto-inferred from volume"
                      min={0.5}
                      max={4}
                      step="0.1"
                    />
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {HD_PRESETS.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => set("h_d_target", String(p))}
                          className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all duration-200 ${
                            form.h_d_target === String(p)
                              ? "bg-accent/[0.1] border-accent/30 text-silver-100"
                              : "bg-black/[0.02] dark:bg-white/[0.02] border-black/[0.06] dark:border-white/[0.06] text-silver-500 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                    {fieldError("h_d_target")}
                  </div>
                </div>

                <div id="n_impellers">
                  <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-silver-500 mb-2">
                    Number of impellers (target)
                    {!form.n_impellers_overridden && form.n_impellers && (
                      <span className="text-silver-600 font-normal normal-case tracking-normal italic ml-2">
                        ~auto-inferred from H/D
                      </span>
                    )}
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => {
                          set("n_impellers", String(n));
                          set("n_impellers_overridden", true);
                        }}
                        className={`w-11 h-11 rounded-xl border text-sm font-mono transition-all duration-200 ${
                          form.n_impellers === String(n)
                            ? "bg-accent/[0.1] border-accent/30 text-silver-100"
                            : "bg-black/[0.02] dark:bg-white/[0.02] border-black/[0.06] dark:border-white/[0.06] text-silver-500 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ==================== STEP D ==================== */}
            {activeStepDef.id === "d" && (
              <div className="space-y-5">
                <div id="biomass">
                  <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-silver-500 mb-2">
                    Peak biomass
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={form.biomass}
                      onChange={(e) => set("biomass", e.target.value)}
                      className={inputCls("biomass", "flex-1")}
                      placeholder="e.g. 40"
                      min={0}
                      step="any"
                    />
                    <div className="flex border border-black/[0.06] dark:border-white/[0.06] rounded-xl overflow-hidden">
                      {(["g_L_CDW", "OD600"] as BiomassUnit[]).map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => set("biomass_unit", u)}
                          className={`px-3 py-2 text-xs transition-all duration-200 ${
                            form.biomass_unit === u
                              ? "bg-accent/[0.1] text-silver-100"
                              : "bg-black/[0.02] dark:bg-white/[0.02] text-silver-500 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                          }`}
                        >
                          {u === "g_L_CDW" ? "g/L CDW" : "OD600"}
                        </button>
                      ))}
                    </div>
                  </div>
                  {form.biomass_unit === "OD600" && form.biomass && form.organism_species && (
                    <p className="text-[11px] text-silver-600 mt-1.5 italic">
                      ~ {(parseFloat(form.biomass) * CDW_OD_FACTORS[form.organism_species as OrganismSpecies]).toFixed(1)} g/L CDW
                      (conversion factor: {CDW_OD_FACTORS[form.organism_species as OrganismSpecies]})
                    </p>
                  )}
                  {fieldError("biomass")}
                </div>

                <div id="our_mode">
                  <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-silver-500 mb-3">
                    Oxygen uptake rate (OUR) at peak demand
                  </label>
                  <p className="text-[11px] text-silver-600 mb-3 -mt-1">
                    {form.organism_species
                      ? `Typical ${speciesDisplayName(form.organism_species)} qO\u2082: ${QO2_RANGES[form.organism_species as OrganismSpecies]?.qo2_min}\u2013${QO2_RANGES[form.organism_species as OrganismSpecies]?.qo2_max} mmol/g/h`
                      : "Select your organism to see typical OUR ranges"}
                  </p>
                  <div className="space-y-2">
                    {/* Measured */}
                    <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                      form.our_mode === "measured" ? "border-accent/30 bg-accent/[0.04]" : "border-black/[0.06] dark:border-white/[0.06] hover:border-black/[0.08] dark:hover:border-white/[0.1] bg-black/[0.01] dark:bg-white/[0.01]"
                    }`}>
                      <input type="radio" name="our_mode" value="measured" checked={form.our_mode === "measured"} onChange={() => set("our_mode", "measured")} className="mt-0.5 accent-accent" />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-silver-200">Yes, I have a measured value</span>
                        <p className="text-[10px] text-silver-600 mt-0.5">Highest confidence &mdash; upgrades all domains</p>
                        {form.our_mode === "measured" && (
                          <div className="mt-3" id="our_measured">
                            <input type="number" value={form.our_measured} onChange={(e) => set("our_measured", e.target.value)} className={inputCls("our_measured")} placeholder="OUR (mmol/L/h)" min={0} max={500} step="any" />
                            {fieldError("our_measured")}
                          </div>
                        )}
                      </div>
                    </label>

                    {/* Estimate */}
                    <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                      form.our_mode === "estimate" ? "border-accent/30 bg-accent/[0.04]" : "border-black/[0.06] dark:border-white/[0.06] hover:border-black/[0.08] dark:hover:border-white/[0.1] bg-black/[0.01] dark:bg-white/[0.01]"
                    }`}>
                      <input type="radio" name="our_mode" value="estimate" checked={form.our_mode === "estimate"} onChange={() => set("our_mode", "estimate")} className="mt-0.5 accent-accent" />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-silver-200">No &mdash; estimate from my biomass</span>
                        <p className="text-[10px] text-silver-600 mt-0.5">Directional confidence for OTR domain</p>
                        {form.our_mode === "estimate" && (
                          <div className="mt-3">
                            {ourEstimation ? (
                              <div className="glass-panel-sm border-accent/20 bg-accent/[0.04] px-4 py-3 text-sm text-accent italic">
                                OUR estimated: ~{ourEstimation.our_min.toFixed(0)}&ndash;{ourEstimation.our_max.toFixed(0)} mmol/L/h
                                <span className="text-accent/70 block text-xs mt-1">
                                  Based on {ourEstimation.species_name} qO&#x2082; range {ourEstimation.qo2_min}&ndash;{ourEstimation.qo2_max} mmol/g/h &times; your {ourEstimation.biomass_cdw.toFixed(1)} g/L biomass
                                </span>
                                <span className="text-accent/70 block text-xs">Midpoint used: ~{ourEstimation.our_mid.toFixed(0)} mmol/L/h</span>
                              </div>
                            ) : (
                              <p className="text-xs text-silver-600 italic">Enter biomass and select species to see OUR estimate.</p>
                            )}
                            <div className="mt-3">
                              <label className="text-[11px] text-silver-600">Override estimate (optional):</label>
                              <input type="number" value={form.our_estimate_override} onChange={(e) => set("our_estimate_override", e.target.value)} className={inputCls("our_estimate_override")} placeholder="mmol/L/h" min={0} step="any" />
                            </div>
                          </div>
                        )}
                      </div>
                    </label>

                    {/* Exhaust gas */}
                    <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                      form.our_mode === "exhaust_gas" ? "border-accent/30 bg-accent/[0.04]" : "border-black/[0.06] dark:border-white/[0.06] hover:border-black/[0.08] dark:hover:border-white/[0.1] bg-black/[0.01] dark:bg-white/[0.01]"
                    }`}>
                      <input type="radio" name="our_mode" value="exhaust_gas" checked={form.our_mode === "exhaust_gas"} onChange={() => set("our_mode", "exhaust_gas")} className="mt-0.5 accent-accent" />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-silver-200">I have exhaust gas data</span>
                        <p className="text-[10px] text-silver-600 mt-0.5">High confidence &mdash; calculated from mass balance</p>
                        {form.our_mode === "exhaust_gas" && (
                          <div className="mt-3 space-y-3">
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="text-[11px] text-silver-600">Inlet O&#x2082; (%)</label>
                                <input type="number" value={form.o2_inlet} onChange={(e) => set("o2_inlet", e.target.value)} className={inputCls("o2_inlet")} min={0} max={100} step="0.1" />
                              </div>
                              <div id="o2_outlet">
                                <label className="text-[11px] text-silver-600">Outlet O&#x2082; (%)</label>
                                <input type="number" value={form.o2_outlet} onChange={(e) => set("o2_outlet", e.target.value)} className={inputCls("o2_outlet")} min={0} max={100} step="0.1" />
                                {fieldError("o2_outlet")}
                              </div>
                              <div id="gas_flow">
                                <label className="text-[11px] text-silver-600">Gas flow (L/min)</label>
                                <input type="number" value={form.gas_flow} onChange={(e) => set("gas_flow", e.target.value)} className={inputCls("gas_flow")} min={0} step="any" />
                                {fieldError("gas_flow")}
                              </div>
                            </div>
                            {exhaustGasOur !== null && exhaustGasOur > 0 && (
                              <div className="glass-panel-sm border-accent/20 bg-accent/[0.04] px-4 py-3 text-sm text-accent italic">
                                OUR calculated: ~{exhaustGasOur.toFixed(1)} mmol/L/h
                                <span className="text-accent/70 block text-xs mt-0.5">Calculated from exhaust gas data</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                </div>

                <div id="do_setpoint">
                  <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-silver-500 mb-2">
                    DO setpoint (%)
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input type="range" min={0} max={100} value={form.do_setpoint || 30} onChange={(e) => set("do_setpoint", e.target.value)} className="w-full accent-accent h-1.5" />
                      <div className="flex justify-between text-[9px] text-silver-700 mt-1 px-0.5">
                        <span>0%</span>
                        <span className="text-risk-low/50">20&ndash;40% optimal</span>
                        <span>100%</span>
                      </div>
                    </div>
                    <input type="number" value={form.do_setpoint} onChange={(e) => set("do_setpoint", e.target.value)} className={inputCls("do_setpoint", "w-20")} min={0} max={100} />
                  </div>
                  {fieldError("do_setpoint")}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div id="temperature">
                    <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-silver-500 mb-2">
                      Process temperature (&deg;C)
                    </label>
                    <input
                      type="number"
                      value={form.temperature}
                      onChange={(e) => set("temperature", e.target.value)}
                      className={inputCls("temperature")}
                      placeholder={form.organism_class === "yeast" ? "Default: 30" : "Default: 37"}
                      min={15}
                      max={55}
                    />
                    {fieldError("temperature")}
                  </div>
                  <div id="t_cw_inlet">
                    <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-silver-500 mb-2">
                      Cooling water inlet (&deg;C)
                    </label>
                    <input type="number" value={form.t_cw_inlet} onChange={(e) => set("t_cw_inlet", e.target.value)} className={inputCls("t_cw_inlet")} min={0} max={40} />
                  </div>
                </div>
              </div>
            )}

            {/* ==================== STEP E ==================== */}
            {activeStepDef.id === "e" && (
              <div className="space-y-5">
                <div id="feed_frequency">
                  <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-silver-500 mb-2">
                    Feed frequency
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {FEED_FREQUENCY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => set("feed_frequency", opt.value)}
                        className={`btn-toggle px-3 py-2.5 text-sm ${
                          form.feed_frequency === opt.value ? "active" : ""
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {fieldError("feed_frequency")}
                </div>

                <div id="feed_interval_seconds">
                  <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-silver-500 mb-2">
                    Feed interval override (seconds, optional)
                  </label>
                  <input
                    type="number"
                    value={form.feed_interval_seconds}
                    onChange={(e) => set("feed_interval_seconds", e.target.value)}
                    className={inputCls("feed_interval_seconds")}
                    placeholder="If provided, used directly as \u03C4_feed"
                    min={0}
                    step="any"
                  />
                  <p className="text-[11px] text-silver-600 mt-1.5">
                    When provided, this overrides the selector above.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Navigation footer */}
          <div className="px-6 py-4 border-t border-black/[0.04] dark:border-white/[0.04] flex items-center justify-between">
            <div className="flex items-center gap-3">
              {currentStep > 0 && (
                <button
                  type="button"
                  onClick={goBack}
                  className="flex items-center gap-1.5 text-sm text-silver-400 hover:text-silver-200 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M8.5 3.5L5 7l3.5 3.5" />
                  </svg>
                  Back
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Transparency info */}
              <span className="text-[11px] text-silver-600 hidden sm:inline">
                <span className={`font-medium ${
                  transparency.confidence === "high_confidence"
                    ? "text-risk-low"
                    : transparency.confidence === "reliable"
                      ? "text-accent"
                      : "text-risk-moderate"
                }`}>
                  {transparency.label}
                </span>
                {" "}&middot; {transparency.entered}/{transparency.total} params
              </span>

              {isLastStep ? (
                <button
                  type="submit"
                  className="btn-primary px-6 py-2.5 text-sm font-medium flex items-center gap-2"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Run risk assessment
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M5.5 3.5L9 7l-3.5 3.5" />
                    </svg>
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={goNext}
                  className="btn-primary px-6 py-2.5 text-sm font-medium flex items-center gap-2"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Continue
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M5.5 3.5L9 7l-3.5 3.5" />
                    </svg>
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
