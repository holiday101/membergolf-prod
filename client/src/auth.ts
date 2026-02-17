const TOKEN_KEY = "golfapp_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function buildApiUrl(path: string) {
  const rawBase = import.meta.env.VITE_API_BASE ?? "/api";
  const base = rawBase.replace(/\/+$/, "");
  const normalizedPath =
    base.endsWith("/api") && path.startsWith("/api") ? path.slice(4) || "/" : path;
  return `${base}${normalizedPath}`;
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();

  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && options.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  return fetch(buildApiUrl(path), { ...options, headers });
}
