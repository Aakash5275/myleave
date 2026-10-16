"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { btnPrimary } from "@/components/ui";

export function ActionForm({
  action,
  children,
  submitLabel = "Save",
  resetOnSuccess = false,
  onSuccess,
  className = "space-y-3",
  secondary,
}: {
  action: (formData: FormData) => Promise<{ error?: string } | void>;
  children: ReactNode;
  submitLabel?: string;
  resetOnSuccess?: boolean;
  onSuccess?: () => void;
  className?: string;
  secondary?: ReactNode;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    if (submitter instanceof HTMLButtonElement && submitter.name) {
      formData.set(submitter.name, submitter.value);
    }
    startTransition(async () => {
      const result = await action(formData);
      if (result?.error) {
        setError(result.error);
        setDone(false);
        return;
      }
      setError("");
      setDone(true);
      if (resetOnSuccess) form.reset();
      onSuccess?.();
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className={className}>
      {children}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {done && !error ? <p className="text-sm text-teal">Saved.</p> : null}
      <div className="flex flex-wrap gap-2">
        <button className={btnPrimary} type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </button>
        {secondary}
      </div>
    </form>
  );
}
