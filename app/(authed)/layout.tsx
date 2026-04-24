import Link from "next/link";
import { redirect } from "next/navigation";
import { Menu, Calendar, List, Plus, TrendingUp, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { destroySession, isAuthenticated } from "@/lib/auth";

async function logoutAction() {
  "use server";
  await destroySession();
  redirect("/login");
}

const NAV_ITEMS = [
  { href: "/", label: "캘린더", icon: Calendar },
  { href: "/reservations", label: "예약 목록", icon: List },
  { href: "/reservations/new", label: "새 예약", icon: Plus },
  { href: "/revenue", label: "매출", icon: TrendingUp },
  { href: "/settings", label: "설정", icon: Settings },
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
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  aria-label="메뉴 열기"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72">
                <SheetHeader>
                  <SheetTitle>
                    <Link
                      href="/"
                      className="text-lg font-semibold bg-gradient-to-br from-indigo-600 to-violet-600 bg-clip-text text-transparent"
                    >
                      Clef Studio
                    </Link>
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1 mt-2 px-2">
                  {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm hover:bg-accent transition-colors"
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </Link>
                  ))}
                </nav>
                <div className="mt-auto px-4 pb-4">
                  <form action={logoutAction}>
                    <Button
                      variant="outline"
                      size="sm"
                      type="submit"
                      className="w-full gap-2"
                    >
                      <LogOut className="h-4 w-4" />
                      로그아웃
                    </Button>
                  </form>
                </div>
              </SheetContent>
            </Sheet>

            <Link
              href="/"
              className="text-base md:text-lg font-semibold bg-gradient-to-br from-indigo-600 to-violet-600 bg-clip-text text-transparent"
            >
              Clef Studio
            </Link>

            <nav className="hidden md:flex items-center gap-1 ml-4">
              {NAV_ITEMS.map(({ href, label }) => (
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
