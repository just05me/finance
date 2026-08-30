import { NextResponse } from "next/server";
import { rawSql } from "@/db/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  try {
    const rows = await rawSql`SELECT 1 as ok`;
    const dbOk = rows[0]?.ok === 1;
    return NextResponse.json(
      {
        status: dbOk ? "ok" : "degraded",
        db: dbOk ? "ok" : "error",
        uptimeSec: Math.round(process.uptime()),
      },
      { status: dbOk ? 200 : 503 },
    );
  } catch (err) {
    return NextResponse.json(
      {
        status: "error",
        db: "error",
        error: err instanceof Error ? err.message : "Unknown",
      },
      { status: 503 },
    );
  }
}
