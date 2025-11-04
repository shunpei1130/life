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

function resolveBaseUrl(): string {
  // ブラウザで localhost の場合は原則ローカルAPIを優先
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const forceRemote = (process.env.NEXT_PUBLIC_FORCE_REMOTE || '').toLowerCase();
    const isForceRemote = forceRemote === '1' || forceRemote === 'true' || forceRemote === 'yes';
    if ((host === 'localhost' || host === '127.0.0.1') && !isForceRemote) {
      return 'http://localhost:8000';
    }
  }

  // 明示設定があれば尊重（本番はここを使う）
  if (process.env.NEXT_PUBLIC_API_BASE_URL && process.env.NEXT_PUBLIC_API_BASE_URL.trim()) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }

  // ブラウザ: 同一オリジン（CDN/Edge配下のリバースプロキシ前提）
  if (typeof window !== 'undefined') {
    return `${window.location.origin}`;
  }

  // SSR時のフォールバック（開発）
  return 'http://localhost:8000';
}

const DEFAULT_BASE_URL = resolveBaseUrl();

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
