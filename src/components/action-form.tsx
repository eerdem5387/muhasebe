"use client";

import { useActionState, useEffect, useRef } from "react";
import type { ActionState } from "@/app/actions/types";
import { emptyState } from "@/app/actions/types";
import { FormError, FormSuccess, SubmitButton } from "@/components/ui";
import { useModalClose } from "@/components/form-modal";

export function ActionForm({
  action,
  children,
  submitLabel,
  className,
  onSuccess,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  submitLabel: string;
  className?: string;
  onSuccess?: () => void;
}) {
  const [state, formAction] = useActionState(action, emptyState);
  const lastSuccess = useRef<string | null>(null);
  const modalClose = useModalClose();

  useEffect(() => {
    if (state.success && state.success !== lastSuccess.current) {
      lastSuccess.current = state.success;
      onSuccess?.();
      modalClose?.();
    }
  }, [state.success, onSuccess, modalClose]);

  return (
    <form action={formAction} encType="multipart/form-data" className={className ?? "space-y-4"}>
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
