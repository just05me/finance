import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { goalContributions, savingsGoals } from "@/db/schema";
import { apiError, parseJson, requireApiUser } from "@/lib/http";
import { contributionUpsertSchema } from "@/lib/schemas";
import { sumGoalTotal } from "@/db/queries";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: Request,
  { params }: Params,
): Promise<NextResponse> {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { id: rawId } = await params;
  const goalId = Number(rawId);
  if (!Number.isFinite(goalId)) return apiError("Некорректный id");
  const parsed = await parseJson(request, contributionUpsertSchema);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  const existing = await db
    .select()
    .from(goalContributions)
    .where(
      and(
        eq(goalContributions.goalId, goalId),
        eq(goalContributions.monthId, data.monthId),
      ),
    );

  if (existing[0]) {
    await db
      .update(goalContributions)
      .set({
        ...(data.planAmount !== undefined
          ? { planAmount: data.planAmount }
          : {}),
        ...(data.factAmount !== undefined
          ? { factAmount: data.factAmount }
          : {}),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(goalContributions.goalId, goalId),
          eq(goalContributions.monthId, data.monthId),
        ),
      );
  } else {
    await db.insert(goalContributions).values({
      goalId,
      monthId: data.monthId,
      planAmount: data.planAmount ?? 0,
      factAmount: data.factAmount ?? 0,
    });
  }

  const goalRows = await db
    .select()
    .from(savingsGoals)
    .where(eq(savingsGoals.id, goalId));
  const goal = goalRows[0];
  if (goal && goal.status === "Активна") {
    const total = await sumGoalTotal(goalId);
    if (total >= goal.targetAmount) {
      await db
        .update(savingsGoals)
        .set({ status: "Завершена", closedAt: new Date() })
        .where(eq(savingsGoals.id, goalId));
    }
  }

  const rows = await db
    .select()
    .from(goalContributions)
    .where(
      and(
        eq(goalContributions.goalId, goalId),
        eq(goalContributions.monthId, data.monthId),
      ),
    );
  return NextResponse.json({ contribution: rows[0] });
}
