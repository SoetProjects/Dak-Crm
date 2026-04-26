"use client";

import { useFormState } from "react-dom";

type ActionState = {
  ok: boolean;
  message: string;
};

type ActionFormProps = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
};

export function ActionForm({ action, children, className }: ActionFormProps) {
  const [state, formAction] = useFormState(action, { ok: false, message: "" });

  return (
    <form action={formAction} className={className}>
      {children}
      {state.message ? (
        <p className={`mt-2 text-sm ${state.ok ? "text-blue-700" : "text-red-600"}`}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
