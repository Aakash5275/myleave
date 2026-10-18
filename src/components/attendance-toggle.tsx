"use client";

import { useEffect, useState, useTransition } from "react";
import { setAttendanceEnabled } from "@/server/admin-actions";

export function AttendanceToggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange?: (enabled: boolean) => void;
}) {
  const [on, setOn] = useState(enabled);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!pending) setOn(enabled);
  }, [enabled, pending]);

  return (
    <div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={pending}
        onClick={() => {
          const next = !on;
          setOn(next);
          startTransition(async () => {
            const result = await setAttendanceEnabled(next);
            if (result?.error) {
              setOn(!next);
              setError(result.error);
              return;
            }
            onChange?.(next);
            setError("");
          });
        }}
        className="inline-flex items-center gap-3 rounded-full border border-line bg-white px-3 py-2 text-sm font-semibold disabled:opacity-60"
      >
        <span>Employee attendance</span>
        <span className={`relative h-6 w-11 rounded-full transition ${on ? "bg-teal" : "bg-stone-300"}`}>
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${on ? "left-5" : "left-0.5"}`} />
        </span>
        <span className="w-7 text-left">{on ? "On" : "Off"}</span>
      </button>
      {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
