"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { Modal } from "@/components/modal";
import { btnPrimary, btnSecondary, Field, inputClass } from "@/components/ui";
import { ATTENDANCE_STATUSES, DEPARTMENTS, EMPLOYEE_STATUSES, OTHER_DEPARTMENT } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import { GpsLink } from "@/components/gps-link";
import { MAX_RADIUS_M, MIN_RADIUS_M } from "@/lib/geo";
import {
  assignManager,
  createEmployee,
  deleteAnnouncement,
  markMissingAbsent,
  resetEmployeePassword,
  saveAnnouncement,
  savePayslip,
  saveWorkplace,
  toggleAnnouncementPin,
  updateAttendance,
  updateEmployee,
} from "@/server/admin-actions";

function DepartmentField({ defaultValue = "Engineering" }: { defaultValue?: string }) {
  const preset = (DEPARTMENTS as readonly string[]).includes(defaultValue);
  const [choice, setChoice] = useState(preset ? defaultValue : OTHER_DEPARTMENT);
  const [custom, setCustom] = useState(preset ? "" : defaultValue);

  return (
    <Field label="Department">
      <select className={inputClass} name="department" value={choice} onChange={(event) => setChoice(event.target.value)}>
        {DEPARTMENTS.map((item) => (
          <option key={item}>{item}</option>
        ))}
        <option value={OTHER_DEPARTMENT}>Other — type a department</option>
      </select>
      {choice === OTHER_DEPARTMENT ? (
        <input
          className={`${inputClass} mt-2`}
          name="customDepartment"
          value={custom}
          onChange={(event) => setCustom(event.target.value)}
          placeholder="Type a department"
          required
          minLength={2}
          maxLength={40}
        />
      ) : null}
    </Field>
  );
}

function AccessFields({
  role = "EMPLOYEE",
  managerId = "",
  managers,
}: {
  role?: string;
  managerId?: string;
  managers: { id: string; name: string }[];
}) {
  const [account, setAccount] = useState(role === "MANAGER" || role === "ACCOUNTANT" ? role : "EMPLOYEE");
  const [lead, setLead] = useState(managerId);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Role">
        <select className={inputClass} name="role" value={account} onChange={(event) => setAccount(event.target.value)}>
          <option value="EMPLOYEE">Employee</option>
          <option value="MANAGER">Manager</option>
          <option value="ACCOUNTANT">Accountant</option>
        </select>
      </Field>
      {account === "EMPLOYEE" ? (
        <Field label="Manager">
          <select className={inputClass} name="managerId" value={lead} onChange={(event) => setLead(event.target.value)}>
            <option value="">No manager</option>
            {managers.map((manager) => (
              <option key={manager.id} value={manager.id}>{manager.name}</option>
            ))}
          </select>
        </Field>
      ) : (
        <p className="self-end text-sm text-mist">
          {account === "ACCOUNTANT"
            ? "This person can see every employee, upload pay documents, and edit salaries and payslips."
            : "This person can add employees and approve their attendance."}
        </p>
      )}
    </div>
  );
}

export function CreateEmployeeButton({
  managers = [],
  action = createEmployee,
  showAccess = true,
  fixedManager,
  label = "Add employee",
}: {
  managers?: { id: string; name: string }[];
  action?: typeof createEmployee;
  showAccess?: boolean;
  fixedManager?: { id: string; name: string };
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className={btnPrimary} type="button" onClick={() => setOpen(true)}>
        {label}
      </button>
      <Modal open={open} title={fixedManager ? `Add employee under ${fixedManager.name}` : "Add employee"} onClose={() => setOpen(false)}>
        <ActionForm action={action} submitLabel="Create account" resetOnSuccess onSuccess={() => setOpen(false)}>
          {fixedManager ? (
            <>
              <input type="hidden" name="role" value="EMPLOYEE" />
              <input type="hidden" name="managerId" value={fixedManager.id} />
              <p className="text-sm text-mist">This employee will report to {fixedManager.name}.</p>
            </>
          ) : showAccess ? (
            <AccessFields managers={managers} />
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="First name">
              <input className={inputClass} name="firstName" required />
            </Field>
            <Field label="Last name">
              <input className={inputClass} name="lastName" required />
            </Field>
          </div>
          <Field label="Work email">
            <input className={inputClass} type="email" name="email" required />
          </Field>
          <Field label="Temporary password">
            <input className={inputClass} type="text" name="password" required minLength={8} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <DepartmentField />
            <Field label="Job title">
              <input className={inputClass} name="jobTitle" required />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Hire date">
              <input className={inputClass} type="date" name="hireDate" required />
            </Field>
            <Field label="Monthly salary (INR)">
              <input className={inputClass} type="number" name="salary" min={0} required />
            </Field>
          </div>
          <Field label="Phone">
            <input className={inputClass} name="phone" />
          </Field>
        </ActionForm>
      </Modal>
    </>
  );
}

export function ManagerAssign({
  employeeId,
  managerId,
  managers,
}: {
  employeeId: string;
  managerId: string;
  managers: { id: string; name: string }[];
}) {
  const [value, setValue] = useState(managerId);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setValue(managerId);
  }, [managerId]);

  return (
    <div>
      <select
        className={inputClass}
        value={value}
        disabled={pending}
        aria-label="Manager"
        onChange={(event) => {
          const next = event.target.value;
          const previous = value;
          setValue(next);
          setError("");
          const data = new FormData();
          data.set("id", employeeId);
          data.set("managerId", next);
          startTransition(async () => {
            const result = await assignManager(data);
            if ("error" in result && typeof result.error === "string") {
              setValue(previous);
              setError(result.error);
            }
          });
        }}
      >
        <option value="">No manager</option>
        {managers.map((manager) => (
          <option key={manager.id} value={manager.id}>{manager.name}</option>
        ))}
      </select>
      {error ? <p className="mt-1 text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}

export function EmployeeEditor({
  employee,
  managers = [],
  action = updateEmployee,
  showAccess = true,
  showSalary = true,
}: {
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    department: string;
    jobTitle: string;
    hireDate: string;
    address: string;
    emergencyName: string;
    emergencyPhone: string;
    status: string;
    remoteClock: boolean;
    salary: number;
    role?: string;
    managerId?: string;
  };
  managers?: { id: string; name: string }[];
  action?: typeof updateEmployee;
  showAccess?: boolean;
  showSalary?: boolean;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold">Employment record</h2>
        <ActionForm action={action} submitLabel="Save changes">
          <input type="hidden" name="id" value={employee.id} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="First name">
              <input className={inputClass} name="firstName" defaultValue={employee.firstName} required />
            </Field>
            <Field label="Last name">
              <input className={inputClass} name="lastName" defaultValue={employee.lastName} required />
            </Field>
          </div>
          <Field label="Email">
            <input className={inputClass} type="email" name="email" defaultValue={employee.email} required />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <DepartmentField defaultValue={employee.department} />
            <Field label="Status">
              <select className={inputClass} name="status" defaultValue={employee.status}>
                {EMPLOYEE_STATUSES.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Job title">
            <input className={inputClass} name="jobTitle" defaultValue={employee.jobTitle} required />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Hire date">
              <input className={inputClass} type="date" name="hireDate" defaultValue={employee.hireDate} required />
            </Field>
            {showSalary ? (
              <Field label="Monthly salary (INR)">
                <input className={inputClass} type="number" name="salary" min={0} defaultValue={employee.salary} required />
              </Field>
            ) : null}
          </div>
          {showAccess ? (
            <AccessFields role={employee.role} managerId={employee.managerId} managers={managers} />
          ) : null}
          <label className="flex items-start gap-2 text-sm">
            <input className="mt-1" type="checkbox" name="remoteClock" defaultChecked={employee.remoteClock} />
            <span>Allow check-in and check-out from anywhere. GPS and the time are still saved.</span>
          </label>
          <Field label="Phone">
            <input className={inputClass} name="phone" defaultValue={employee.phone} />
          </Field>
          <Field label="Address">
            <textarea className={inputClass} name="address" rows={2} defaultValue={employee.address} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Emergency contact">
              <input className={inputClass} name="emergencyName" defaultValue={employee.emergencyName} />
            </Field>
            <Field label="Emergency phone">
              <input className={inputClass} name="emergencyPhone" defaultValue={employee.emergencyPhone} />
            </Field>
          </div>
        </ActionForm>
      </div>
      {showAccess ? <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-base font-semibold">Reset password</h2>
        <p className="mb-4 text-sm text-mist">Share the temporary password directly. It is stored only as a hash.</p>
        <ActionForm action={resetEmployeePassword} submitLabel="Reset password" resetOnSuccess>
          <input type="hidden" name="id" value={employee.id} />
          <Field label="New password">
            <input className={inputClass} name="password" type="text" required />
          </Field>
          <Field label="Confirm password">
            <input className={inputClass} name="confirm" type="text" required />
          </Field>
        </ActionForm>
      </div> : null}
    </div>
  );
}

export function WorkplaceForm({
  workplace,
}: {
  workplace: { name: string; latitude: number; longitude: number; radiusM: number } | null;
}) {
  const [latitude, setLatitude] = useState(workplace ? String(workplace.latitude) : "");
  const [longitude, setLongitude] = useState(workplace ? String(workplace.longitude) : "");
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");

  function useMyLocation() {
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError("This browser cannot read your GPS location.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
      },
      () => {
        setLocating(false);
        setLocationError("Allow location access, then try again at the office.");
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold">Office location</h2>
      <p className="mt-1 text-sm text-mist">
        Employees can check in and out only when their GPS is inside this radius.
        {workplace ? (
          <>
            {" "}
            Current site: <GpsLink latitude={workplace.latitude} longitude={workplace.longitude} />.
          </>
        ) : null}
      </p>
      <div className="mt-4">
        <ActionForm
          action={saveWorkplace}
          submitLabel="Save office"
          secondary={
            <button className={btnSecondary} type="button" disabled={locating} onClick={useMyLocation}>
              {locating ? "Finding GPS…" : "Use my location"}
            </button>
          }
        >
          <Field label="Name">
            <input className={inputClass} name="name" defaultValue={workplace?.name ?? "Office"} required minLength={2} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Latitude">
              <input className={inputClass} name="latitude" value={latitude} onChange={(event) => setLatitude(event.target.value)} required inputMode="decimal" />
            </Field>
            <Field label="Longitude">
              <input className={inputClass} name="longitude" value={longitude} onChange={(event) => setLongitude(event.target.value)} required inputMode="decimal" />
            </Field>
            <Field label="Radius (metres)">
              <input
                className={inputClass}
                name="radiusM"
                type="number"
                min={MIN_RADIUS_M}
                max={MAX_RADIUS_M}
                step={1}
                defaultValue={workplace?.radiusM ?? 150}
                required
              />
            </Field>
          </div>
          {locationError ? <p className="text-sm text-rose-600">{locationError}</p> : null}
        </ActionForm>
      </div>
    </div>
  );
}

export function AttendanceEditor({
  userId,
  date,
  status,
  checkIn,
  checkOut,
  notes,
}: {
  userId: string;
  date: string;
  status: string;
  checkIn: string;
  checkOut: string;
  notes: string;
}) {
  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-sm font-medium text-teal">Update</summary>
      <div className="mt-2">
        <ActionForm action={updateAttendance} submitLabel="Save attendance">
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="date" value={date} />
          <select className={inputClass} name="status" defaultValue={status || "Present"} aria-label="Attendance status">
            {ATTENDANCE_STATUSES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input className={inputClass} name="checkIn" defaultValue={checkIn} placeholder="09:00" aria-label="Check in" />
            <input className={inputClass} name="checkOut" defaultValue={checkOut} placeholder="18:00" aria-label="Check out" />
          </div>
          <input className={inputClass} name="notes" defaultValue={notes} placeholder="Note" aria-label="Note" />
        </ActionForm>
      </div>
    </details>
  );
}

export function MarkAbsentButton({ date }: { date: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <div>
      <button
        className={btnSecondary}
        type="button"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            const result = await markMissingAbsent(date);
            if (result.error) {
              setMessage(result.error);
              return;
            }
            setMessage(result.count ? `Marked ${result.count} employee(s) absent.` : "Everyone already has a record.");
            router.refresh();
          });
        }}
      >
        {pending ? "Marking…" : "Mark unmarked absent"}
      </button>
      {message ? <p className="mt-2 text-sm text-mist">{message}</p> : null}
    </div>
  );
}

export function PayslipForm({
  employees,
  payslip,
}: {
  employees: Array<{ id: string; name: string; salary: number }>;
  payslip?: {
    id: string;
    userId: string;
    month: number;
    year: number;
    basic: number;
    allowances: number;
    tax: number;
    notes: string;
  };
}) {
  const [userId, setUserId] = useState(payslip?.userId ?? employees[0]?.id ?? "");
  const selected = employees.find((employee) => employee.id === userId);
  const [basic, setBasic] = useState(payslip?.basic ?? selected?.salary ?? 0);
  const [allowances, setAllowances] = useState(payslip?.allowances ?? 0);
  const [tax, setTax] = useState(payslip?.tax ?? 0);
  const net = useMemo(() => basic + allowances - tax, [basic, allowances, tax]);

  return (
    <ActionForm className="@container space-y-3" action={savePayslip} submitLabel="Issue payslip" secondary={<button className={btnSecondary} name="intent" value="draft" type="submit">Save draft</button>}>
      {payslip?.id ? <input type="hidden" name="id" value={payslip.id} /> : null}
      <Field label="Employee" className="min-w-0!">
        <select
          className={inputClass}
          name="userId"
          value={userId}
          onChange={(event) => {
            const next = event.target.value;
            setUserId(next);
            if (!payslip?.id && payslip?.basic === undefined) {
              const person = employees.find((employee) => employee.id === next);
              if (person) setBasic(person.salary);
            }
          }}
        >
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-1 gap-3 @md:grid-cols-2">
        <Field label="Month" className="min-w-0!">
          <input className={inputClass} type="number" name="month" min={1} max={12} defaultValue={payslip?.month ?? new Date().getMonth() + 1} required />
        </Field>
        <Field label="Year" className="min-w-0!">
          <input className={inputClass} type="number" name="year" min={2000} max={2100} defaultValue={payslip?.year ?? new Date().getFullYear()} required />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-3 @md:grid-cols-2">
        <Field label="Basic" className="min-w-0!">
          <input className={inputClass} type="number" name="basic" min={0} value={basic} onChange={(event) => setBasic(Number(event.target.value))} required />
        </Field>
        <Field label="Allowances" className="min-w-0!">
          <input className={inputClass} type="number" name="allowances" min={0} value={allowances} onChange={(event) => setAllowances(Number(event.target.value))} required />
        </Field>
        <Field label="Tax" className="min-w-0!">
          <input className={inputClass} type="number" name="tax" min={0} value={tax} onChange={(event) => setTax(Number(event.target.value))} required />
        </Field>
      </div>
      <p className={`text-sm font-semibold ${net < 0 ? "text-rose-600" : "text-ink"}`}>Net pay {formatMoney(Number.isFinite(net) ? net : 0)}</p>
      <Field label="Notes">
        <textarea className={inputClass} name="notes" rows={2} defaultValue={payslip?.notes ?? ""} />
      </Field>
    </ActionForm>
  );
}

export function AnnouncementForm() {
  return (
    <ActionForm action={saveAnnouncement} submitLabel="Publish" resetOnSuccess>
      <Field label="Title">
        <input className={inputClass} name="title" required minLength={4} />
      </Field>
      <Field label="Message">
        <textarea className={inputClass} name="body" rows={4} required minLength={10} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="pinned" />
        Pin to the top
      </label>
    </ActionForm>
  );
}

export function AnnouncementActions({ id, pinned }: { id: string; pinned: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      <ActionForm action={toggleAnnouncementPin} submitLabel={pinned ? "Unpin" : "Pin"}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="pinned" value={String(pinned)} />
      </ActionForm>
      <ActionForm action={deleteAnnouncement} submitLabel="Delete">
        <input type="hidden" name="id" value={id} />
      </ActionForm>
    </div>
  );
}

export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <button className={`${btnSecondary} print:hidden`} type="button" onClick={() => window.print()}>
      {label}
    </button>
  );
}
