import { CABLE_TYPE_SLUGS, CABLE_TYPE_TAXONOMY } from "./taxonomies";
import type { Option, StepDefinition, WizardState } from "./wizardEngine";

const useCaseOptions: Option[] = [
  {
    id: "use-case-home",
    label: "Ιδιωτική",
    value: { pa_use_case: ["oikiaki"] },
  },
  {
    id: "use-case-public",
    label: "Δημόσια",
    value: { pa_use_case: ["epaggelmatiki", "dimosia"] },
  },
];

const phaseOptions: Option[] = [
  {
    id: "phase-mono",
    label: "Μονοφασική",
    value: { pa_phase: "monofasiki" },
  },
  {
    id: "phase-tri",
    label: "Τριφασική",
    value: { pa_phase: "trifasiki" },
  },
];

const powerMonoOptions: Option[] = [
  { id: "power-3-7", label: "3.7kW", value: { pa_power: "3-7kw" } },
  { id: "power-7-4", label: "7.4kW", value: { pa_power: "7-4kw" } },
];

const powerTriOptions: Option[] = [
  { id: "power-11", label: "11kW", value: { pa_power: "11kw" } },
  { id: "power-22", label: "22kW", value: { pa_power: "22kw" } },
];

const smartOptions: Option[] = [
  { id: "smart-yes", label: "Ναι (Smart)", value: { pa_smart: "yes" } },
  { id: "smart-no", label: "Όχι", value: { pa_smart: "no" } },
];

const connectorOptions: Option[] = [
  { id: "connectors-1", label: "1 θέση φόρτισης", value: { pa_connectors: "1" } },
  { id: "connectors-2", label: "2 θέσεις φόρτισης", value: { pa_connectors: "2" } },
];

const cableOptions: Option[] = [
  {
    id: "cable-with",
    label: "Με καλώδιο",
    value: { [CABLE_TYPE_TAXONOMY]: CABLE_TYPE_SLUGS.withCable },
  },
  {
    id: "cable-without",
    label: "Χωρίς καλώδιο",
    value: { [CABLE_TYPE_TAXONOMY]: CABLE_TYPE_SLUGS.withoutCable },
  },
];

const ENABLE_DC_MODE = false;

const chargingModeOptions: Option[] = [
  { id: "mode-3-ac", label: "Mode 3 (AC)", value: { pa_charging_mode: "mode-3-ac" } },
  ...(ENABLE_DC_MODE
    ? [{ id: "mode-4-dc", label: "Mode 4 (DC)", value: { pa_charging_mode: "mode-4-dc" } }]
    : []),
];

const getUseCaseValues = (state: WizardState): string[] => {
  const value = state.answers.pa_use_case;
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
};

export const stepDefinitions: StepDefinition[] = [
  {
    id: "use_case",
    title: "Πού θα χρησιμοποιηθεί ο φορτιστής;",
    options: () => useCaseOptions,
  },
  {
    id: "phase",
    title: "Τι παροχή διαθέτετε;",
    options: () => phaseOptions,
  },
  {
    id: "power",
    title: "Ποια ισχύς σας ταιριάζει;",
    helper: "Η ισχύς εξαρτάται από την παροχή σας.",
    options: (state) =>
      state.answers.pa_phase === "trifasiki" ? powerTriOptions : powerMonoOptions,
  },
  {
    id: "smart",
    title: "Θέλετε smart λειτουργίες;",
    options: () => smartOptions,
  },
  {
    id: "connectors",
    title: "Πόσες παροχές φόρτισης (συνδέσεις) χρειάζεστε;",
    options: () => connectorOptions,
    isActive: (state) => {
      const useCases = getUseCaseValues(state);
      return useCases.includes("dimosia") || useCases.includes("epaggelmatiki");
    },
  },
  {
    id: "cable",
    title: "Με καλώδιο ή χωρίς;",
    options: () => cableOptions,
  },
  {
    id: "charging_mode",
    title: "Τι τύπο φόρτισης χρειάζεστε;",
    options: () => chargingModeOptions,
    isActive: (state) => {
      const useCases = getUseCaseValues(state);
      return useCases.includes("dimosia") || useCases.includes("epaggelmatiki");
    },
  },
];
