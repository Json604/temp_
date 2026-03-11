"use client";

import { useMemo } from "react";
import type { ProcessInputs } from "@/lib/types";
import { runAssessment } from "@/lib/engine";
import type { StoredAssessment } from "@/lib/store";
import ResultsDashboard from "@/components/ResultsDashboard";

// Pre-loaded example inputs per /docs/lemnisca_dev_spec.md Section 4.5
const EXAMPLE_INPUTS: ProcessInputs = {
  organism_class: "bacteria",
  organism_species: "e_coli",
  process_type: "fed_batch",
  v_lab: 10,
  v_target: 10_000,
  impeller_type: "rushton",
  rpm: 800,
  vvm: 1.0,
  biomass: 40,
  biomass_unit: "g_L_CDW",
  our_mode: "estimate",
  do_setpoint: 30,
  temperature: 37,
  t_cw_inlet: 12,
  feed_frequency: "1_10min",
  h_d_lab: 1.2,
  h_d_target: 2.5,
  n_impellers: 2,
};

export default function ExamplePage() {
  const data = useMemo<StoredAssessment>(() => {
    const results = runAssessment(EXAMPLE_INPUTS);
    return {
      inputs: EXAMPLE_INPUTS,
      derived: results.derived,
      results,
    };
  }, []);

  return <ResultsDashboard data={data} isExample />;
}
