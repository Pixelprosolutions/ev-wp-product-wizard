import type { RecommendationResponse } from "../lib/api";

type ResultsListProps = {
  data: RecommendationResponse;
};

function formatPrice(priceHtml: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(priceHtml, "text/html");
  const text = (doc.body.textContent ?? "").replace(/\s+/g, " ").trim();
  const prices = text.match(/[0-9.,]+\s?€/g) ?? [];
  const uniquePrices = Array.from(new Set(prices));
  const suffix = text.includes("χωρίς ΦΠΑ") ? "χωρίς ΦΠΑ" : "";

  if (uniquePrices.length >= 2) {
    return `${uniquePrices[0]} - ${uniquePrices[1]}${suffix ? ` ${suffix}` : ""}`;
  }
  if (uniquePrices.length === 1) {
    return `${uniquePrices[0]}${suffix ? ` ${suffix}` : ""}`;
  }
  return text;
}

export default function ResultsList({ data }: ResultsListProps) {
  return (
    <section className="results">
      <div className="results__layout">
        <div className="results__summary">
          <h2>Βρέθηκαν {data.total_found} προϊόντα</h2>
          {data.fallback_steps_used > 0 ? (
            <p className="results__note">
              Βρέθηκαν αποτελέσματα με ελαστικότερα κριτήρια.
            </p>
          ) : null}
        </div>
        <div className="results__grid">
          {data.products.map((product) => (
            <article className="product-card" key={product.id}>
              <div className="card-content">
                <div className="product-card__image">
                  <img src={product.image} alt={product.name} loading="lazy" />
                  {!product.in_stock ? (
                    <span className="product-card__badge">Μη διαθέσιμο</span>
                  ) : null}
                </div>
                <div className="product-card__body">
                  <h3 className="card-title">{product.name}</h3>
                  <div className="product-card__price">
                    {formatPrice(product.price_html)}
                  </div>
                </div>
              </div>
              <a
                className="primary-button card-button"
                href={product.permalink}
                target="_blank"
                rel="noreferrer"
              >
                Δες το προϊόν
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
