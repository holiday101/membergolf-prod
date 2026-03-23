function buildPublicUrl(path: string): string {
  const rawBase = import.meta.env.VITE_API_BASE ?? "/api";
  const base = rawBase.replace(/\/+$/, "");
  const apiPath = path.startsWith("/api") ? path : `/api${path}`;
  if (base.endsWith("/api") && apiPath.startsWith("/api")) {
    return `${base}${apiPath.slice(4) || "/"}`;
  }
  return `${base}${apiPath}`;
}

export async function publicFetch<T>(path: string): Promise<T> {
  const res = await fetch(buildPublicUrl(path));
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || `Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}
