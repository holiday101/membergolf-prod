import { http } from "./http";
import type { CalendarEvent } from "../types/event";

export function fetchEvents(rangeStartISO: string, rangeEndISO: string) {
  const qs = new URLSearchParams({ start: rangeStartISO, end: rangeEndISO });
  return http<CalendarEvent[]>(`/api/events?${qs.toString()}`);
}
