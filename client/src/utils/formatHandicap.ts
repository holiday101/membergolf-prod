export function formatHandicap(
  value: number | null | undefined,
  decimalEnabled: boolean | null | undefined = true
) {
  if (value === null || value === undefined) return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return "—";
  if (!decimalEnabled) return String(Math.round(num));
  return num.toFixed(2);
}
