export type EditRequestPayload = {
  prompt: string;
  filename: string;
  imageBase64: string;
};

export type EditResponse = {
  request_id: string;
};

export type PollResponse = {
  status: 'processing' | 'success' | 'failed';
  result_url?: string;
  error?: string;
};

export type MeResponse = {
  uid: string;
  email?: string | null;
  credits: number;
};

export type ChargeLog = {
  id: string;
  price_id: string | null;
  quantity: number;
  credits_added: number;
  amount_total_jpy: number;
  currency: string;
  created_at: string;
};

export type ConsumptionLog = {
  id: number;
  credits_used: number;
  reason: string | null;
  request_id: string | null;
  refunded: boolean;
  created_at: string;
};

export type HistoryResponse = {
  charges: ChargeLog[];
  consumptions: ConsumptionLog[];
};

export type CheckoutSessionResponse = {
  url: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL?.trim() || 'http://localhost:8000';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text();
    throw new ApiError(message || 'サーバーでエラーが発生しました。', response.status);
  }
  return response.json() as Promise<T>;
}

type FetchOptions = {
  method?: 'GET' | 'POST';
  body?: unknown;
  idToken?: string | null;
};

async function fetchWithAuth<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (options.idToken) {
    headers.Authorization = `Bearer ${options.idToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  return handleResponse<T>(response);
}

export function pollResult(requestId: string): Promise<PollResponse> {
  return fetchWithAuth<PollResponse>(`/api/poll?request_id=${encodeURIComponent(requestId)}`, {
    method: 'GET'
  });
}

export function generateImage(payload: EditRequestPayload, idToken: string): Promise<EditResponse> {
  return fetchWithAuth<EditResponse>('/api/generate', {
    method: 'POST',
    body: payload,
    idToken
  });
}

export function createCheckoutSession(
  priceId: string,
  quantity: number,
  idToken: string
): Promise<CheckoutSessionResponse> {
  return fetchWithAuth<CheckoutSessionResponse>('/api/payment/create-checkout-session', {
    method: 'POST',
    body: { price_id: priceId, quantity },
    idToken
  });
}

export function fetchMe(idToken: string): Promise<MeResponse> {
  return fetchWithAuth<MeResponse>('/api/me', { method: 'GET', idToken });
}

export function fetchHistory(idToken: string): Promise<HistoryResponse> {
  return fetchWithAuth<HistoryResponse>('/api/me/history', { method: 'GET', idToken });
}
