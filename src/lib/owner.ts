import type { Owner } from "@/db/schema";

export function ownerFromUserName(name: string): Owner {
  const trimmed = name.trim();
  if (trimmed === "Ризо" || trimmed === "Алина") return trimmed;
  return "Семейное";
}
