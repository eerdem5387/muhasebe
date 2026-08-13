import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Muhasebe SaaS - Ön Muhasebe, T-Cetveli & CRM",
  description:
    "Çok kiracılı (multi-tenant), çok şirketli çift taraflı kayıt (double-entry) ön muhasebe ve CRM platformu.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
