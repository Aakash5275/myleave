export function todayKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function nowTime(date = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

export function nowStamp(date = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

export function parseKey(key: string) {
  return new Date(`${key}T00:00:00.000Z`);
}

export function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(key: string, days: number) {
  const date = parseKey(key);
  date.setUTCDate(date.getUTCDate() + days);
  return dateKey(date);
}

export function isWeekday(key: string) {
  const day = parseKey(key).getUTCDay();
  return day !== 0 && day !== 6;
}

export function eachDate(start: string, end: string) {
  const dates: string[] = [];
  let cursor = start;
  while (cursor <= end) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return dates;
}

export function workingDays(start: string, end: string) {
  return eachDate(start, end).filter(isWeekday).length;
}

export function yearOf(key = todayKey()) {
  return Number(key.slice(0, 4));
}

export function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function monthKeys(ym: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(ym);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  const start = `${match[1]}-${match[2]}-01`;
  const end = `${match[1]}-${match[2]}-${String(daysInMonth(year, month)).padStart(2, "0")}`;
  return { year, month, start, end };
}

export function shiftMonth(year: number, month: number, delta: number) {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

export function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function formatDateTime(value: Date | string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

export function formatMonth(year: number, month: number) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function fullName(person: { firstName: string; lastName: string }) {
  return `${person.firstName} ${person.lastName}`;
}

export function initials(person: { firstName: string; lastName: string }) {
  return `${person.firstName.charAt(0)}${person.lastName.charAt(0)}`.toUpperCase();
}

export function matchesQuery(query: string, parts: Array<string | number | null | undefined>) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return parts
    .filter((part) => part !== null && part !== undefined)
    .join(" ")
    .toLowerCase()
    .includes(needle);
}

export function weekdayLabels() {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
}

export function queryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}
