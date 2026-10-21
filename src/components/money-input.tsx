"use client";

import { useEffect, useId, useRef, useState } from "react";
import clsx from "clsx";
import { formatMoneyInput, joinMoneyParts, splitMoneyParts, toMoneyCanonical } from "@/lib/money";

type MoneyInputProps = {
  name?: string;
  id?: string;
  label?: string;
  /** Kontrolsüz başlangıç (form default) — sayı veya "19350,50" / "19350.50" */
  defaultValue?: string | number;
  /** Kontrollü değer — canonical ("19350.50") veya görünen biçim */
  value?: string | number;
  onValueChange?: (canonical: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
};

/**
 * Tutar girişi: sol tarafta tam kısım, sabit virgül, sağda 2 haneli kuruş.
 * Ok tuşu / virgül / nokta ile kuruşa geçilir; dokunulmazsa ,00 kalır.
 */
export function MoneyInput({
  name,
  id,
  label,
  defaultValue,
  value,
  onValueChange,
  required,
  disabled,
  className,
  inputClassName,
  placeholder,
}: MoneyInputProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const intRef = useRef<HTMLInputElement>(null);
  const fracRef = useRef<HTMLInputElement>(null);
  const focusedRef = useRef(false);
  const controlled = value !== undefined;

  const initial = splitMoneyParts(controlled ? value : defaultValue);
  const emptyStart = !controlled && defaultValue == null;
  const [intPart, setIntPart] = useState(emptyStart ? "" : initial.intPart);
  const [fracPart, setFracPart] = useState(emptyStart ? "00" : initial.fracPart);
  const [negative, setNegative] = useState(initial.negative);

  useEffect(() => {
    if (!controlled || focusedRef.current) return;
    const parts = splitMoneyParts(value);
    setIntPart(parts.intPart);
    setFracPart(parts.fracPart);
    setNegative(parts.negative);
  }, [controlled, value]);

  const displayInt = intPart === "" ? "" : intPart;
  const canonical = joinMoneyParts(intPart || "0", fracPart || "00", negative);

  function sanitizeInt(raw: string): string {
    return raw.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  }

  function pushChange(nextInt: string, nextFrac: string, nextNeg = negative) {
    onValueChange?.(joinMoneyParts(nextInt || "0", (nextFrac + "00").slice(0, 2), nextNeg));
  }

  function onIntChange(raw: string) {
    const next = sanitizeInt(raw);
    setIntPart(next);
    pushChange(next, fracPart);
  }

  function onFracChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 2);
    setFracPart(digits);
    pushChange(intPart, digits);
  }

  function focusFrac(select = true) {
    const el = fracRef.current;
    if (!el) return;
    el.focus();
    if (select) el.select();
  }

  function focusInt(atEnd = true) {
    const el = intRef.current;
    if (!el) return;
    el.focus();
    if (atEnd) {
      const len = el.value.length;
      el.setSelectionRange(len, len);
    }
  }

  function onIntKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "," || e.key === "." || e.key === "Decimal") {
      e.preventDefault();
      if (fracPart === "") setFracPart("00");
      focusFrac();
      return;
    }
    if (e.key === "ArrowRight") {
      const el = e.currentTarget;
      const pos = el.selectionStart ?? 0;
      if (pos >= el.value.length) {
        e.preventDefault();
        focusFrac();
      }
    }
    if (e.key === "-" && intPart === "" && !negative) {
      e.preventDefault();
      setNegative(true);
      pushChange(intPart, fracPart, true);
    }
  }

  function onFracKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowLeft") {
      const pos = e.currentTarget.selectionStart ?? 0;
      if (pos <= 0) {
        e.preventDefault();
        focusInt(true);
      }
    }
    if (e.key === "Backspace") {
      const el = e.currentTarget;
      const pos = el.selectionStart ?? 0;
      const end = el.selectionEnd ?? 0;
      if (pos === 0 && end === 0 && !el.value) {
        e.preventDefault();
        focusInt(true);
      }
    }
  }

  function markFocused() {
    focusedRef.current = true;
  }

  function onIntBlur() {
    focusedRef.current = false;
    const nextInt = intPart === "" ? "0" : intPart;
    const c = joinMoneyParts(nextInt, (fracPart + "00").slice(0, 2), negative);
    const parts = splitMoneyParts(c);
    setIntPart(parts.intPart);
    setFracPart(parts.fracPart);
    onValueChange?.(c);
  }

  function onFracBlur() {
    focusedRef.current = false;
    const padded = (fracPart + "00").slice(0, 2);
    setFracPart(padded);
    const c = joinMoneyParts(intPart || "0", padded, negative);
    onValueChange?.(c);
  }

  return (
    <div className={clsx("min-w-0", className)}>
      {label ? (
        <label className="label" htmlFor={fieldId}>
          {label}
        </label>
      ) : null}
      {name ? <input type="hidden" name={name} value={canonical} required={required} /> : null}
      <div
        className={clsx(
          "input flex items-center gap-0.5 !py-0 tabular-nums",
          disabled && "opacity-55",
          inputClassName,
        )}
      >
        {negative ? <span className="text-ink-500">−</span> : null}
        <input
          ref={intRef}
          id={fieldId}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          disabled={disabled}
          aria-label={label ? `${label} (tam kısım)` : "Tutar tam kısım"}
          className="min-w-0 flex-1 border-0 bg-transparent py-2.5 text-right outline-none focus:ring-0"
          value={displayInt}
          placeholder={placeholder ?? "0"}
          onChange={(e) => onIntChange(e.target.value)}
          onKeyDown={onIntKeyDown}
          onBlur={onIntBlur}
          onFocus={(e) => {
            markFocused();
            e.currentTarget.select();
          }}
        />
        <span className="select-none px-0.5 font-semibold text-ink-400" aria-hidden>
          ,
        </span>
        <input
          ref={fracRef}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          disabled={disabled}
          maxLength={2}
          aria-label={label ? `${label} (kuruş)` : "Tutar kuruş"}
          className="w-9 shrink-0 border-0 bg-transparent py-2.5 text-left outline-none focus:ring-0"
          value={fracPart}
          placeholder="00"
          onChange={(e) => onFracChange(e.target.value)}
          onKeyDown={onFracKeyDown}
          onBlur={onFracBlur}
          onFocus={(e) => {
            markFocused();
            e.currentTarget.select();
          }}
        />
        <span className="shrink-0 pl-1 text-xs font-medium text-ink-400">₺</span>
      </div>
    </div>
  );
}

/** Kontrollü listeler için: değeri MoneyInput’a uygun canonical string’e çevir. */
export function moneyValue(raw: string | number | null | undefined): string {
  return toMoneyCanonical(raw) ?? "0.00";
}

export function moneyDisplay(raw: string | number | null | undefined): string {
  return formatMoneyInput(raw);
}
