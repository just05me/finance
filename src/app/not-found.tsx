import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound(): React.ReactElement {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardContent className="py-10 text-center space-y-4">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/12 text-primary">
            <Compass className="h-6 w-6" />
          </div>
          <div>
            <div className="body-lg font-semibold">Страница не найдена</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Возможно, вы перешли по устаревшей ссылке.
            </p>
          </div>
          <Link href="/">
            <Button>На дашборд</Button>
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
