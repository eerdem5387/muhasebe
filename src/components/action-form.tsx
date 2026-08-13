"use client";

import { useActionState } from "react";
import type { ActionState } from "@/app/actions/types";
import { emptyState } from "@/app/actions/types";
import { FormError, FormSuccess, SubmitButton } from "@/components/ui";

export function ActionForm({
  action,
  children,
  submitLabel,
  className,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  submitLabel: string;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, emptyState);
  return (
    <form action={formAction} className={className ?? "space-y-4"}>
      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      {children}
      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}

/** Small inline form for single-action buttons (delete, stage change). */
export function MiniForm({
  action,
  children,
  className,
}: {
  action: (formData: FormData) => void | Promise<void>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <form action={action} className={className}>
      {children}
    </form>
  );
}
