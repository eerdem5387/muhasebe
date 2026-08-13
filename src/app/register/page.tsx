"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerAction } from "@/app/actions/auth";
import { emptyState } from "@/app/actions/types";
import { FormError, SubmitButton } from "@/components/ui";

export default function RegisterPage() {
  const [state, action] = useActionState(registerAction, emptyState);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-slate-100 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Muhasebe SaaS</h1>
          <p className="mt-1 text-sm text-slate-500">Yeni hesap oluşturun</p>
        </div>
        <form action={action} className="card space-y-4 p-6">
          <FormError message={state.error} />
          <div>
            <label className="label" htmlFor="tenantName">Organizasyon (Tenant) adı</label>
            <input id="tenantName" name="tenantName" className="input" required placeholder="Örn: Demo Grup A.Ş." />
          </div>
          <div>
            <label className="label" htmlFor="companyName">İlk şirket adı</label>
            <input id="companyName" name="companyName" className="input" required placeholder="Örn: Anadolu Ticaret A.Ş." />
          </div>
          <div>
            <label className="label" htmlFor="email">E-posta</label>
            <input id="email" name="email" type="email" className="input" required autoComplete="email" />
          </div>
          <div>
            <label className="label" htmlFor="password">Şifre</label>
            <input id="password" name="password" type="password" className="input" required minLength={8} autoComplete="new-password" />
            <p className="mt-1 text-xs text-slate-400">En az 8 karakter.</p>
          </div>
          <SubmitButton className="w-full">Hesap oluştur</SubmitButton>
          <p className="text-center text-sm text-slate-500">
            Zaten hesabın var mı?{" "}
            <Link href="/login" className="font-medium text-brand-600 hover:underline">
              Giriş yap
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
