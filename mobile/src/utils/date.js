export function isoDate(d) {
  return d.toISOString();
}

export function dateRangeAroundToday(days = 30) {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - days);
  const end = new Date(now);
  end.setDate(end.getDate() + days);
  return { start: isoDate(start), end: isoDate(end) };
}
