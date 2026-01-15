import { stepDefinitions } from "./wizardConfig";

export type AnswerValue = string | string[];

export type AnswerMap = Record<string, AnswerValue>;

export type Option = {
  id: string;
  label: string;
  helper?: string;
  value: Record<string, AnswerValue>;
};

export type Step = {
  id: string;
  title: string;
  helper?: string;
  tooltip?: string;
  options: Option[];
};

export type StepDefinition = {
  id: string;
  title: string;
  helper?: string;
  tooltip?: string;
  options: (state: WizardState) => Option[];
  isActive?: (state: WizardState) => boolean;
};

export type WizardState = {
  answers: AnswerMap;
  history: string[];
  currentStepId: string | null;
};

export const initialState: WizardState = {
  answers: {},
  history: [],
  currentStepId: "use_case",
};

export function getSteps(state: WizardState): Step[] {
  return stepDefinitions
    .filter((step) => (step.isActive ? step.isActive(state) : true))
    .map((step) => ({
      id: step.id,
      title: step.title,
      helper: step.helper,
      tooltip: step.tooltip,
      options: step.options(state),
    }));
}

function collectActiveTaxonomies(steps: Step[]): Set<string> {
  const keys = new Set<string>();
  for (const step of steps) {
    for (const option of step.options) {
      for (const key of Object.keys(option.value)) {
        keys.add(key);
      }
    }
  }
  return keys;
}

function pruneAnswers(answers: AnswerMap, steps: Step[]): AnswerMap {
  const activeTaxonomies = collectActiveTaxonomies(steps);
  const nextAnswers: AnswerMap = {};
  for (const [key, value] of Object.entries(answers)) {
    if (activeTaxonomies.has(key)) {
      nextAnswers[key] = value;
    }
  }
  return nextAnswers;
}

export function applyAnswer(state: WizardState, option: Option): WizardState {
  const mergedAnswers = { ...state.answers, ...option.value };
  const steps = getSteps({ ...state, answers: mergedAnswers });
  const stepIds = steps.map((step) => step.id);
  const nextAnswers = pruneAnswers(mergedAnswers, steps);

  const history = state.currentStepId
    ? [...state.history, state.currentStepId]
    : [...state.history];
  const filteredHistory = history.filter((id) => stepIds.includes(id));

  const currentIndex = state.currentStepId
    ? stepIds.indexOf(state.currentStepId)
    : -1;
  const nextStepId =
    currentIndex >= 0 ? stepIds[currentIndex + 1] ?? null : stepIds[0] ?? null;

  return {
    answers: nextAnswers,
    history: filteredHistory,
    currentStepId: nextStepId,
  };
}

export function goBack(state: WizardState): WizardState {
  if (state.history.length === 0) {
    return state;
  }
  const history = [...state.history];
  const previousStepId = history.pop() ?? null;
  return {
    ...state,
    history,
    currentStepId: previousStepId,
  };
}

export function resetWizard(): WizardState {
  return { ...initialState, answers: {}, history: [] };
}

export function getProgress(state: WizardState, steps: Step[]): {
  current: number;
  total: number;
} {
  const total = steps.length;
  if (!state.currentStepId) {
    return { current: total, total };
  }
  const index = steps.findIndex((step) => step.id === state.currentStepId);
  return { current: index >= 0 ? index + 1 : 1, total };
}
