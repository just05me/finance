import { NextResponse } from "next/server";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/db/client";
import { dailyExpenses } from "@/db/schema";
import { apiError, parseJson, requireApiUser } from "@/lib/http";
import { dailyExpenseUpdateSchema } from "@/lib/schemas";

interface Params {
  params: Promise<{ id: string }>;
}

async function ensureVisible(
  id: number,
  userId: number,
): Promise<boolean> {
  const rows = await db
    .select()
    .from(dailyExpenses)
    .where(eq(dailyExpenses.id, id));
  const row = rows[0];
  if (!row) return false;
  if (!row.isPrivate) return true;
  return row.createdByUserId === userId;
}

export async function PATCH(
  request: Request,
  { params }: Params,
): Promise<NextResponse> {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isFinite(id)) return apiError("Некорректный id", 400);
  if (!(await ensureVisible(id, auth.session.userId)))
    return apiError("Не найдено", 404);
  const parsed = await parseJson(request, dailyExpenseUpdateSchema);
  if (!parsed.ok) return parsed.response;
  const patch = parsed.data;
  await db
    .update(dailyExpenses)
    .set({
      ...(patch.date !== undefined ? { date: patch.date } : {}),
      ...(patch.categoryId !== undefined
        ? { categoryId: patch.categoryId }
        : {}),
      ...(patch.description !== undefined
        ? { description: patch.description }
        : {}),
      ...(patch.amountUsd !== undefined ? { amountUsd: patch.amountUsd } : {}),
      ...(patch.amountUzs !== undefined ? { amountUzs: patch.amountUzs } : {}),
      ...(patch.owner !== undefined ? { owner: patch.owner } : {}),
      ...(patch.note !== undefined ? { note: patch.note } : {}),
      ...(patch.isPrivate !== undefined
        ? { isPrivate: patch.isPrivate }
        : {}),
    })
    .where(eq(dailyExpenses.id, id));
  const rows = await db
    .select()
    .from(dailyExpenses)
    .where(eq(dailyExpenses.id, id));
  return NextResponse.json({ dailyExpense: rows[0] });
}

export async function DELETE(
  _request: Request,
  { params }: Params,
): Promise<NextResponse> {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isFinite(id)) return apiError("Некорректный id", 400);
  if (!(await ensureVisible(id, auth.session.userId)))
    return apiError("Не найдено", 404);
  await db.delete(dailyExpenses).where(eq(dailyExpenses.id, id));
  return NextResponse.json({ ok: true });
}
