import { NextResponse } from "next/server";
import { parseJson, requireApiUser } from "@/lib/http";
import { userPreferencesUpdateSchema } from "@/lib/schemas";
import { updateUserPreferences } from "@/db/queries";

export async function PATCH(request: Request): Promise<NextResponse> {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const parsed = await parseJson(request, userPreferencesUpdateSchema);
  if (!parsed.ok) return parsed.response;
  const prefs = await updateUserPreferences(auth.session.userId, {
    ...(parsed.data.themeMode !== undefined
      ? { themeMode: parsed.data.themeMode }
      : {}),
    ...(parsed.data.defaultCurrency !== undefined
      ? { defaultCurrency: parsed.data.defaultCurrency }
      : {}),
  });
  return NextResponse.json({ preferences: prefs });
}
