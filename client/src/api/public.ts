export async function publicFetch<T>(path: string): Promise<T> {
  const base = import.meta.env.VITE_API_BASE ?? "/api";
  const res = await fetch(`${base}${path}`);
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || `Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}
