export const WORKPLACE_ID = "default";
export const ORG_SETTING_ID = "default";
export const MIN_RADIUS_M = 50;
export const MAX_RADIUS_M = 2000;

export type GpsFix = {
  latitude: number;
  longitude: number;
  accuracy: number;
};

export function parseGps(input: unknown): GpsFix | null {
  if (!input || typeof input !== "object") return null;
  const value = input as Record<string, unknown>;
  const latitude = value.latitude;
  const longitude = value.longitude;
  const accuracy = value.accuracy;
  if (typeof latitude !== "number" || typeof longitude !== "number" || typeof accuracy !== "number") return null;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(accuracy)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  if (accuracy < 0 || accuracy > 10000) return null;
  return { latitude, longitude, accuracy };
}

export function parseCoordinate(value: FormDataEntryValue | null, min: number, max: number) {
  const raw = String(value ?? "").trim();
  if (!/^-?\d+(\.\d+)?$/.test(raw)) return null;
  const number = Number(raw);
  if (!Number.isFinite(number) || number < min || number > max) return null;
  return number;
}

export function distanceMeters(fromLat: number, fromLng: number, toLat: number, toLng: number) {
  const earth = 6_371_000;
  const rad = (degrees: number) => (degrees * Math.PI) / 180;
  const latDelta = rad(toLat - fromLat);
  const lngDelta = rad(toLng - fromLng);
  const haversine =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(rad(fromLat)) * Math.cos(rad(toLat)) * Math.sin(lngDelta / 2) ** 2;
  return 2 * earth * Math.asin(Math.min(1, Math.sqrt(haversine)));
}

export function mapsHref(latitude: number, longitude: number) {
  return `https://www.google.com/maps?q=${latitude.toFixed(6)},${longitude.toFixed(6)}`;
}

export function coordLabel(latitude: number, longitude: number) {
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}
