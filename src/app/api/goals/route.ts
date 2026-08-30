import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { savingsGoals } from "@/db/schema";
import { parseJson, requireApiUser } from "@/lib/http";
import { goalCreateSchema } from "@/lib/schemas";

export async function POST(request: Request): Promise<NextResponse> {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const parsed = await parseJson(request, goalCreateSchema);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;
  const inserted = await db
    .insert(savingsGoals)
    .values({
      title: data.title,
      currency: data.currency,
      targetAmount: data.targetAmount,
      monthlyContribution: data.monthlyContribution ?? 0,
      status: data.status ?? "Активна",
      sortOrder: data.sortOrder ?? 0,
      createdByUserId: auth.session.userId,
    })
    .returning();
  return NextResponse.json({ goal: inserted[0] });
}
