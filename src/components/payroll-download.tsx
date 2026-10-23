"use client";

import { useState } from "react";
import { btnPrimary, Field, inputClass } from "@/components/ui";

export function PayrollDownload({ defaultMonth }: { defaultMonth: string }) {
  const [month, setMonth] = useState(defaultMonth);
  return (
    <form className="flex flex-wrap items-end gap-3" action="/employee/payroll/file" method="get">
      <Field label="Month">
        <input className={inputClass} type="month" name="month" value={month} onChange={(event) => setMonth(event.target.value)} required />
      </Field>
      <button className={btnPrimary} type="submit">Download PDF</button>
    </form>
  );
}
