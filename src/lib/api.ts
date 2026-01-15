export type RecommendationProduct = {
  id: number;
  name: string;
  permalink: string;
  image: string;
  price_html: string;
  in_stock: boolean;
  attributes: Record<string, string[]>;
};

export type RecommendationResponse = {
  ok: boolean;
  request_id?: string;
  applied_filters: Record<string, string[]>;
  fallback_steps_used: number;
  total_found: number;
  products: RecommendationProduct[];
  debug?: {
    validated_filters?: Record<string, string[]>;
    rejected_filters?: Record<string, string[]>;
    query_args?: unknown;
    fallback_used?: boolean;
  };
};

export type RecommendationRequest = {
  request_id?: string;
  filters: Record<string, string[]>;
  limit: number;
  page: number;
  include_out_of_stock: boolean;
  fallback: boolean;
};

export type LeadPayload = {
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  otherRole?: string;
  consent: boolean;
  answers?: Record<string, string | string[]>;
  request_id?: string;
  page_url?: string;
  user_agent?: string;
};

export type LeadResponse = {
  ok: boolean;
  lead_id?: number;
  message?: string;
};

const API_BASE = "https://voltbuild.gr/wp-json/voltbuild/v1";
const ENDPOINT = `${API_BASE}/recommendations`;
const LEADS_ENDPOINT = `${API_BASE}/leads`;

export function buildRecommendationPayload(
  answers: Record<string, string | string[]>,
  requestId?: string
): RecommendationRequest {
  const filters: Record<string, string[]> = {};
  for (const [taxonomy, value] of Object.entries(answers)) {
    if (taxonomy === "charging_mode") {
      continue;
    }
    filters[taxonomy] = Array.isArray(value) ? value : [value];
  }
  return {
    request_id: requestId,
    filters,
    limit: 6,
    page: 1,
    include_out_of_stock: false,
    fallback: false,
  };
}

export async function fetchRecommendations(
  payload: RecommendationRequest,
  signal?: AbortSignal
): Promise<RecommendationResponse> {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    throw new Error("Recommendation request failed");
  }

  const data = (await response.json()) as RecommendationResponse;
  return data;
}

export async function postLead(
  payload: LeadPayload,
  signal?: AbortSignal
): Promise<LeadResponse> {
  const response = await fetch(LEADS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal,
  });

  const data = (await response.json()) as LeadResponse;

  if (!response.ok) {
    const message = data?.message || "Lead request failed";
    throw new Error(message);
  }

  return data;
}
