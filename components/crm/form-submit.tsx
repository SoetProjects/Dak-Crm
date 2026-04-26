"use client";

import { useFormStatus } from "react-dom";

type FormSubmitProps = {
  label: string;
  loadingLabel?: string;
};

export function FormSubmit({ label, loadingLabel = "Opslaan..." }: FormSubmitProps) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-[#163158] disabled:opacity-60"
    >
      {pending ? loadingLabel : label}
    </button>
  );
}
