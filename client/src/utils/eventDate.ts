// Event dates are stored as calendar dates; parsing the ISO string directly treats
// them as UTC midnight, which shows the previous day in US time zones.
export function parseEventDate(value: string | null | undefined): Date {
  if (!value) return new Date(NaN);
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return new Date(NaN);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}
