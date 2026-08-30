import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { savingsGoals } from "@/db/schema";
import { apiError, parseJson, requireApiUser } from "@/lib/http";
import { goalUpdateSchema } from "@/lib/schemas";

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
  const parsed = await parseJson(request, goalUpdateSchema);
  if (!parsed.ok) return parsed.response;
  const patch = parsed.data;
  const closingNow =
    patch.status === "Завершена" ? { closedAt: new Date() } : {};
  const reopeningNow =
    patch.status && patch.status !== "Завершена" ? { closedAt: null } : {};
  await db
    .update(savingsGoals)
    .set({
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.currency !== undefined ? { currency: patch.currency } : {}),
      ...(patch.targetAmount !== undefined
        ? { targetAmount: patch.targetAmount }
        : {}),
      ...(patch.monthlyContribution !== undefined
        ? { monthlyContribution: patch.monthlyContribution }
        : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.sortOrder !== undefined
        ? { sortOrder: patch.sortOrder }
        : {}),
      ...closingNow,
      ...reopeningNow,
    })
    .where(eq(savingsGoals.id, id));
  const rows = await db
    .select()
    .from(savingsGoals)
    .where(eq(savingsGoals.id, id));
  return NextResponse.json({ goal: rows[0] });
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
  await db.delete(savingsGoals).where(eq(savingsGoals.id, id));
  return NextResponse.json({ ok: true });
}
