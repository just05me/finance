import { redirect } from "next/navigation";
import { readSessionFromCookies, type SessionPayload } from "./session";

export async function requireUser(): Promise<SessionPayload> {
  const session = await readSessionFromCookies();
  if (!session) {
    redirect("/login");
  }
  return session;
}
