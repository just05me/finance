import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  tone?: "primary" | "success" | "warning" | "destructive";
  height?: "sm" | "md" | "lg";
}

const toneToClass: Record<NonNullable<ProgressProps["tone"]>, string> = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
};

const heightToClass: Record<NonNullable<ProgressProps["height"]>, string> = {
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-3",
};

export function Progress({
  value,
  tone = "primary",
  height = "md",
  className,
  ...props
}: ProgressProps): React.ReactElement {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-full bg-muted",
        heightToClass[height],
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
          toneToClass[tone],
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
