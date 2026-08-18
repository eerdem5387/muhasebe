import type { PaymentProgress } from "@prisma/client";

export function inferPaymentProgress(fee: number, collected: number): PaymentProgress {
  if (collected <= 0.009) return "NOT_STARTED";
  if (collected + 0.009 >= fee && fee > 0) return "COMPLETED";
  return "IN_PROGRESS";
}

export function resolvePaymentProgress(input: {
  fee: number;
  collected: number;
  stored: PaymentProgress;
  manual: boolean;
}): PaymentProgress {
  if (input.manual) return input.stored;
  return inferPaymentProgress(input.fee, input.collected);
}
