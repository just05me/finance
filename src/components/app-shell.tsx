"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  BarChart3,
  Calendar,
  Home,
  LogOut,
  MoonStar,
  Plus,
  Settings,
  Sun,
  Target,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";
import { QuickAddSheet } from "@/components/quick-add-sheet";
import type { Category, IncomeCategory, Owner } from "@/db/schema";

interface AppShellProps {
  userName: string;
  userOwner: Owner;
  categories: Category[];
  incomeCategories: IncomeCategory[];
  children: React.ReactNode;
}

const navItems: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { href: "/", label: "Дашборд", icon: Home },
  { href: "/months", label: "Месяц", icon: Calendar },
  { href: "/goals", label: "Цели", icon: Target },
  { href: "/analytics", label: "Аналитика", icon: BarChart3 },
  { href: "/settings", label: "Настройки", icon: Settings },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({
  userName,
  userOwner,
  categories,
  incomeCategories,
  children,
}: AppShellProps): React.ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const { mode, resolved, setMode } = useTheme();
  const [openQuickAdd, setOpenQuickAdd] = React.useState(false);

  async function onLogout(): Promise<void> {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function nextTheme(): void {
    const order: ("auto" | "light" | "dark")[] = ["auto", "light", "dark"];
    const idx = order.indexOf(mode);
    setMode(order[(idx + 1) % order.length]);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 material safe-top border-b border-border/60">
        <div className="container flex h-14 items-center justify-between gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em]"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <Wand2 className="h-4 w-4" />
            </span>
            <span className="hidden sm:inline">Финансы</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1 rounded-full bg-muted/70 p-1">
            {navItems.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
                    active
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {active ? (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 -z-10 rounded-full bg-card shadow-sm"
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 40,
                      }}
                    />
                  ) : null}
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={nextTheme}
              aria-label={`Тема: ${mode}`}
              title={`Тема: ${mode === "auto" ? "Авто" : mode === "light" ? "Светлая" : "Тёмная"}`}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {resolved === "dark" ? (
                <MoonStar className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </button>
            <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-muted/70 px-2.5 py-1 text-[13px]">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/12 text-[11px] font-semibold text-primary">
                {userName.slice(0, 1)}
              </span>
              <span className="font-medium">{userName}</span>
            </div>
            <button
              type="button"
              onClick={onLogout}
              aria-label="Выйти"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="container pb-[calc(env(safe-area-inset-bottom)+6.5rem)] pt-4 md:pb-8">
        {children}
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 safe-bottom">
        <div className="material mx-auto max-w-md rounded-t-3xl border-t border-x border-border/60 px-1.5 pt-1.5 pb-1 shadow-elevated">
          <div className="grid grid-cols-5 gap-0.5">
            {navItems.map((item, idx) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              const shiftedIdx = idx >= 2 ? idx + 1 : idx;
              return (
                <React.Fragment key={item.href}>
                  {idx === 2 ? (
                    <div key="fab-slot" className="relative">
                      <button
                        type="button"
                        onClick={() => setOpenQuickAdd(true)}
                        aria-label="Добавить расход"
                        className="absolute left-1/2 -top-6 -translate-x-1/2 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-elevated transition-transform duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95"
                      >
                        <Plus className="h-6 w-6" strokeWidth={2.5} />
                      </button>
                    </div>
                  ) : null}
                  <Link
                    href={item.href}
                    className={cn(
                      "relative flex flex-col items-center gap-0.5 rounded-2xl px-2 py-1.5 text-[10.5px] font-semibold transition-colors duration-200",
                      active
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    style={{ gridColumnStart: shiftedIdx + 1 }}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5 transition-transform",
                        active && "scale-110",
                      )}
                    />
                    <span>{item.label}</span>
                  </Link>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </nav>

      <button
        type="button"
        onClick={() => setOpenQuickAdd(true)}
        aria-label="Добавить расход"
        className="hidden md:inline-flex fixed bottom-6 right-6 z-40 h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-elevated transition-transform duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-105 active:scale-95"
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </button>

      <QuickAddSheet
        open={openQuickAdd}
        onOpenChange={setOpenQuickAdd}
        categories={categories}
        incomeCategories={incomeCategories}
        defaultOwner={userOwner}
      />
    </div>
  );
}
