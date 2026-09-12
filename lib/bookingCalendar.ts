export interface CalendarEventInput {
  id?: string;
  title: string;
  description?: string;
  location?: string;
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  durationMinutes?: number;
}

const pad = (n: number) => String(n).padStart(2, "0");

const fmtLocal = (d: Date) =>
  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(
    d.getHours(),
  )}${pad(d.getMinutes())}${pad(d.getSeconds())}`;

const fmtUTC = (d: Date) =>
  d
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");

const escIcs = (s = "") =>
  s.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");

export function buildCalendarEvent(input: CalendarEventInput) {
  const durationMinutes = input.durationMinutes || 60;
  const start = new Date(`${input.startDate}T${input.startTime}`);
  const end = new Date(start.getTime() + durationMinutes * 60000);
  const timezone =
    (typeof Intl !== "undefined" &&
      Intl.DateTimeFormat().resolvedOptions?.().timeZone) ||
    "Africa/Kigali";

  const title = input.title || "Meeting";
  const description = input.description || "";
  const location = input.location || "";

  const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    title,
  )}&dates=${fmtLocal(start)}/${fmtLocal(end)}&details=${encodeURIComponent(
    description,
  )}&location=${encodeURIComponent(
    location,
  )}&ctz=${encodeURIComponent(timezone)}`;

  const yahooCalUrl = `https://calendar.yahoo.com/?v=60&title=${encodeURIComponent(
    title,
  )}&st=${fmtUTC(start)}&dur=${durationMinutes}&desc=${encodeURIComponent(
    description,
  )}&in_loc=${encodeURIComponent(location)}`;

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Agaseke//Agaseke Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${input.id || Date.now()}@agaseke.me`,
    `DTSTAMP:${fmtUTC(new Date())}`,
    `DTSTART:${fmtLocal(start)}`,
    `DTEND:${fmtLocal(end)}`,
    `SUMMARY:${escIcs(title)}`,
    `DESCRIPTION:${escIcs(description)}`,
    `LOCATION:${escIcs(location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return { googleCalUrl, yahooCalUrl, icsContent, seconds: end.getTime() };
}

export function buildIcsDataUrl(icsContent: string) {
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;
}