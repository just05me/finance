import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { months } from "@/db/schema";
import { apiError, parseJson, requireApiUser } from "@/lib/http";
import { monthUpdateSchema } from "@/lib/schemas";

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
  const parsed = await parseJson(request, monthUpdateSchema);
  if (!parsed.ok) return parsed.response;
  await db
    .update(months)
    .set({
      ...(parsed.data.exchangeRate !== undefined
        ? { exchangeRate: parsed.data.exchangeRate }
        : {}),
    })
    .where(eq(months.id, id));
  const rows = await db.select().from(months).where(eq(months.id, id));
  return NextResponse.json({ month: rows[0] });
}
