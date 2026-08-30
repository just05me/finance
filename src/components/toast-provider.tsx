"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";

type ToastKind = "info" | "success" | "warning" | "error";

interface ToastAction {
  label: string;
  onAction: () => void;
}

interface Toast {
  id: string;
  message: string;
  kind: ToastKind;
  action?: ToastAction;
  duration: number;
}

interface ToastContextValue {
  show: (
    message: string,
    opts?: {
      kind?: ToastKind;
      duration?: number;
      action?: ToastAction;
    },
  ) => string;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `t-${idCounter}`;
}

export function ToastProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const timers = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const show = React.useCallback<ToastContextValue["show"]>(
    (message, opts) => {
      const id = nextId();
      const toast: Toast = {
        id,
        message,
        kind: opts?.kind ?? "info",
        action: opts?.action,
        duration: opts?.duration ?? 4200,
      };
      setToasts((prev) => [...prev, toast]);
      const timer = setTimeout(() => dismiss(id), toast.duration);
      timers.current.set(id, timer);
      return id;
    },
    [dismiss],
  );

  React.useEffect(() => {
    const t = timers.current;
    return () => {
      for (const timer of t.values()) clearTimeout(timer);
      t.clear();
    };
  }, []);

  const value = React.useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex flex-col items-center gap-2 px-3 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] sm:pb-4"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{
                type: "spring",
                stiffness: 320,
                damping: 26,
                mass: 0.6,
              }}
              className={cn(
                "material pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border px-4 py-3 shadow-elevated",
                t.kind === "success" && "text-success",
                t.kind === "warning" && "text-warning",
                t.kind === "error" && "text-destructive",
              )}
            >
              <div className="min-w-0 flex-1 truncate text-[15px] font-medium text-foreground">
                {t.message}
              </div>
              {t.action ? (
                <button
                  type="button"
                  onClick={() => {
                    t.action?.onAction();
                    dismiss(t.id);
                  }}
                  className="rounded-full px-3 py-1 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
                >
                  {t.action.label}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Скрыть"
                className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-accent"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
