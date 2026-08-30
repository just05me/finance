import { NextResponse } from "next/server";
import { parseJson, requireApiUser } from "@/lib/http";
import { settingsUpdateSchema } from "@/lib/schemas";
import { upsertSettings } from "@/db/queries";

export async function PATCH(request: Request): Promise<NextResponse> {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const parsed = await parseJson(request, settingsUpdateSchema);
  if (!parsed.ok) return parsed.response;
  const settings = await upsertSettings({
    defaultRate: parsed.data.defaultRate,
  });
  return NextResponse.json({ settings });
}
