/** Base class for expected, user-facing application errors. */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string = "APP_ERROR",
    public readonly status: number = 400,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Oturum açmanız gerekiyor.") {
    super(message, "UNAUTHORIZED", 401);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Bu işlem için yetkiniz yok.") {
    super(message, "FORBIDDEN", 403);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Kayıt bulunamadı.") {
    super(message, "NOT_FOUND", 404);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends AppError {
  constructor(message = "Geçersiz veri.") {
    super(message, "VALIDATION", 422);
    this.name = "ValidationError";
  }
}

/** Raised when a ledger entry's debit and credit totals do not balance. */
export class UnbalancedLedgerError extends AppError {
  constructor(debit: string, credit: string) {
    super(
      `Yevmiye fişi dengesiz: Borç (${debit}) ile Alacak (${credit}) eşit değil. İşlem geri alındı.`,
      "UNBALANCED_LEDGER",
      422,
    );
    this.name = "UnbalancedLedgerError";
  }
}

export function toErrorMessage(err: unknown): string {
  if (err instanceof AppError) return err.message;
  if (err instanceof Error) {
    if (err.message.includes("Environment variable not found: DATABASE_URL")) {
      return "Veritabanı bağlantısı yok. Vercel → Storage'dan Postgres ekleyin veya Environment Variables'a DATABASE_URL yazın.";
    }
    return err.message;
  }
  return "Beklenmeyen bir hata oluştu.";
}
