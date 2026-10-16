"use client";

import { useEffect, useState, useTransition } from "react";
import { GpsLink } from "@/components/gps-link";
import { StatusBadge } from "@/components/status-badge";
import { Stat, td, th } from "@/components/ui";
import { setClockAnywhere } from "@/server/admin-actions";
import { loadTodayRoster, type TodayRoster } from "@/server/roster";

function PunchSpot({
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

export function LiveRoster({ initial }: { initial: TodayRoster }) {
  const [roster, setRoster] = useState(initial);
  const [anywhere, setAnywhere] = useState(initial.clockAnywhere);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setRoster(initial);
    setAnywhere(initial.clockAnywhere);
  }, [initial]);

  useEffect(() => {
    if (!pending) setAnywhere(roster.clockAnywhere);
  }, [roster.clockAnywhere, pending]);

  useEffect(() => {
    let cancelled = false;

    async function pull() {
      try {
        const next = await loadTodayRoster();
        if (cancelled) return;
        setRoster(next);
        setError("");
      } catch {
        if (!cancelled) setError("Could not refresh. Showing the last update.");
      }
    }

    const timer = window.setInterval(pull, 15000);
    function onVisible() {
      if (document.visibilityState === "visible") pull();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Today’s attendance</h2>
          <p className="text-sm text-mist">
            {roster.dateLabel} · updates every 15 seconds · last update {roster.asOf} IST
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={anywhere}
            disabled={pending}
            onClick={() => {
              const next = !anywhere;
              setAnywhere(next);
              startTransition(async () => {
                const result = await setClockAnywhere(next);
                if (result?.error) {
                  setAnywhere(!next);
                  setError(result.error);
                  return;
                }
                setRoster((current) => ({ ...current, clockAnywhere: next }));
                setError("");
              });
            }}
            className="inline-flex items-center gap-3 rounded-full border border-line bg-white px-3 py-2 text-sm font-semibold disabled:opacity-60"
          >
            <span>Everyone, anywhere</span>
            <span className={`relative h-6 w-11 rounded-full transition ${anywhere ? "bg-teal" : "bg-stone-300"}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${anywhere ? "left-5" : "left-0.5"}`} />
            </span>
            <span className="w-7 text-left">{anywhere ? "On" : "Off"}</span>
          </button>
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Live
          </span>
        </div>
      </div>
      <p className="text-sm text-mist">
        {anywhere
          ? "On: every employee can check in and check out from any place. GPS is fetched automatically and saved on both punches."
          : "Off: employees must be inside the office radius, unless their own profile allows anywhere."}
      </p>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Working now" value={roster.working} tone="ink" hint="Checked in, not out" />
        <Stat label="Checked out" value={roster.checkedOut} hint="Finished for today" />
        <Stat label="Not in" value={roster.notIn} tone="amber" hint="No check-in yet" />
      </div>
      <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr>
              <th className={th}>Employee</th>
              <th className={th}>Now</th>
              <th className={th}>Check in</th>
              <th className={th}>Check out</th>
            </tr>
          </thead>
          <tbody>
            {roster.rows.map((row) => (
              <tr key={row.id}>
                <td className={td}>
                  <p className="font-medium">{row.name}</p>
                  <p className="text-mist">
                    {row.code} · {row.department}
                    {row.remote || anywhere ? " · Anywhere" : ""}
                  </p>
                </td>
                <td className={td}><StatusBadge value={row.state} /></td>
                <td className={td}>
                  <PunchSpot time={row.checkIn} latitude={row.checkInLat} longitude={row.checkInLng} accuracy={row.checkInAccuracy} />
                </td>
                <td className={td}>
                  <PunchSpot time={row.checkOut} latitude={row.checkOutLat} longitude={row.checkOutLng} accuracy={row.checkOutAccuracy} />
                </td>
              </tr>
            ))}
            {!roster.rows.length ? (
              <tr>
                <td className={td} colSpan={4}>No active employees.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
