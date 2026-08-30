"use client";

import * as React from "react";
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  variant?: "modal" | "sheet";
}

const springFast = {
  type: "spring" as const,
  stiffness: 380,
  damping: 34,
  mass: 0.7,
};

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  variant = "modal",
}: DialogProps): React.ReactElement {
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", handler);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onOpenChange]);

  const isSheet = variant === "sheet";

  const onDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ): void => {
    if (!isSheet) return;
    if (info.velocity.y > 500 || info.offset.y > 140) {
      onOpenChange(false);
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <div
          className="fixed inset-0 z-[70] flex touch-none items-end justify-center sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 bg-black/45 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            drag={isSheet ? "y" : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={onDragEnd}
            initial={
              isSheet
                ? { y: "100%" }
                : { opacity: 0, scale: 0.94, y: 12 }
            }
            animate={
              isSheet
                ? { y: 0 }
                : { opacity: 1, scale: 1, y: 0 }
            }
            exit={
              isSheet
                ? { y: "100%", transition: { ...springFast, damping: 30 } }
                : {
                    opacity: 0,
                    scale: 0.96,
                    y: 8,
                    transition: { duration: 0.15, ease: [0.55, 0, 1, 0.45] },
                  }
            }
            transition={springFast}
            className={cn(
              "material relative z-10 w-full border shadow-elevated",
              isSheet
                ? "max-h-[92vh] rounded-t-3xl pb-[calc(env(safe-area-inset-bottom)+1rem)]"
                : "max-w-lg rounded-3xl",
              className,
            )}
            style={{
              transformOrigin: isSheet ? "bottom center" : "center",
            }}
          >
            {isSheet ? (
              <div className="flex justify-center pt-2.5">
                <div className="h-1.5 w-10 rounded-full bg-muted-foreground/25" />
              </div>
            ) : null}
            <div className={cn("px-5 pt-4", isSheet ? "pb-2" : "pb-2 pt-6")}>
              {title ? (
                <h2 className="text-[17px] font-semibold tracking-tight">
                  {title}
                </h2>
              ) : null}
              {description ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  {description}
                </p>
              ) : null}
            </div>
            <div
              className={cn(
                "overflow-y-auto overscroll-contain px-5",
                isSheet ? "max-h-[calc(92vh-3rem)] pb-4" : "pb-6",
              )}
            >
              {children}
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
