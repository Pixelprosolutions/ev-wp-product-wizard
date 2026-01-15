type ErrorStateProps = {
  onRetry: () => void;
};

export default function ErrorState({ onRetry }: ErrorStateProps) {
  return (
    <section className="status status--error">
      <h2>Κάτι πήγε στραβά</h2>
      <p>Δεν ήταν δυνατή η φόρτωση των προτάσεων.</p>
      <button className="primary-button" onClick={onRetry}>
        Δοκιμάστε ξανά
      </button>
    </section>
  );
}
