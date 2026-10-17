import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

export type ToastTone = "neutral" | "success" | "warning";

export type Toast = {
  id: string;
  message: string;
  tone: ToastTone;
  /** Optional one-line clarification, e.g. "Nothing was sent to a real person." */
  detail?: string;
};

type ToastValue = {
  toasts: Toast[];
  showToast: (message: string, options?: { tone?: ToastTone; detail?: string }) => void;
  dismissToast: (id: string) => void;
};

const ToastContext = createContext<ToastValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback<ToastValue["showToast"]>(
    (message, options) => {
      counter.current += 1;
      const id = `toast-${counter.current}`;
      const toast: Toast = {
        id,
        message,
        tone: options?.tone ?? "neutral",
        detail: options?.detail,
      };
      setToasts((current) => [...current.slice(-2), toast]);
      window.setTimeout(() => {
        setToasts((current) => current.filter((entry) => entry.id !== id));
      }, 4200);
    },
    [],
  );

  const value = useMemo(() => ({ toasts, showToast, dismissToast }), [toasts, showToast, dismissToast]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast(): ToastValue {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast must be used inside ToastProvider");
  return value;
}
