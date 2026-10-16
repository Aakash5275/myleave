import { z } from "zod";

export function cleanText(value: FormDataEntryValue | null, max: number) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);
}

export function cleanMultiline(value: FormDataEntryValue | null, max: number) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, max);
}

export function cleanName(value: FormDataEntryValue | null) {
  const name = cleanText(value, 40);
  if (name.length < 2 || !/^[\p{L}][\p{L} .'-]*$/u.test(name)) return null;
  return name;
}

export function cleanEmail(value: FormDataEntryValue | null) {
  const email = String(value ?? "").trim().toLowerCase();
  const parsed = z.email().safeParse(email);
  return parsed.success ? parsed.data : null;
}

export function validPassword(password: string) {
  return (
    password.length >= 8 &&
    password.length <= 72 &&
    /[A-Za-z]/.test(password) &&
    /\d/.test(password)
  );
}

export function cleanPhone(value: FormDataEntryValue | null, required = false) {
  const phone = cleanText(value, 20);
  if (!phone) return required ? null : "";
  if (!/^[0-9+() -]{7,20}$/.test(phone)) return null;
  return phone;
}

export function cleanDate(value: FormDataEntryValue | null) {
  const key = String(value ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const parsed = new Date(`${key}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== key) {
    return null;
  }
  return key;
}

export function parseAmount(value: FormDataEntryValue | null) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0 || amount > 10_000_000) return null;
  return Math.round(amount);
}

export function isTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
