import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { plannedPayments } from "@/db/schema";
import { apiError, parseJson, requireApiUser } from "@/lib/http";
import { plannedPaymentCreateSchema } from "@/lib/schemas";

export async function POST(request: Request): Promise<NextResponse> {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const parsed = await parseJson(request, plannedPaymentCreateSchema);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;
  if (data.planAmount < 0) return apiError("План не может быть отрицательным");
  const inserted = await db
    .insert(plannedPayments)
    .values({
      monthId: data.monthId,
      title: data.title,
      currency: data.currency,
      planAmount: data.planAmount,
      factAmount: data.factAmount ?? null,
      paid: data.paid ?? false,
      owner: data.owner,
      dueDay: data.dueDay ?? null,
      note: data.note ?? null,
      sortOrder: data.sortOrder ?? 0,
    })
    .returning();
  return NextResponse.json({ plannedPayment: inserted[0] });
}
