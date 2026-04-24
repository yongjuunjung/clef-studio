import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { destroySession, isAuthenticated } from "@/lib/auth";

async function logoutAction() {
  "use server";
  await destroySession();
  redirect("/login");
}

export default async function AuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAuthenticated())) redirect("/login");

  return (
    <>
      <header className="border-b bg-card/50 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/" className="font-semibold">
              Studio
            </Link>
            <Link href="/" className="text-muted-foreground hover:text-foreground">
              캘린더
            </Link>
            <Link
              href="/reservations"
              className="text-muted-foreground hover:text-foreground"
            >
              예약 목록
            </Link>
            <Link
              href="/reservations/new"
              className="text-muted-foreground hover:text-foreground"
            >
              새 예약
            </Link>
            <Link
              href="/revenue"
              className="text-muted-foreground hover:text-foreground"
            >
              매출
            </Link>
            <Link
              href="/settings"
              className="text-muted-foreground hover:text-foreground"
            >
              설정
            </Link>
          </nav>
          <form action={logoutAction}>
            <Button variant="ghost" size="sm" type="submit">
              로그아웃
            </Button>
          </form>
        </div>
      </header>
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
      </main>
    </>
  );
}
