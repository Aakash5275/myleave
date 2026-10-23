export type PayPerson = {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  salary: number;
};

export type PayDraft = {
  userId: string;
  month: number;
  year: number;
  basic: number;
  allowances: number;
  tax: number;
  notes: string;
  found: string[];
};

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

function amountOnLine(line: string) {
  const match = line.match(/(\d[\d,]*(?:\.\d+)?)/);
  if (!match) return undefined;
  const value = Math.round(Number(match[1].replace(/,/g, "")));
  if (!Number.isFinite(value) || value < 0) return undefined;
  return value;
}

function firstAmount(text: string, label: RegExp) {
  for (const line of text.split(/\r?\n/)) {
    if (!label.test(line)) continue;
    const value = amountOnLine(line);
    if (value !== undefined) return value;
  }
  const flat = text.match(new RegExp(`${label.source}[^\\d\\n]{0,24}(\\d[\\d,]*(?:\\.\\d+)?)`, "i"));
  if (!flat) return undefined;
  return amountOnLine(flat[1]);
}

function findPeriod(text: string) {
  const lower = text.toLowerCase();
  let month: number | undefined;
  MONTHS.forEach((name, index) => {
    if (lower.includes(name)) month = index + 1;
  });
  const monthPattern = MONTHS.join("|");
  const besideMonth = text.match(new RegExp(`(?:${monthPattern})\\s+(20\\d{2})`, "i"))
    ?? text.match(new RegExp(`(20\\d{2})\\s+(?:${monthPattern})`, "i"));
  const numeric = text.match(/\b(0?[1-9]|1[0-2])\s*[/-]\s*(20\d{2})\b/);
  const labeled = text.match(/\byear\s*[:-]?\s*(20\d{2})\b/i);
  return {
    month: month ?? (numeric ? Number(numeric[1]) : undefined),
    year: besideMonth ? Number(besideMonth[1]) : numeric ? Number(numeric[2]) : labeled ? Number(labeled[1]) : undefined,
  };
}

export function extractPay(text: string, people: PayPerson[], preferredId = ""): PayDraft {
  const code = text.match(/ML-\d+/i)?.[0]?.toUpperCase();
  const coded = code ? people.find((person) => person.employeeCode.toUpperCase() === code) : undefined;
  const named = people.find((person) => text.toLowerCase().includes(`${person.firstName} ${person.lastName}`.toLowerCase()));
  const preferred = people.find((person) => person.id === preferredId);
  const person = coded ?? (preferredId ? preferred : named) ?? preferred ?? people[0];
  const period = findPeriod(text);
  const now = new Date();
  const found: string[] = [];
  const take = (label: string, pattern: RegExp) => {
    const value = firstAmount(text, pattern);
    if (value !== undefined) found.push(label);
    return value;
  };
  const basic = take("Basic", /basic(?:\s+pay|\s+salary)?/i);
  const allowances = take("Allowances", /allowances?|\bhra\b|house\s+rent/i);
  const tax = take("Tax", /(?:income\s+)?tax|\btds\b/i);
  if (coded) found.push("Employee ID");
  else if (!preferredId && named) found.push("Name");
  if (period.month || period.year) found.push("Period");

  return {
    userId: person?.id ?? "",
    month: period.month ?? now.getMonth() + 1,
    year: period.year ?? now.getFullYear(),
    basic: basic ?? person?.salary ?? 0,
    allowances: allowances ?? 0,
    tax: tax ?? 0,
    notes: "",
    found,
  };
}
