export const ECOM_CHANNELS = ["ECOM_ZIRAAT", "ECOM_ZIRAAT_2X", "ECOM_OTHER_BANKS"] as const;
export type EcomChannel = (typeof ECOM_CHANNELS)[number];

export function isEcommerceEligibleCategory(name: string): boolean {
  const n = name.toLocaleLowerCase("tr-TR").normalize("NFC");
  return n.includes("kitap") || n.includes("araç servis") || n.includes("arac servis");
}

export function isEcomChannel(channel: string): channel is EcomChannel {
  return (ECOM_CHANNELS as readonly string[]).includes(channel);
}

/** E-ticaret kanalı seçildiğinde uygulanan bloke / taksit kuralları. */
export function resolveEcomPlanRules(channel: EcomChannel): {
  installmentCount: number;
  blockDays: number;
  bankName: string | null;
} {
  if (channel === "ECOM_ZIRAAT") {
    return { installmentCount: 1, blockDays: 28, bankName: "Ziraat Bankası (E-Ticaret)" };
  }
  if (channel === "ECOM_ZIRAAT_2X") {
    return { installmentCount: 2, blockDays: 28, bankName: "Ziraat Bankası (E-Ticaret 2 Taksit)" };
  }
  return { installmentCount: 1, blockDays: 39, bankName: "Diğer bankalar (E-Ticaret)" };
}
