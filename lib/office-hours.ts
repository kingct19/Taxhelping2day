export const weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

export type Weekday = (typeof weekdays)[number];

export type DayHours = {
  closed: boolean;
  open: string;
  close: string;
};

export type OfficeHours = {
  timezone: "America/Chicago";
  days: Record<Weekday, DayHours>;
};

export const weekdayLabel: Record<Weekday, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/;

export function defaultOfficeHours(): OfficeHours {
  const weekday: DayHours = { closed: false, open: "09:00", close: "17:00" };
  const weekend: DayHours = { closed: true, open: "09:00", close: "17:00" };
  return {
    timezone: "America/Chicago",
    days: {
      monday: { ...weekday },
      tuesday: { ...weekday },
      wednesday: { ...weekday },
      thursday: { ...weekday },
      friday: { ...weekday },
      saturday: { ...weekend },
      sunday: { ...weekend },
    },
  };
}

function parseTime(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = timePattern.exec(value);
  if (!match) return null;
  return `${match[1]}:${match[2]}`;
}

function parseDay(value: unknown): DayHours | null {
  if (!value || typeof value !== "object") return null;
  const row = value as { closed?: unknown; open?: unknown; close?: unknown };
  if (typeof row.closed !== "boolean") return null;
  const open = parseTime(row.open);
  const close = parseTime(row.close);
  if (!open || !close) return null;
  return { closed: row.closed, open, close };
}

export function parseOfficeHours(value: unknown): OfficeHours | null {
  if (!value || typeof value !== "object") return null;
  const daysIn = (value as { days?: unknown }).days;
  if (!daysIn || typeof daysIn !== "object") return null;
  const days = {} as OfficeHours["days"];
  for (const day of weekdays) {
    const parsed = parseDay((daysIn as Record<string, unknown>)[day]);
    if (!parsed) return null;
    days[day] = parsed;
  }
  return { timezone: "America/Chicago", days };
}

export type HoursLine = {
  label: string;
  hours: string;
};

export function formatClock(value: string): string {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return value;
  const hour = Number(match[1]);
  const minute = match[2];
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return minute === "00" ? `${hour12} ${suffix}` : `${hour12}:${minute} ${suffix}`;
}

function sameSlot(left: DayHours, right: DayHours): boolean {
  if (left.closed || right.closed) return left.closed && right.closed;
  return left.open === right.open && left.close === right.close;
}

function slotLabel(row: DayHours): string {
  return row.closed ? "Closed" : `${formatClock(row.open)} – ${formatClock(row.close)}`;
}

export function summarizeHours(hours: OfficeHours): HoursLine[] {
  const lines: HoursLine[] = [];
  let index = 0;
  while (index < weekdays.length) {
    const day = weekdays[index];
    if (!day) break;
    const row = hours.days[day];
    let end = index;
    while (end + 1 < weekdays.length) {
      const next = weekdays[end + 1];
      if (!next || !sameSlot(row, hours.days[next])) break;
      end += 1;
    }
    const endDay = weekdays[end];
    if (endDay) {
      lines.push({
        label: index === end ? weekdayLabel[day] : `${weekdayLabel[day]}–${weekdayLabel[endDay]}`,
        hours: slotLabel(row),
      });
    }
    index = end + 1;
  }
  return lines;
}

function isWeekday(value: string): value is Weekday {
  return (weekdays as readonly string[]).includes(value);
}

function chicagoNow(now: Date): { weekday: Weekday; time: string } | null {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  const weekday = read("weekday").toLowerCase();
  if (!isWeekday(weekday)) return null;
  const hour = (read("hour") === "24" ? "00" : read("hour")).padStart(2, "0");
  const minute = read("minute").padStart(2, "0");
  if (!/^([01]\d|2[0-3])$/.test(hour) || !/^[0-5]\d$/.test(minute)) return null;
  return { weekday, time: `${hour}:${minute}` };
}

export function replyExpectation(hours: OfficeHours, now = new Date()): string {
  const place = chicagoNow(now);
  if (!place) return "We reply during the hours below.";
  const today = hours.days[place.weekday];
  if (!today.closed && place.time >= today.open && place.time < today.close) {
    return `The office is open until ${formatClock(today.close)}. A message sent now is answered during these hours.`;
  }
  const start = weekdays.indexOf(place.weekday);
  for (let offset = 0; offset < weekdays.length; offset += 1) {
    const day = weekdays[(start + offset) % weekdays.length];
    if (!day) continue;
    const row = hours.days[day];
    if (row.closed) continue;
    if (offset === 0 && place.time >= row.open) continue;
    if (offset === 0) return `The office opens today at ${formatClock(row.open)}. A message sent now is answered then.`;
    if (offset === 1) return `The office is closed. A message sent now is answered tomorrow at ${formatClock(row.open)}.`;
    return `The office is closed. A message sent now is answered ${weekdayLabel[day]} at ${formatClock(row.open)}.`;
  }
  return "We'll reply when the office is open.";
}

export function officeHoursError(hours: OfficeHours): string | null {
  for (const day of weekdays) {
    const row = hours.days[day];
    if (!timePattern.test(row.open) || !timePattern.test(row.close)) {
      return `Enter an open and close time for ${weekdayLabel[day]}.`;
    }
    if (!row.closed && row.open >= row.close) {
      return `${weekdayLabel[day]} needs a close time after it opens.`;
    }
  }
  return null;
}
