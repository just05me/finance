import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { regularIncomeTemplates } from "@/db/schema";
import { apiError, parseJson, requireApiUser } from "@/lib/http";
import { regularIncomeTemplateUpdateSchema } from "@/lib/schemas";

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
  const parsed = await parseJson(request, regularIncomeTemplateUpdateSchema);
  if (!parsed.ok) return parsed.response;
  const patch = parsed.data;
  await db
    .update(regularIncomeTemplates)
    .set({
      ...(patch.incomeCategoryId !== undefined
        ? { incomeCategoryId: patch.incomeCategoryId }
        : {}),
      ...(patch.description !== undefined
        ? { description: patch.description }
        : {}),
      ...(patch.amountUsd !== undefined ? { amountUsd: patch.amountUsd } : {}),
      ...(patch.amountUzs !== undefined ? { amountUzs: patch.amountUzs } : {}),
      ...(patch.owner !== undefined ? { owner: patch.owner } : {}),
      ...(patch.dayOfMonth !== undefined
        ? { dayOfMonth: patch.dayOfMonth }
        : {}),
      ...(patch.active !== undefined ? { active: patch.active } : {}),
      ...(patch.sortOrder !== undefined
        ? { sortOrder: patch.sortOrder }
        : {}),
    })
    .where(eq(regularIncomeTemplates.id, id));
  const rows = await db
    .select()
    .from(regularIncomeTemplates)
    .where(eq(regularIncomeTemplates.id, id));
  return NextResponse.json({ template: rows[0] });
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
  await db
    .delete(regularIncomeTemplates)
    .where(eq(regularIncomeTemplates.id, id));
  return NextResponse.json({ ok: true });
}
