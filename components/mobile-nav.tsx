"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  List,
  LogOut,
  Menu,
  Plus,
  Settings,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const NAV_ITEMS = [
  { href: "/", label: "캘린더", icon: Calendar },
  { href: "/reservations", label: "예약 목록", icon: List },
  { href: "/reservations/new", label: "새 예약", icon: Plus },
  { href: "/revenue", label: "매출", icon: TrendingUp },
  { href: "/settings", label: "설정", icon: Settings },
] as const;

export function MobileNav({
  logoutAction,
}: {
  logoutAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  function close() {
    setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
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
      <SheetContent side="left" className="w-72 flex flex-col">
        <SheetHeader>
          <SheetTitle>
            <Link
              href="/"
              onClick={close}
              className="text-lg font-semibold bg-gradient-to-br from-zinc-700 to-zinc-500 bg-clip-text text-transparent"
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
              onClick={close}
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
  );
}
