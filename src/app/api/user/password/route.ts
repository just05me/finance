import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { apiError, parseJson, requireApiUser } from "@/lib/http";
import { passwordChangeSchema } from "@/lib/schemas";

export async function POST(request: Request): Promise<NextResponse> {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const parsed = await parseJson(request, passwordChangeSchema);
  if (!parsed.ok) return parsed.response;
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.id, auth.session.userId));
  const user = rows[0];
  if (!user) return apiError("Пользователь не найден", 404);
  const ok = await bcrypt.compare(parsed.data.oldPassword, user.passwordHash);
  if (!ok) return apiError("Неверный текущий пароль", 400);
  const hash = await bcrypt.hash(parsed.data.newPassword, 10);
  await db
    .update(users)
    .set({ passwordHash: hash })
    .where(eq(users.id, user.id));
  return NextResponse.json({ ok: true });
}
