/** Build a full URL for public API calls, ensuring the /api prefix. */
function buildPublicUrl(path: string) {
  const rawBase = import.meta.env.VITE_API_BASE ?? "/api";
  const base = rawBase.replace(/\/+$/, "");
  // Server routes live under /api/public/...; ensure the /api prefix is present.
  const apiPath = path.startsWith("/api") ? path : `/api${path}`;
  const normalizedPath =
    base.endsWith("/api") && apiPath.startsWith("/api") ? apiPath.slice(4) || "/" : apiPath;
  return `${base}${normalizedPath}`;
}

export async function publicFetch<T>(path: string): Promise<T> {
  const res = await fetch(buildPublicUrl(path));
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || `Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}
