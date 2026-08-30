import { NextResponse } from "next/server";
import { parseJson, requireApiUser } from "@/lib/http";
import { monthCreateSchema } from "@/lib/schemas";
import { ensureMonth } from "@/lib/month-service";

export async function POST(request: Request): Promise<NextResponse> {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const parsed = await parseJson(request, monthCreateSchema);
  if (!parsed.ok) return parsed.response;
  const month = await ensureMonth(parsed.data.year, parsed.data.month, {
    clonePlansFromPrevious: true,
    cloneRegularIncomes: true,
    planGoalContributions: true,
    fallbackUserId: auth.session.userId,
  });
  return NextResponse.json({ month });
}
