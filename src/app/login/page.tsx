import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default function LoginPage(): React.ReactElement {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 15%, hsl(var(--primary) / 0.16), transparent 50%), radial-gradient(circle at 80% 85%, hsl(var(--success) / 0.10), transparent 50%)",
        }}
      />
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="M12 3v18M8 8h8M8 16h8" />
            </svg>
          </div>
          <h1 className="display-2">Финансы</h1>
          <p className="text-sm text-muted-foreground">
            Семейный учёт доходов, расходов и целей.
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
