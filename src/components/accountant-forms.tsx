"use client";

import { useState, useTransition } from "react";
import { PayslipForm } from "@/components/admin-forms";
import { ActionForm } from "@/components/action-form";
import { btnPrimary, Field, inputClass } from "@/components/ui";
import type { PayDraft } from "@/lib/payroll-extract";
import { importPayDocument, updateSalary } from "@/server/accountant-actions";

export function SalaryEditor({ id, salary, label = "Save" }: { id: string; salary: number; label?: string }) {
  return (
    <ActionForm action={updateSalary} submitLabel={label} className="flex min-w-40 items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <input className={inputClass} type="number" name="salary" min={0} defaultValue={salary} aria-label="Monthly salary in INR" required />
    </ActionForm>
  );
}

export function PayImport({
  employees,
  userId,
}: {
  employees: Array<{ id: string; name: string; salary: number }>;
  userId?: string;
}) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ draft: PayDraft; fileName: string; empty: boolean } | null>(null);

  return (
    <div className="space-y-4">
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          setError("");
          startTransition(async () => {
            const response = await importPayDocument(data);
            if ("error" in response) {
              setError(response.error);
              return;
            }
            setResult(response);
          });
        }}
      >
        {userId ? <input type="hidden" name="userId" value={userId} /> : null}
        <Field label="PDF or Word document">
          <input className={inputClass} type="file" name="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required />
        </Field>
        <button className={btnPrimary} type="submit" disabled={pending}>
          {pending ? "Reading…" : "Extract pay details"}
        </button>
        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      </form>
      {result ? (
        <div className="space-y-3 border-t border-line pt-4">
          <p className="text-sm text-mist">
            {result.empty
              ? `${result.fileName} is saved. No text could be read, so type every amount below.`
              : result.draft.found.length
                ? `Read ${result.draft.found.join(", ")} from ${result.fileName}. You can change every field before saving.`
                : `${result.fileName} is saved. No labeled amounts were found, so fill in every field.`}
          </p>
          <PayslipForm
            key={`${result.fileName}-${result.draft.userId}-${result.draft.basic}-${result.draft.month}`}
            employees={employees}
            payslip={{ id: "", ...result.draft }}
          />
        </div>
      ) : null}
    </div>
  );
}
