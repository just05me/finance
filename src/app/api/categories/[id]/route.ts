import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { categories, dailyExpenses } from "@/db/schema";
import { apiError, parseJson, requireApiUser } from "@/lib/http";
import { categoryUpdateSchema } from "@/lib/schemas";

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
  const parsed = await parseJson(request, categoryUpdateSchema);
  if (!parsed.ok) return parsed.response;
  const patch = parsed.data;
  await db
    .update(categories)
    .set({
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.icon !== undefined ? { icon: patch.icon } : {}),
      ...(patch.sortOrder !== undefined
        ? { sortOrder: patch.sortOrder }
        : {}),
      ...(patch.archived !== undefined ? { archived: patch.archived } : {}),
    })
    .where(eq(categories.id, id));
  const rows = await db.select().from(categories).where(eq(categories.id, id));
  return NextResponse.json({ category: rows[0] });
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
  const used = await db
    .select({ id: dailyExpenses.id })
    .from(dailyExpenses)
    .where(eq(dailyExpenses.categoryId, id))
    .limit(1);
  if (used[0]) {
    return apiError(
      "Категория используется в расходах — заархивируйте вместо удаления",
      400,
    );
  }
  await db.delete(categories).where(eq(categories.id, id));
  return NextResponse.json({ ok: true });
}
