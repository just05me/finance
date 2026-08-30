import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { incomes } from "@/db/schema";
import { apiError, parseJson, requireApiUser } from "@/lib/http";
import { incomeUpdateSchema } from "@/lib/schemas";

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
  if (!Number.isFinite(id)) return apiError("Некорректный id", 400);
  const parsed = await parseJson(request, incomeUpdateSchema);
  if (!parsed.ok) return parsed.response;
  const patch = parsed.data;
  await db
    .update(incomes)
    .set({
      ...(patch.date !== undefined ? { date: patch.date } : {}),
      ...(patch.incomeCategoryId !== undefined
        ? { incomeCategoryId: patch.incomeCategoryId }
        : {}),
      ...(patch.description !== undefined
        ? { description: patch.description }
        : {}),
      ...(patch.amountUsd !== undefined ? { amountUsd: patch.amountUsd } : {}),
      ...(patch.amountUzs !== undefined ? { amountUzs: patch.amountUzs } : {}),
      ...(patch.owner !== undefined ? { owner: patch.owner } : {}),
      ...(patch.note !== undefined ? { note: patch.note } : {}),
    })
    .where(eq(incomes.id, id));
  const rows = await db.select().from(incomes).where(eq(incomes.id, id));
  return NextResponse.json({ income: rows[0] });
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
  await db.delete(incomes).where(eq(incomes.id, id));
  return NextResponse.json({ ok: true });
}
