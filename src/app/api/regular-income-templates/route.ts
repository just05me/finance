import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { regularIncomeTemplates } from "@/db/schema";
import { parseJson, requireApiUser } from "@/lib/http";
import { regularIncomeTemplateCreateSchema } from "@/lib/schemas";

export async function POST(request: Request): Promise<NextResponse> {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const parsed = await parseJson(request, regularIncomeTemplateCreateSchema);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;
  const inserted = await db
    .insert(regularIncomeTemplates)
    .values({
      incomeCategoryId: data.incomeCategoryId,
      description: data.description ?? "",
      amountUsd: data.amountUsd ?? 0,
      amountUzs: data.amountUzs ?? 0,
      owner: data.owner,
      dayOfMonth: data.dayOfMonth ?? null,
      active: data.active ?? true,
      sortOrder: data.sortOrder ?? 0,
    })
    .returning();
  return NextResponse.json({ template: inserted[0] });
}
