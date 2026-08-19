"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "muhasebe-sidebar-open";

type SidebarUi = {
  open: boolean;
  toggle: () => void;
  setOpen: (open: boolean) => void;
};

const SidebarUiContext = createContext<SidebarUi | null>(null);

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpenState] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "0") {
      setOpenState(false);
      return;
    }
    if (stored === "1") {
      setOpenState(true);
      return;
    }
    if (window.matchMedia("(max-width: 1023px)").matches) setOpenState(false);
  }, []);

  const setOpen = useCallback((next: boolean) => {
    setOpenState(next);
    localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  }, []);

  const toggle = useCallback(() => {
    setOpenState((current) => {
      const next = !current;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  return (
    <SidebarUiContext.Provider value={{ open, toggle, setOpen }}>
      <div className="flex min-h-screen">{children}</div>
    </SidebarUiContext.Provider>
  );
}

export function useSidebarUi() {
  const ctx = useContext(SidebarUiContext);
  if (!ctx) throw new Error("useSidebarUi requires AppShell");
  return ctx;
}

export function MenuToggleButton({ className }: { className?: string }) {
  const { open, toggle } = useSidebarUi();
  return (
    <button
      type="button"
      className={className ?? "btn-secondary !px-2.5 !py-1.5 print:hidden"}
      onClick={toggle}
      aria-expanded={open}
      aria-controls="app-sidebar"
      title={open ? "Menüyü gizle" : "Menüyü göster"}
    >
      {open ? (
        <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M4 6h16M4 12h10M4 18h16" />
          <path d="M19 9l-3 3 3 3" />
        </svg>
      ) : (
        <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      )}
      <span className="hidden text-sm sm:inline">{open ? "Menüyü gizle" : "Menüyü göster"}</span>
    </button>
  );
}
