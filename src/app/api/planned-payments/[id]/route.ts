import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { plannedPayments } from "@/db/schema";
import { apiError, parseJson, requireApiUser } from "@/lib/http";
import { plannedPaymentUpdateSchema } from "@/lib/schemas";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(
  request: Request,
  { params }: Params,
): Promise<NextResponse> {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isFinite(id)) return apiError("Некорректный id");
  const parsed = await parseJson(request, plannedPaymentUpdateSchema);
  if (!parsed.ok) return parsed.response;
  const patch = parsed.data;
  await db
    .update(plannedPayments)
    .set({
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.currency !== undefined ? { currency: patch.currency } : {}),
      ...(patch.planAmount !== undefined
        ? { planAmount: patch.planAmount }
        : {}),
      ...(patch.factAmount !== undefined
        ? { factAmount: patch.factAmount }
        : {}),
      ...(patch.paid !== undefined ? { paid: patch.paid } : {}),
      ...(patch.owner !== undefined ? { owner: patch.owner } : {}),
      ...(patch.dueDay !== undefined ? { dueDay: patch.dueDay } : {}),
      ...(patch.note !== undefined ? { note: patch.note } : {}),
      ...(patch.sortOrder !== undefined
        ? { sortOrder: patch.sortOrder }
        : {}),
    })
    .where(eq(plannedPayments.id, id));
  const rows = await db
    .select()
    .from(plannedPayments)
    .where(eq(plannedPayments.id, id));
  return NextResponse.json({ plannedPayment: rows[0] });
}

export async function DELETE(
  _request: Request,
  { params }: Params,
): Promise<NextResponse> {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isFinite(id)) return apiError("Некорректный id");
  await db.delete(plannedPayments).where(eq(plannedPayments.id, id));
  return NextResponse.json({ ok: true });
}
