interface FetchOptions {
  method: 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
}

function errorMessage(data: unknown): string | null {
  if (data && typeof data === 'object' && 'error' in data) {
    const value = (data as { error: unknown }).error;
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return null;
}

export async function adminFetch<T>(url: string, options: FetchOptions): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method,
      headers: options.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new Error('Network error. Check your connection and try again.');
  }
  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (!response.ok) throw new Error(errorMessage(data) ?? 'Something went wrong. Please try again.');
  return data as T;
}
