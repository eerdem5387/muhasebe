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

  const maxW = size === "lg" ? "max-w-xl" : "max-w-lg";

  return (
    <>
      <button type="button" className={buttonClassName} onClick={() => setOpen(true)}>
        {buttonLabel}
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-x-hidden overflow-y-auto p-3 sm:p-4 sm:items-center">
          <button
            type="button"
            aria-label="Kapat"
            className="absolute inset-0 bg-ink-950/45 backdrop-blur-[2px]"
            onClick={close}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={`relative z-10 my-2 flex w-full min-w-0 max-h-[min(92vh,56rem)] flex-col overflow-hidden rounded-2xl border border-ink-200/80 bg-white shadow-lift ${maxW}`}
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-ink-100 px-4 py-3.5 sm:px-5">
              <h2 id={titleId} className="min-w-0 text-lg font-semibold tracking-tight text-ink-950">
                {title}
              </h2>
              <button
                type="button"
                onClick={close}
                className="shrink-0 rounded-xl px-2.5 py-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
                aria-label="Kapat"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
              <ModalCloseContext.Provider value={close}>{children}</ModalCloseContext.Provider>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
