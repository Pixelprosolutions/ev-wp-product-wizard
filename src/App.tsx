import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
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
  type AnswerMap,
  type AnswerValue,
  type Option,
  type Step,
  type WizardState,
} from "./lib/wizardEngine";
import {
  buildRecommendationPayload,
  fetchRecommendations,
  postLead,
  type LeadAnswer,
  type LeadResult,
  type RecommendationProduct,
  type RecommendationResponse,
} from "./lib/api";

const logoUrl = new URL("../logo.png", import.meta.url).href;

type ResultsStatus =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "success"; data: RecommendationResponse };

type LeadFormData = {
  fullName: string;
  email: string;
  phone: string;
  role: string;
  otherRole: string;
  consent: boolean;
};

const createInitialLeadData = (): LeadFormData => ({
  fullName: "",
  email: "",
  phone: "",
  role: "",
  otherRole: "",
  consent: false,
});

function createRequestId() {
  return `wizard-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeAnswerValue(value: AnswerValue): string[] {
  const list = Array.isArray(value) ? value : [value];
  return list.map((item) => String(item)).sort();
}

function formatAnswerLabel(value: AnswerValue): string {
  return Array.isArray(value) ? value.join(", ") : String(value);
}

function isAnswerMatch(
  answerValue: AnswerValue | undefined,
  optionValue: AnswerValue
): boolean {
  if (!answerValue) {
    return false;
  }
  const normalizedAnswer = normalizeAnswerValue(answerValue);
  const normalizedOption = normalizeAnswerValue(optionValue);
  if (normalizedAnswer.length !== normalizedOption.length) {
    return false;
  }
  return normalizedAnswer.every(
    (item, index) => item === normalizedOption[index]
  );
}

function buildLeadAnswers(answers: AnswerMap, steps: Step[]): Record<string, LeadAnswer> {
  const labelsByKey: Record<string, string> = {};

  for (const step of steps) {
    for (const option of step.options) {
      for (const [key, optionValue] of Object.entries(option.value)) {
        if (isAnswerMatch(answers[key], optionValue)) {
          labelsByKey[key] = option.label;
        }
      }
    }
  }

  const leadAnswers: Record<string, LeadAnswer> = {};
  for (const [key, value] of Object.entries(answers)) {
    leadAnswers[key] = {
      value,
      label: labelsByKey[key] ?? formatAnswerLabel(value),
    };
  }

  return leadAnswers;
}

function buildLeadResults(products: RecommendationProduct[]): LeadResult[] {
  return products.map((product) => ({
    id: product.id,
    name: product.name,
    url: product.permalink ? product.permalink : undefined,
  }));
}

function readUtmParams(): Record<string, string> | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    if (!key.startsWith("utm_")) {
      continue;
    }
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      continue;
    }
    utm[key] = trimmedValue;
  }
  return Object.keys(utm).length ? utm : undefined;
}

function getPageContext() {
  return {
    page_url: typeof window !== "undefined" ? window.location.href : "",
    referrer: typeof document !== "undefined" ? document.referrer : "",
    utm: readUtmParams(),
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "",
  };
}

export default function App() {
  const [state, setState] = useState<WizardState>(initialState);
  const [results, setResults] = useState<ResultsStatus>({ status: "idle" });
  const [retryToken, setRetryToken] = useState(0);
  const [leadData, setLeadData] = useState<LeadFormData>(
    () => createInitialLeadData()
  );
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [leadRequestId, setLeadRequestId] = useState<string | null>(null);
  const [leadId, setLeadId] = useState<number | null>(null);
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadError, setLeadError] = useState<string | null>(null);
  const leadResultsSyncRef = useRef<{ leadId: number | null; resultsKey: string | null }>({
    leadId: null,
    resultsKey: null,
  });

  const steps = useMemo(() => getSteps(state), [state]);
  const stepIds = useMemo(() => steps.map((step) => step.id), [steps]);
  const currentStep = steps.find((step) => step.id === state.currentStepId) ?? null;
  const progress = getProgress(state, steps);
  const isResults = state.currentStepId === null && steps.length > 0;
  const requiresOtherRole = leadData.role === "Άλλο";
  const canSubmitLead =
    leadData.fullName.trim() &&
    leadData.email.trim() &&
    leadData.role &&
    leadData.consent &&
    (!requiresOtherRole || leadData.otherRole.trim());

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

    if (!leadSubmitted) {
      return;
    }

    if (!leadRequestId) {
      return;
    }

    const controller = new AbortController();
    setResults({ status: "loading" });

    const requestId = leadRequestId;
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
  }, [isResults, leadSubmitted, leadRequestId, state.answers, retryToken]);

  useEffect(() => {
    if (!leadSubmitted || !leadId) {
      return;
    }
    if (results.status !== "success") {
      return;
    }
    if (!leadRequestId) {
      return;
    }

    const leadResults = buildLeadResults(results.data.products);
    const resultsKey = JSON.stringify(leadResults);
    const lastSync = leadResultsSyncRef.current;
    if (lastSync.leadId === leadId && lastSync.resultsKey === resultsKey) {
      return;
    }

    const answersPayload = buildLeadAnswers(state.answers, steps);
    const filtersPayload = buildRecommendationPayload(state.answers, leadRequestId);
    const pageContext = getPageContext();

    postLead({
      lead_id: leadId,
      fullName: leadData.fullName.trim(),
      email: leadData.email.trim(),
      phone: leadData.phone.trim(),
      role: leadData.role,
      otherRole: leadData.otherRole.trim(),
      consent: leadData.consent,
      answers: answersPayload,
      filters: filtersPayload,
      results: leadResults,
      request_id: leadRequestId,
      page_url: pageContext.page_url,
      referrer: pageContext.referrer || undefined,
      utm: pageContext.utm,
      user_agent: pageContext.user_agent,
    })
      .then(() => {
        leadResultsSyncRef.current = { leadId, resultsKey };
      })
      .catch(() => {});
  }, [
    leadData,
    leadId,
    leadRequestId,
    leadSubmitted,
    results,
    state.answers,
    steps,
  ]);

  const handleSelect = useCallback((option: Option) => {
    setState((prev) => applyAnswer(prev, option));
  }, []);

  const handleBack = useCallback(() => {
    setState((prev) => goBack(prev));
  }, []);

  const handleReset = useCallback(() => {
    setState(resetWizard());
    setResults({ status: "idle" });
    setLeadData(createInitialLeadData());
    setLeadSubmitted(false);
    setLeadRequestId(null);
    setLeadId(null);
    setLeadSubmitting(false);
    setLeadError(null);
    leadResultsSyncRef.current = { leadId: null, resultsKey: null };
  }, []);

  const handleRetry = useCallback(() => {
    setResults({ status: "loading" });
    setRetryToken((value) => value + 1);
    leadResultsSyncRef.current = { leadId, resultsKey: null };
  }, [leadId]);

  const handleLeadChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value, type } = event.target;
      const nextValue =
        type === "checkbox"
          ? (event.target as HTMLInputElement).checked
          : value;
      setLeadData((prev) => {
        const next = { ...prev, [name]: nextValue };
        if (name === "role" && value !== "Άλλο") {
          next.otherRole = "";
        }
        return next;
      });
    },
    []
  );

  const handleLeadSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (leadSubmitting) {
        return;
      }
      const form = event.currentTarget;
      if (!form.reportValidity()) {
        return;
      }
      setLeadError(null);
      const requestId = leadRequestId ?? createRequestId();
      setLeadRequestId(requestId);
      setLeadSubmitting(true);
      leadResultsSyncRef.current = { leadId: null, resultsKey: null };
      const answersPayload = buildLeadAnswers(state.answers, steps);
      const filtersPayload = buildRecommendationPayload(state.answers, requestId);
      const pageContext = getPageContext();

      try {
        const response = await postLead({
          fullName: leadData.fullName.trim(),
          email: leadData.email.trim(),
          phone: leadData.phone.trim(),
          role: leadData.role,
          otherRole: leadData.otherRole.trim(),
          consent: leadData.consent,
          answers: answersPayload,
          filters: filtersPayload,
          request_id: requestId,
          page_url: pageContext.page_url,
          referrer: pageContext.referrer || undefined,
          utm: pageContext.utm,
          user_agent: pageContext.user_agent,
        });
        setLeadId(response.lead_id ?? null);
        setLeadSubmitted(true);
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : "Δεν ήταν δυνατή η αποθήκευση των στοιχείων.";
        setLeadError(message);
        setLeadSubmitted(false);
        setLeadId(null);
      } finally {
        setLeadSubmitting(false);
      }
    },
    [leadData, leadRequestId, leadSubmitting, state.answers, steps]
  );

  return (
    <div className="app">
        <div className="app__frame">
          <div className="app__brand">
            <img className="app__logo" src={logoUrl} alt="Voltbuild" />
          </div>
          <p className="app__subtitle">Βρες το νέο φορτιστή που σου ταιριάζει.</p>
          {currentStep ? (
          <StepShell
            title={currentStep.title}
            helper={currentStep.helper}
            tooltip={currentStep.tooltip}
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
              <button
                className="link-button link-button--icon"
                onClick={handleBack}
                aria-label="Πίσω"
              >
                <svg
                  className="link-button__icon"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    d="M15 6l-6 6 6 6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                className="link-button link-button--icon"
                onClick={handleReset}
                aria-label="Επαναφορά"
              >
                <svg
                  className="link-button__icon"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    d="M20 12a8 8 0 1 1-2.34-5.66"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M20 4v6h-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </header>
            {!leadSubmitted ? (
              <section className="lead-card">
                <h2 className="lead-card__title">
                  Πληκτρολόγησε τα στοιχεία σου για να δεις τα αποτελέσματα.
                </h2>
                <form
                  className="lead-form"
                  onSubmit={handleLeadSubmit}
                  aria-busy={leadSubmitting}
                >
                  {leadError ? (
                    <p className="lead-form__error">{leadError}</p>
                  ) : null}
                  <label className="lead-form__row">
                    <span className="lead-form__label">Ονοματεπώνυμο</span>
                    <input
                      className="lead-form__input"
                      type="text"
                      name="fullName"
                      value={leadData.fullName}
                      onChange={handleLeadChange}
                      autoComplete="name"
                      required
                    />
                  </label>
                  <label className="lead-form__row">
                    <span className="lead-form__label">Email</span>
                    <input
                      className="lead-form__input"
                      type="email"
                      name="email"
                      value={leadData.email}
                      onChange={handleLeadChange}
                      autoComplete="email"
                      required
                    />
                  </label>
                  <label className="lead-form__row">
                    <span className="lead-form__label">
                      Τηλέφωνο επικοινωνίας (Προαιρετικό)
                    </span>
                    <input
                      className="lead-form__input"
                      type="tel"
                      name="phone"
                      value={leadData.phone}
                      onChange={handleLeadChange}
                      autoComplete="tel"
                    />
                  </label>
                  <label className="lead-form__row">
                    <span className="lead-form__label">
                      Επιλέξτε την ιδιότητα σας
                    </span>
                    <select
                      className="lead-form__select"
                      name="role"
                      value={leadData.role}
                      onChange={handleLeadChange}
                      required
                    >
                      <option value="" disabled>
                        Επιλέξτε...
                      </option>
                      <option value="Ηλεκτρολόγος Μηχανικός / Εγκαταστάτης">
                        Ηλεκτρολόγος Μηχανικός / Εγκαταστάτης
                      </option>
                      <option value="Ιδιώτης">Ιδιώτης</option>
                      <option value="Επιχείρηση εστίασης">
                        Επιχείρηση εστίασης
                      </option>
                      <option value="Βιομηχανία / Εμπορική επιχείρηση">
                        Βιομηχανία / Εμπορική επιχείρηση
                      </option>
                      <option value="Άλλο">Άλλο</option>
                    </select>
                  </label>
                  {leadData.role === "Άλλο" ? (
                    <label className="lead-form__row">
                      <span className="lead-form__label">
                        Παρακαλώ διευκρινίστε την ιδιότητά σας
                      </span>
                      <input
                        className="lead-form__input"
                        type="text"
                        name="otherRole"
                        value={leadData.otherRole}
                        onChange={handleLeadChange}
                        required
                      />
                    </label>
                  ) : null}
                  <label className="lead-form__consent">
                    <input
                      type="checkbox"
                      name="consent"
                      checked={leadData.consent}
                      onChange={handleLeadChange}
                      required
                    />
                    <span>
                      Αποδοχή Όρων και Προϋποθέσεων Χρήσης Προσωπικών Στοιχείων
                    </span>
                  </label>
                  <div className="lead-form__actions">
                    <button
                      className="primary-button"
                      type="submit"
                      disabled={!canSubmitLead || leadSubmitting}
                    >
                      {leadSubmitting ? "Υποβολή..." : "Δείτε τα αποτελέσματα"}
                    </button>
                  </div>
                </form>
              </section>
            ) : results.status === "loading" || results.status === "idle" ? (
              <LoadingState />
            ) : results.status === "error" ? (
              <ErrorState onRetry={handleRetry} />
            ) : results.data.total_found === 0 ||
              results.data.products.length === 0 ? (
              <section className="status status--empty">
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
