import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { incomeCategories } from "@/db/schema";
import { parseJson, requireApiUser } from "@/lib/http";
import { categoryCreateSchema } from "@/lib/schemas";

export async function POST(request: Request): Promise<NextResponse> {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const parsed = await parseJson(request, categoryCreateSchema);
  if (!parsed.ok) return parsed.response;
  const inserted = await db
    .insert(incomeCategories)
    .values({
      name: parsed.data.name,
      icon: parsed.data.icon ?? null,
      sortOrder: parsed.data.sortOrder ?? 999,
    })
    .returning();
  return NextResponse.json({ incomeCategory: inserted[0] });
}
