"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { Modal } from "@/components/modal";
import { btnDanger, btnPrimary, btnSecondary, Field, inputClass } from "@/components/ui";
import { DOC_TYPES, HR_CATEGORIES, LEAVE_TYPES, PRIORITIES } from "@/lib/constants";
import { GpsLink } from "@/components/gps-link";
import { clock, applyLeave, cancelLeave, changePassword, createDocumentRequest, createHrRequest, updateProfile } from "@/server/employee-actions";

type PunchLocation = { latitude: number; longitude: number } | null;

export function AttendanceClock({
  dateLabel,
  checkIn,
  checkOut,
  checkInLocation,
  checkOutLocation,
  status,
  office,
  remoteClock,
}: {
  dateLabel: string;
  checkIn: string | null;
  checkOut: string | null;
  checkInLocation: PunchLocation;
  checkOutLocation: PunchLocation;
  status: string | null;
  office: { name: string; latitude: number; longitude: number; radiusM: number } | null;
  remoteClock: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [locating, setLocating] = useState<"in" | "out" | null>(null);
  const [pending, startTransition] = useTransition();

  function punch(kind: "in" | "out") {
    setError("");
    if (!remoteClock && !office) {
      setError("HR has not set the office location yet.");
      return;
    }
    if (!navigator.geolocation) {
      setError("This browser cannot read your GPS location.");
      return;
    }
    setLocating(kind);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(null);
        const { latitude, longitude, accuracy } = position.coords;
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(accuracy)) {
          setError("The GPS reading was incomplete. Try again.");
          return;
        }
        startTransition(async () => {
          const result = await clock(kind, { latitude, longitude, accuracy });
          if (result.error) {
            setError(result.error);
            return;
          }
          setError("");
          router.refresh();
        });
      },
      (failure) => {
        setLocating(null);
        if (failure.code === failure.PERMISSION_DENIED) {
          setError("Allow location access to check in or out.");
          return;
        }
        if (failure.code === failure.POSITION_UNAVAILABLE) {
          setError("GPS is unavailable. Turn on location and try again.");
          return;
        }
        setError("Finding your location took too long. Try again outdoors.");
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  }

  const busy = pending || locating !== null;

  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
      <p className="text-sm text-mist">Today · {dateLabel}</p>
      <p className="mt-2 text-2xl font-semibold">{status ?? "Not checked in"}</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-mist">Check in</dt>
          <dd className="font-medium">{checkIn ?? "—"}</dd>
          {checkInLocation ? (
            <dd className="mt-1">
              <GpsLink latitude={checkInLocation.latitude} longitude={checkInLocation.longitude} />
            </dd>
          ) : null}
        </div>
        <div>
          <dt className="text-mist">Check out</dt>
          <dd className="font-medium">{checkOut ?? "—"}</dd>
          {checkOutLocation ? (
            <dd className="mt-1">
              <GpsLink latitude={checkOutLocation.latitude} longitude={checkOutLocation.longitude} />
            </dd>
          ) : null}
        </div>
      </dl>
      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <button className={btnPrimary} type="button" disabled={busy || (!remoteClock && !office) || Boolean(checkIn)} onClick={() => punch("in")}>
          {locating === "in" ? "Finding GPS…" : "Check in"}
        </button>
        <button className={btnSecondary} type="button" disabled={busy || (!remoteClock && !office) || !checkIn || Boolean(checkOut)} onClick={() => punch("out")}>
          {locating === "out" ? "Finding GPS…" : "Check out"}
        </button>
      </div>
      <p className="mt-3 text-xs text-mist">
        {remoteClock
          ? "You can check in from anywhere. GPS and the time are still saved. Check-in after 09:30 is marked late. Times use India Standard Time."
          : office
            ? `GPS is required. You must be within ${office.radiusM} m of ${office.name}. Check-in after 09:30 is marked late. Times use India Standard Time.`
            : "GPS check-in is waiting for HR to save the office location."}
      </p>
    </div>
  );
}

export function CancelLeaveButton({ id }: { id: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <div>
      <button
        className={btnDanger}
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm("Withdraw this leave? No one will be notified.")) return;
          startTransition(async () => {
            const result = await cancelLeave(id);
            if (result.error) {
              setError(result.error);
              return;
            }
            setError("");
            router.refresh();
          });
        }}
      >
        {pending ? "Withdrawing…" : "Withdraw"}
      </button>
      {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}

export function LeaveApplyButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className={btnPrimary} type="button" onClick={() => setOpen(true)}>
        Apply for leave
      </button>
      <Modal open={open} title="Apply for leave" onClose={() => setOpen(false)}>
        <ActionForm action={applyLeave} submitLabel="Submit request" resetOnSuccess onSuccess={() => setOpen(false)}>
          <Field label="Type">
            <select name="type" className={inputClass} defaultValue="Unpaid">
              {LEAVE_TYPES.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Start">
              <input className={inputClass} type="date" name="startDate" required />
            </Field>
            <Field label="End">
              <input className={inputClass} type="date" name="endDate" required />
            </Field>
          </div>
          <Field label="Reason">
            <textarea className={inputClass} name="reason" rows={4} required minLength={8} placeholder="Why do you need this leave?" />
          </Field>
        </ActionForm>
      </Modal>
    </>
  );
}

export function HrRequestButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className={btnPrimary} type="button" onClick={() => setOpen(true)}>
        New request
      </button>
      <Modal open={open} title="Raise an HR request" onClose={() => setOpen(false)}>
        <ActionForm action={createHrRequest} submitLabel="Submit" resetOnSuccess onSuccess={() => setOpen(false)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Category">
              <select name="category" className={inputClass} defaultValue="Payroll">
                {HR_CATEGORIES.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </Field>
            <Field label="Priority">
              <select name="priority" className={inputClass} defaultValue="Medium">
                {PRIORITIES.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Subject">
            <input className={inputClass} name="subject" required minLength={4} placeholder="Short summary" />
          </Field>
          <Field label="Description">
            <textarea className={inputClass} name="description" rows={4} required minLength={10} placeholder="What should HR look at?" />
          </Field>
        </ActionForm>
      </Modal>
    </>
  );
}

export function DocumentRequestButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className={btnPrimary} type="button" onClick={() => setOpen(true)}>
        Request document
      </button>
      <Modal open={open} title="Request a document" onClose={() => setOpen(false)}>
        <ActionForm action={createDocumentRequest} submitLabel="Submit" resetOnSuccess onSuccess={() => setOpen(false)}>
          <Field label="Document">
            <select name="docType" className={inputClass} defaultValue={DOC_TYPES[0]}>
              {DOC_TYPES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
          <Field label="Purpose">
            <textarea className={inputClass} name="purpose" rows={3} required minLength={8} placeholder="Who is this for, and why?" />
          </Field>
          <Field label="Extra details">
            <textarea className={inputClass} name="details" rows={3} placeholder="Optional dates, address, or wording" />
          </Field>
        </ActionForm>
      </Modal>
    </>
  );
}

export function ProfileForms({
  phone,
  address,
  emergencyName,
  emergencyPhone,
}: {
  phone: string;
  address: string;
  emergencyName: string;
  emergencyPhone: string;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold">Contact details</h2>
        <ActionForm action={updateProfile} submitLabel="Save profile">
          <Field label="Phone">
            <input className={inputClass} name="phone" defaultValue={phone} />
          </Field>
          <Field label="Address">
            <textarea className={inputClass} name="address" rows={3} defaultValue={address} />
          </Field>
          <Field label="Emergency contact">
            <input className={inputClass} name="emergencyName" defaultValue={emergencyName} />
          </Field>
          <Field label="Emergency phone">
            <input className={inputClass} name="emergencyPhone" defaultValue={emergencyPhone} />
          </Field>
        </ActionForm>
      </div>
      <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-base font-semibold">Password</h2>
        <p className="mb-4 text-sm text-mist">Use at least 8 characters, with a letter and a number.</p>
        <ActionForm action={changePassword} submitLabel="Update password" resetOnSuccess>
          <Field label="Current password">
            <input className={inputClass} type="password" name="current" autoComplete="current-password" required />
          </Field>
          <Field label="New password">
            <input className={inputClass} type="password" name="next" autoComplete="new-password" required />
          </Field>
          <Field label="Confirm new password">
            <input className={inputClass} type="password" name="confirm" autoComplete="new-password" required />
          </Field>
        </ActionForm>
      </div>
    </div>
  );
}
