import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileNav } from "@/components/mobile-nav";
import { destroySession, isAuthenticated } from "@/lib/auth";

async function logoutAction() {
  "use server";
  await destroySession();
  redirect("/login");
}

const DESKTOP_NAV_ITEMS = [
  { href: "/", label: "캘린더" },
  { href: "/reservations", label: "예약 목록" },
  { href: "/reservations/new", label: "새 예약" },
  { href: "/revenue", label: "매출" },
  { href: "/settings", label: "설정" },
] as const;

export default async function AuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAuthenticated())) redirect("/login");

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MobileNav logoutAction={logoutAction} />

            <Link
              href="/"
              className="text-base md:text-lg font-semibold bg-gradient-to-br from-zinc-700 to-zinc-500 bg-clip-text text-transparent"
            >
              Clef Studio
            </Link>

            <nav className="hidden md:flex items-center gap-1 ml-4">
              {DESKTOP_NAV_ITEMS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          <form action={logoutAction} className="hidden md:block">
            <Button variant="ghost" size="sm" type="submit" className="gap-2">
              <LogOut className="h-4 w-4" />
              <span className="hidden lg:inline">로그아웃</span>
            </Button>
          </form>
        </div>
      </header>
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-3 sm:px-4 py-4 sm:py-6">
          {children}
        </div>
      </main>
    </>
  );
}
