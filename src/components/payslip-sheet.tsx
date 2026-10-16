import { formatMoney, formatMonth, fullName } from "@/lib/format";

export function PayslipSheet({
  employee,
  slip,
}: {
  employee: { firstName: string; lastName: string; employeeCode: string; department: string; jobTitle: string };
  slip: {
    month: number;
    year: number;
    basic: number;
    allowances: number;
    overtime: number;
    deductions: number;
    tax: number;
    netPay: number;
    status: string;
    notes: string;
  };
}) {
  const earnings = [
    ["Basic", slip.basic],
    ["Allowances", slip.allowances],
    ["Overtime", slip.overtime],
  ] as const;
  const deductions = [
    ["Deductions", slip.deductions],
    ["Tax", slip.tax],
  ] as const;

  return (
    <article className="rounded-2xl border border-line bg-white p-6 shadow-sm print:border-0 print:shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">MyLeave</p>
          <h2 className="mt-1 text-2xl font-semibold">Payslip</h2>
          <p className="text-sm text-mist">{formatMonth(slip.year, slip.month)}</p>
        </div>
        <div className="text-right text-sm">
          <p className="font-semibold">{fullName(employee)}</p>
          <p className="text-mist">{employee.jobTitle}</p>
          <p className="text-mist">{employee.department} · {employee.employeeCode}</p>
          <p className="mt-1 font-medium">{slip.status}</p>
        </div>
      </div>
      <div className="mt-5 grid gap-6 sm:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold">Earnings</h3>
          <ul className="space-y-2 text-sm">
            {earnings.map(([label, amount]) => (
              <li key={label} className="flex justify-between gap-4">
                <span className="text-mist">{label}</span>
                <span>{formatMoney(amount)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold">Deductions</h3>
          <ul className="space-y-2 text-sm">
            {deductions.map(([label, amount]) => (
              <li key={label} className="flex justify-between gap-4">
                <span className="text-mist">{label}</span>
                <span>{formatMoney(amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-6 flex items-center justify-between rounded-2xl bg-sand px-4 py-3">
        <span className="font-semibold">Net pay</span>
        <span className="text-xl font-semibold">{formatMoney(slip.netPay)}</span>
      </div>
      {slip.notes ? <p className="mt-4 text-sm text-mist">{slip.notes}</p> : null}
    </article>
  );
}
