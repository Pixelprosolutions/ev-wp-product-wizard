import type { ReactNode } from "react";
import ProgressBar from "./ProgressBar";

type StepShellProps = {
  title: string;
  helper?: string;
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
  children,
  onBack,
  onReset,
  backDisabled,
  progressCurrent,
  progressTotal,
}: StepShellProps) {
  return (
    <section className="shell">
      <header className="shell__topbar">
        <button
          className="link-button"
          onClick={onBack}
          disabled={backDisabled}
        >
          Πίσω
        </button>
        <button className="link-button" onClick={onReset}>
          Επαναφορά
        </button>
      </header>
      <div className="shell__body">
        <div className="shell__intro">
          <ProgressBar current={progressCurrent} total={progressTotal} />
          <div className="shell__heading">
            <h1>{title}</h1>
            {helper ? <p className="shell__helper">{helper}</p> : null}
          </div>
        </div>
        <div className="shell__content">{children}</div>
      </div>
    </section>
  );
}
