"use client";

import { useActionState } from "react";
import Image from "next/image";
import { loginAction } from "@/app/actions/auth";
import { emptyState } from "@/app/actions/types";
import { FormError, SubmitButton } from "@/components/ui";

const showDemoHints = process.env.NODE_ENV !== "production";

export default function LoginPage() {
  const [state, action] = useActionState(loginAction, emptyState);

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <div
        className="pointer-events-none absolute inset-0 bg-app-mesh"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-brand-600/10 to-transparent"
        aria-hidden
      />

      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="rounded-2xl bg-white/80 p-4 shadow-soft ring-1 ring-ink-100">
            <Image
              src="/logo.png"
              alt="Levent Koleji"
              width={160}
              height={48}
              className="h-12 w-auto object-contain"
              priority
            />
          </div>
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-ink-950">Muhasebe</h1>
          <p className="mt-1.5 text-sm text-ink-500">Kayıt ücreti · Tahsilat · Gider onayı</p>
        </div>

        <form action={action} className="card space-y-5 p-7 shadow-lift">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-ink-900">Giriş yap</h2>
            <p className="mt-1 text-sm text-ink-500">Kurum hesabınızla devam edin</p>
          </div>
          <FormError message={state.error} />
          <div>
            <label className="label" htmlFor="email">
              E-posta
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="input"
              required
              autoComplete="email"
              defaultValue={showDemoHints ? "demo@muhasebe.test" : undefined}
            />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Şifre
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="input"
              required
              autoComplete="current-password"
            />
          </div>
          <SubmitButton className="w-full !py-3">Giriş yap</SubmitButton>
        </form>

        {showDemoHints ? (
          <p className="mt-5 text-center text-xs text-ink-400">
            Geliştirme: demo@muhasebe.test / 123456
          </p>
        ) : null}
      </div>
    </div>
  );
}
