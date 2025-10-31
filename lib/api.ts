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

const DEFAULT_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'サーバーでエラーが発生しました。');
  }
  return response.json() as Promise<T>;
}

export async function requestEdit(payload: EditRequestPayload): Promise<EditResponse> {
  const response = await fetch(`${DEFAULT_BASE_URL}/api/edit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  return handleResponse<EditResponse>(response);
}

export async function pollResult(requestId: string): Promise<PollResponse> {
  const response = await fetch(`${DEFAULT_BASE_URL}/api/poll?request_id=${encodeURIComponent(requestId)}`);
  return handleResponse<PollResponse>(response);
}
