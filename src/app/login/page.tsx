"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/actions/auth";
import { emptyState } from "@/app/actions/types";
import { FormError, SubmitButton } from "@/components/ui";

export default function LoginPage() {
  const [state, action] = useActionState(loginAction, emptyState);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-slate-100 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Okul Muhasebe</h1>
          <p className="mt-1 text-sm text-slate-500">Kayıt ücreti · Tahsilat · Gider onayı</p>
        </div>
        <form action={action} className="card space-y-4 p-6">
          <h2 className="text-lg font-semibold text-slate-800">Giriş yap</h2>
          <FormError message={state.error} />
          <div>
            <label className="label" htmlFor="email">E-posta</label>
            <input id="email" name="email" type="email" className="input" required autoComplete="email" defaultValue="demo@muhasebe.test" />
          </div>
          <div>
            <label className="label" htmlFor="password">Şifre</label>
            <input id="password" name="password" type="password" className="input" required autoComplete="current-password" />
          </div>
          <SubmitButton className="w-full">Giriş yap</SubmitButton>
        </form>
        <p className="mt-4 text-center text-xs text-slate-400">
          Demo: demo@muhasebe.test / 123456
        </p>
      </div>
    </div>
  );
}
