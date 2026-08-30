"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Segmented } from "@/components/ui/segmented";
import type { OwnerView } from "@/lib/owner-view";

const options: { value: OwnerView; label: string }[] = [
  { value: "all", label: "Все" },
  { value: "me", label: "Мои" },
  { value: "partner", label: "Партнёра" },
];

interface OwnerFilterProps {
  className?: string;
}

export function OwnerFilter({
  className,
}: OwnerFilterProps): React.ReactElement {
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get("view");
  const value: OwnerView =
    raw === "me" || raw === "partner" ? raw : "all";

  function set(next: OwnerView): void {
    const url = new URL(window.location.href);
    if (next === "all") url.searchParams.delete("view");
    else url.searchParams.set("view", next);
    router.replace(`${url.pathname}${url.search}`);
  }

  return (
    <Segmented
      size="sm"
      value={value}
      onChange={set}
      options={options}
      ariaLabel="Фильтр по владельцу"
      className={className}
    />
  );
}

