type OptionCardProps = {
  label: string;
  helper?: string;
  onSelect: () => void;
};

export default function OptionCard({ label, helper, onSelect }: OptionCardProps) {
  return (
    <button className="option-card" onClick={onSelect}>
      <span className="option-card__label">{label}</span>
      {helper ? <span className="option-card__helper">{helper}</span> : null}
      <span className="option-card__arrow">→</span>
    </button>
  );
}
