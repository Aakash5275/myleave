"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { btnPrimary } from "@/components/ui";
import { approveAttendance } from "@/server/manager-actions";

export function ApproveAttendanceButton({ userId, day }: { userId: string; day: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <div>
      <button
        className={btnPrimary}
        type="button"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            const result = await approveAttendance(userId, day);
            if (result.error) {
              setError(result.error);
              return;
            }
            setError("");
            router.refresh();
          });
        }}
      >
        {pending ? "Approving…" : "Approve"}
      </button>
      {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
