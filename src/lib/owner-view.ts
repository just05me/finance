export type OwnerView = "all" | "me" | "partner";

export function resolveOwnerView(
  raw: string | null | undefined,
): OwnerView {
  if (raw === "me" || raw === "partner") return raw;
  return "all";
}
