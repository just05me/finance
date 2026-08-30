import { NextResponse } from "next/server";
import { ZodError, type ZodSchema } from "zod";
import { readSessionFromCookies, type SessionPayload } from "./session";

export async function requireApiUser(): Promise<
  { ok: true; session: SessionPayload } | { ok: false; response: NextResponse }
> {
  const session = await readSessionFromCookies();
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Не авторизован" }, { status: 401 }),
    };
  }
  return { ok: true, session };
}

export async function parseJson<T>(
  request: Request,
  schema: ZodSchema<T>,
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Некорректный JSON" }, { status: 400 }),
    };
  }
  try {
    const data = schema.parse(body);
    return { ok: true, data };
  } catch (err) {
    if (err instanceof ZodError) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Ошибка валидации", details: err.flatten() },
          { status: 400 },
        ),
      };
    }
    throw err;
  }
}

export function apiError(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
