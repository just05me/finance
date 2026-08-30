import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getOrCreateCurrentMonth } from "@/lib/month-service";

export const dynamic = "force-dynamic";

export default async function MonthsIndexPage(): Promise<never> {
  const session = await requireUser();
  const month = await getOrCreateCurrentMonth(session.userId);
  redirect(`/months/${month.year}/${String(month.month).padStart(2, "0")}`);
}
