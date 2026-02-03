const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:4000";

export async function http<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("golfapp_token");

  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers ?? {}),
    },
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || `Request failed: ${res.status}`);
  }

  // 204 no content
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
