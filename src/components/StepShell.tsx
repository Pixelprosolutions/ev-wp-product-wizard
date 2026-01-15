import { useId, type ReactNode } from "react";
import ProgressBar from "./ProgressBar";

type StepShellProps = {
  title: string;
  helper?: string;
  tooltip?: string;
  children: ReactNode;
  onBack: () => void;
  onReset: () => void;
  backDisabled: boolean;
  progressCurrent: number;
  progressTotal: number;
};

export default function StepShell({
  title,
  helper,
  tooltip,
  children,
  onBack,
  onReset,
  backDisabled,
  progressCurrent,
  progressTotal,
}: StepShellProps) {
  const tooltipId = useId();
  const tooltipSections = tooltip
    ? tooltip.split("\n\n").map((section) => {
        const [heading, ...bodyLines] = section.split("\n");
        return {
          heading: heading.trim(),
          body: bodyLines.join(" ").trim(),
        };
      })
    : [];

  return (
    <section className="shell">
      <header className="shell__topbar">
        <button
          className="link-button link-button--icon"
          onClick={onBack}
          disabled={backDisabled}
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
          onClick={onReset}
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
      <div className="shell__body">
        <div className="shell__intro">
          <ProgressBar current={progressCurrent} total={progressTotal} />
          <div className="shell__heading">
            <div className="shell__title">
              <h1>{title}</h1>
              {tooltip ? (
                <button
                  type="button"
                  className="tooltip"
                  aria-label="Πληροφορίες"
                  aria-describedby={tooltipId}
                >
                  <span className="tooltip__icon">?</span>
                  <span
                    className="tooltip__content"
                    id={tooltipId}
                    role="tooltip"
                  >
                    {tooltipSections.map((section) => (
                      <span
                        className="tooltip__section"
                        key={section.heading}
                      >
                        <span className="tooltip__heading">
                          {section.heading}
                        </span>
                        <span className="tooltip__text">{section.body}</span>
                      </span>
                    ))}
                  </span>
                </button>
              ) : null}
            </div>
            {helper ? <p className="shell__helper">{helper}</p> : null}
          </div>
        </div>
        <div className="shell__content">{children}</div>
      </div>
    </section>
  );
}
