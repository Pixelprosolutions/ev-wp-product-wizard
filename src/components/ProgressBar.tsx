type ProgressBarProps = {
  current: number;
  total: number;
};

export default function ProgressBar({ current, total }: ProgressBarProps) {
  const progress = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div className="progress">
      <div className="progress__meta">Βήμα {current} από {total}</div>
      <div className="progress__track">
        <div className="progress__bar" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
