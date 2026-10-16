import { coordLabel, mapsHref } from "@/lib/geo";

export function GpsLink({ latitude, longitude }: { latitude: number; longitude: number }) {
  return (
    <a
      className="text-xs font-medium text-teal underline-offset-2 hover:underline"
      href={mapsHref(latitude, longitude)}
      target="_blank"
      rel="noreferrer"
    >
      {coordLabel(latitude, longitude)}
    </a>
  );
}

export function PunchLocation({
  time,
  latitude,
  longitude,
  accuracy,
}: {
  time: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
}) {
  return (
    <div>
      <p>{time ?? "—"}</p>
      {latitude != null && longitude != null ? (
        <p className="mt-1">
          <GpsLink latitude={latitude} longitude={longitude} />
          {accuracy != null ? <span className="mt-0.5 block text-[11px] text-mist">±{Math.round(accuracy)} m</span> : null}
        </p>
      ) : null}
    </div>
  );
}
