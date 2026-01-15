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
  { id: "smart-yes", label: "Ναι", value: { pa_smart: "yes" } },
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

const privateChargingModeOptions: Option[] = [
  { id: "mode-2", label: "Mode 2", value: { charging_mode: "mode-2" } },
  { id: "mode-3", label: "Mode 3", value: { charging_mode: "mode-3-ac" } },
];

const publicChargingModeOptions: Option[] = [
  { id: "mode-3-ac", label: "Mode 3 AC", value: { charging_mode: "mode-3-ac" } },
  { id: "mode-4-dc", label: "Mode 4 DC", value: { charging_mode: "mode-4-dc" } },
];

const mountingOptions: Option[] = [
  {
    id: "mounting-wall",
    label: "Επίτοιχη",
    value: { pa_mounting: ["epitoichi"] },
  },
  {
    id: "mounting-floor",
    label: "Επιδαπέδια",
    value: { pa_mounting: ["epidapedio"] },
  },
  {
    id: "mounting-undecided",
    label: "Δεν έχω αποφασίσει",
    value: {},
  },
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
    title: "Είναι για ιδιωτική ή δημόσια φόρτιση?",
    tooltip:
      "Δημόσια φόρτιση\nΣημείο φόρτισης προσβάσιμο στο κοινό, συνήθως σε πάρκινγκ, βενζινάδικα, εμπορικά κέντρα ή αυτοκινητόδρομους.\n\nΙδιωτική φόρτιση\nΣημείο φόρτισης για προσωπική ή επαγγελματική χρήση, όπως σε κατοικίες ή χώρους επιχειρήσεων.",
    options: () => useCaseOptions,
  },
  {
    id: "charging_mode",
    title: "Τι Mode θέλεις να είναι ο φορτιστής;",
    tooltip:
      "Mode 2\nΦόρτιση από απλή πρίζα με φορητό καλώδιο/κουτί ελέγχου. Πιο αργή.\n\nMode 3\nΦόρτιση από σταθερό wallbox AC. Η πιο συνηθισμένη για σπίτι/επιχείρηση.\n\nMode 4\nΤαχυφόρτιση DC (rapid). Συνήθως για δημόσια σημεία.",
    options: (state) => {
      const useCases = getUseCaseValues(state);
      if (useCases.includes("oikiaki")) {
        return privateChargingModeOptions;
      }
      if (useCases.includes("dimosia") || useCases.includes("epaggelmatiki")) {
        return publicChargingModeOptions;
      }
      return privateChargingModeOptions;
    },
  },
  {
    id: "mounting",
    title: "Τι τοποθέτηση επιθυμείς;",
    options: () => mountingOptions,
  },
  {
    id: "phase",
    title: "Τι τύπο παροχής έχεις?",
    tooltip:
      "Η παροχή ρεύματος αναγράφεται στον λογαριασμό του ρεύματος.\n\nΜονοφασική παροχή\nΣυνήθως σε κατοικίες και μικρές εγκαταστάσεις.\n\nΤριφασική παροχή\nΣυνήθως σε επιχειρήσεις ή εγκαταστάσεις με αυξημένες ανάγκες ισχύος.",
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
    tooltip:
      "Smart λειτουργίες σημαίνουν ότι ο φορτιστής μπορεί:\nνα συνδέεται με εφαρμογή στο κινητό\nνα ελέγχεται και να παρακολουθείται απομακρυσμένα\nνα προγραμματίζει ώρες φόρτισης\nνα εμφανίζει στατιστικά κατανάλωσης\n\n💡 Ιδανικό αν θέλετε έλεγχο, ευελιξία και καλύτερη διαχείριση ενέργειας.",
    options: () => smartOptions,
  },
  {
    id: "connectors",
    title: "Πόσες εξόδους θέλεις να έχει ο φορτιστής?",
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
];
