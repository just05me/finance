import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { incomes } from "@/db/schema";
import { apiError, parseJson, requireApiUser } from "@/lib/http";
import { incomeCreateSchema } from "@/lib/schemas";
import { resolveMonthForDate } from "@/lib/month-service";

export async function POST(request: Request): Promise<NextResponse> {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const parsed = await parseJson(request, incomeCreateSchema);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;
  const amountUsd = data.amountUsd ?? 0;
  const amountUzs = data.amountUzs ?? 0;
  if (amountUsd <= 0 && amountUzs <= 0) {
    return apiError("Сумма должна быть больше нуля", 400);
  }
  const month = data.monthId
    ? { id: data.monthId }
    : await resolveMonthForDate(data.date, auth.session.userId);
  const inserted = await db
    .insert(incomes)
    .values({
      monthId: month.id,
      date: data.date,
      incomeCategoryId: data.incomeCategoryId,
      description: data.description ?? "",
      amountUsd,
      amountUzs,
      owner: data.owner,
      note: data.note ?? null,
      createdByUserId: auth.session.userId,
    })
    .returning();
  return NextResponse.json({ income: inserted[0] });
}
