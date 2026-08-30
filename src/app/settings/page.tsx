import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { SettingsView } from "@/components/settings-view";
import {
  getSettings,
  getUserPreferences,
  listCategories,
  listIncomeCategories,
  listRegularIncomeTemplates,
} from "@/db/queries";
import { ownerFromUserName } from "@/lib/owner";

export const dynamic = "force-dynamic";

export default async function SettingsPage(): Promise<React.ReactElement> {
  const session = await requireUser();
  const [settings, prefs, categories, incomeCategories, templates] =
    await Promise.all([
      getSettings(),
      getUserPreferences(session.userId),
      listCategories(true),
      listIncomeCategories(true),
      listRegularIncomeTemplates(),
    ]);
  return (
    <AppShell
      userName={session.name}
      userOwner={ownerFromUserName(session.name)}
      categories={categories.filter((c) => !c.archived)}
      incomeCategories={incomeCategories.filter((c) => !c.archived)}
    >
      <SettingsView
        settings={settings}
        preferences={prefs}
        expenseCategories={categories}
        incomeCategories={incomeCategories}
        templates={templates}
      />
    </AppShell>
  );
}
