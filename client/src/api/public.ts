function buildPublicUrl(path: string) {
  const base = import.meta.env.VITE_API_BASE ?? "/api";
  const normalizedPath =
    base.endsWith("/api") && path.startsWith("/api") ? path.slice(4) || "/" : path;
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
