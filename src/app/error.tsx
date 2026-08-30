"use client";

import { useEffect } from "react";
import { AlertOctagon, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.ReactElement {
  useEffect(() => {
    console.error("[app] error boundary:", error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardContent className="py-10 text-center space-y-4">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-destructive/12 text-destructive">
            <AlertOctagon className="h-6 w-6" />
          </div>
          <div>
            <div className="body-lg font-semibold">Что-то пошло не так</div>
            <p className="mt-1 text-sm text-muted-foreground">
              {error.message || "Неизвестная ошибка"}
              {error.digest ? ` (${error.digest})` : ""}
            </p>
          </div>
          <Button onClick={reset}>
            <RefreshCw className="h-4 w-4" /> Попробовать снова
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
