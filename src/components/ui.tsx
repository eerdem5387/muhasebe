"use client";

import { useFormStatus } from "react-dom";
import clsx from "clsx";

export function SubmitButton({
  children,
  className,
  variant = "primary",
  pendingText,
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "danger";
  pendingText?: string;
}) {
  const { pending } = useFormStatus();
  const cls =
    variant === "secondary" ? "btn-secondary" : variant === "danger" ? "btn-danger" : "btn-primary";
  return (
    <button type="submit" disabled={pending} className={clsx(cls, className)}>
      {pending ? (pendingText ?? "İşleniyor...") : children}
    </button>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {message}
    </p>
  );
}

export function FormSuccess({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
      {message}
    </p>
  );
}

const badgeColors: Record<string, string> = {
  gray: "bg-slate-100 text-slate-700",
  green: "bg-emerald-100 text-emerald-700",
  blue: "bg-brand-100 text-brand-700",
  amber: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-700",
  purple: "bg-purple-100 text-purple-700",
};

export function Badge({ children, color = "gray" }: { children: React.ReactNode; color?: keyof typeof badgeColors }) {
  return <span className={clsx("badge", badgeColors[color])}>{children}</span>;
}
