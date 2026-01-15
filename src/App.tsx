import {
  useCallback,
  useEffect,
  useMemo,
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
  type Option,
  type WizardState,
} from "./lib/wizardEngine";
import {
  buildRecommendationPayload,
  fetchRecommendations,
  postLead,
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

export default function App() {
  const [state, setState] = useState<WizardState>(initialState);
  const [results, setResults] = useState<ResultsStatus>({ status: "idle" });
  const [retryToken, setRetryToken] = useState(0);
  const [leadData, setLeadData] = useState<LeadFormData>(
    () => createInitialLeadData()
  );
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [leadRequestId, setLeadRequestId] = useState<string | null>(null);
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadError, setLeadError] = useState<string | null>(null);

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
    setLeadSubmitting(false);
    setLeadError(null);
  }, []);

  const handleRetry = useCallback(() => {
    setResults({ status: "loading" });
    setRetryToken((value) => value + 1);
  }, []);

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

      try {
        await postLead({
          fullName: leadData.fullName.trim(),
          email: leadData.email.trim(),
          phone: leadData.phone.trim(),
          role: leadData.role,
          otherRole: leadData.otherRole.trim(),
          consent: leadData.consent,
          answers: state.answers,
          request_id: requestId,
          page_url: typeof window !== "undefined" ? window.location.href : "",
          user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "",
        });
        setLeadSubmitted(true);
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : "Δεν ήταν δυνατή η αποθήκευση των στοιχείων.";
        setLeadError(message);
        setLeadSubmitted(false);
      } finally {
        setLeadSubmitting(false);
      }
    },
    [leadData, leadRequestId, leadSubmitting, state.answers]
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
