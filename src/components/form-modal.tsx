"use client";

import { createContext, useContext, useEffect, useId, useState } from "react";

const ModalCloseContext = createContext<(() => void) | null>(null);

export function useModalClose() {
  return useContext(ModalCloseContext);
}

/** Button that opens a centered modal. Close via X, Escape, backdrop, or useModalClose(). */
export function FormModal({
  buttonLabel,
  title,
  children,
  buttonClassName = "btn-primary",
  size = "md",
}: {
  buttonLabel: string;
  title: string;
  children: React.ReactNode;
  buttonClassName?: string;
  size?: "md" | "lg";
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button type="button" className={buttonClassName} onClick={() => setOpen(true)}>
        {buttonLabel}
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
          <button
            type="button"
            aria-label="Kapat"
            className="absolute inset-0 bg-slate-900/40"
            onClick={close}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={`relative z-10 my-4 w-full rounded-xl border border-slate-200 bg-white p-5 shadow-xl ${
              size === "lg" ? "max-w-2xl" : "max-w-lg"
            }`}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 id={titleId} className="text-lg font-semibold text-slate-900">{title}</h2>
              <button
                type="button"
                onClick={close}
                className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Kapat"
              >
                ✕
              </button>
            </div>
            <ModalCloseContext.Provider value={close}>{children}</ModalCloseContext.Provider>
          </div>
        </div>
      ) : null}
    </>
  );
}
