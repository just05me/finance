import * as React from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "default" | "primary" | "success" | "warning" | "destructive";
  className?: string;
  onClick?: () => void;
  href?: string;
}

const toneToText: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "text-foreground",
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
};

const toneToRing: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "",
  primary: "ring-1 ring-inset ring-primary/20",
  success: "ring-1 ring-inset ring-success/20",
  warning: "ring-1 ring-inset ring-warning/25",
  destructive: "ring-1 ring-inset ring-destructive/30",
};

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
  className,
}: StatCardProps): React.ReactElement {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/70 bg-card p-4 shadow-soft",
        toneToRing[tone],
        className,
      )}
    >
      <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "mt-1.5 text-[26px] font-semibold tracking-[-0.02em] num-tabular",
          toneToText[tone],
        )}
      >
        {value}
      </div>
      {hint ? (
        <div className="mt-1 text-[12px] text-muted-foreground">{hint}</div>
      ) : null}
    </div>
  );
}
