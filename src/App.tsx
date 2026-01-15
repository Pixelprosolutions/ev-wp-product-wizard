import { useCallback, useEffect, useMemo, useState } from "react";
import OptionCard from "./components/OptionCard";
import StepShell from "./components/StepShell";
import ResultsList from "./components/ResultsList";
import LoadingState from "./components/LoadingState";
import ErrorState from "./components/ErrorState";
import {
  applyAnswer,
  getProgress,
  getSteps,
  goBack,
  initialState,
  resetWizard,
  type Option,
  type WizardState,
} from "./lib/wizardEngine";
import {
  buildRecommendationPayload,
  fetchRecommendations,
  type RecommendationResponse,
} from "./lib/api";

const logoUrl = new URL("../logo.png", import.meta.url).href;

type ResultsStatus =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "success"; data: RecommendationResponse };

function createRequestId() {
  return `wizard-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function App() {
  const [state, setState] = useState<WizardState>(initialState);
  const [results, setResults] = useState<ResultsStatus>({ status: "idle" });
  const [retryToken, setRetryToken] = useState(0);

  const steps = useMemo(() => getSteps(state), [state]);
  const stepIds = useMemo(() => steps.map((step) => step.id), [steps]);
  const currentStep = steps.find((step) => step.id === state.currentStepId) ?? null;
  const progress = getProgress(state, steps);
  const isResults = state.currentStepId === null && steps.length > 0;

  useEffect(() => {
    if (state.currentStepId && !stepIds.includes(state.currentStepId)) {
      setState((prev) => ({
        ...prev,
        currentStepId: stepIds[0] ?? null,
        history: prev.history.filter((id) => stepIds.includes(id)),
      }));
    }
  }, [state.currentStepId, stepIds]);

  useEffect(() => {
    if (!isResults) {
      return;
    }

    const controller = new AbortController();
    setResults({ status: "loading" });

    const requestId = createRequestId();
    const payload = buildRecommendationPayload(state.answers, requestId);

    fetchRecommendations(payload, controller.signal)
      .then((data) => {
        if (!data.ok) {
          throw new Error("Recommendation response not ok");
        }
        if (data.request_id && data.request_id !== requestId) {
          return;
        }
        setResults({ status: "success", data });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setResults({ status: "error" });
      });

    return () => controller.abort();
  }, [isResults, state.answers, retryToken]);

  const handleSelect = useCallback((option: Option) => {
    setState((prev) => applyAnswer(prev, option));
  }, []);

  const handleBack = useCallback(() => {
    setState((prev) => goBack(prev));
  }, []);

  const handleReset = useCallback(() => {
    setState(resetWizard());
    setResults({ status: "idle" });
  }, []);

  const handleRetry = useCallback(() => {
    setResults({ status: "loading" });
    setRetryToken((value) => value + 1);
  }, []);

  return (
    <div className="app">
      <div className="app__frame">
        <div className="app__brand">
          <img className="app__logo" src={logoUrl} alt="Voltbuild" />
        </div>
        {currentStep ? (
          <StepShell
            title={currentStep.title}
            helper={currentStep.helper}
            onBack={handleBack}
            onReset={handleReset}
            backDisabled={state.history.length === 0}
            progressCurrent={progress.current}
            progressTotal={progress.total}
          >
            <div className="options-grid">
              {currentStep.options.map((option) => (
                <OptionCard
                  key={option.id}
                  label={option.label}
                  helper={option.helper}
                  onSelect={() => handleSelect(option)}
                />
              ))}
            </div>
          </StepShell>
        ) : (
          <section className="results-shell">
            <header className="shell__topbar">
              <button className="link-button" onClick={handleBack}>
                Πίσω
              </button>
              <button className="link-button" onClick={handleReset}>
                Επαναφορά
              </button>
            </header>
            {results.status === "loading" || results.status === "idle" ? (
              <LoadingState />
            ) : results.status === "error" ? (
              <ErrorState onRetry={handleRetry} />
            ) : results.data.total_found === 0 ||
              results.data.products.length === 0 ? (
              <section className="status">
                <h2>Δεν βρέθηκαν προϊόντα</h2>
                <p>
                  Δεν υπάρχει διαθέσιμος φορτιστής που να ταιριάζει 100% με τις
                  επιλογές σας. Δοκιμάστε να αλλάξετε ισχύ, φάση ή smart
                  λειτουργίες.
                </p>
                <button className="primary-button" onClick={handleBack}>
                  Δοκιμάστε διαφορετικές επιλογές
                </button>
              </section>
            ) : (
              <ResultsList data={results.data} />
            )}
          </section>
        )}
      </div>
    </div>
  );
}
