"use client";

import { REQUEST_STATUSES } from "@/lib/constants";
import { ActionForm } from "@/components/action-form";
import { inputClass } from "@/components/ui";

export function ReviewForm({
  action,
  id,
  status,
  note,
}: {
  action: (formData: FormData) => Promise<{ error?: string } | void>;
  id: string;
  status: string;
  note: string;
}) {
  return (
    <ActionForm action={action} submitLabel="Update" className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <select name="status" defaultValue={status} className={inputClass} aria-label="Status">
        {REQUEST_STATUSES.map((item) => (
          <option key={item}>{item}</option>
        ))}
      </select>
      <textarea
        name="note"
        defaultValue={note}
        rows={2}
        className={inputClass}
        placeholder="Note for the employee"
      />
    </ActionForm>
  );
}
