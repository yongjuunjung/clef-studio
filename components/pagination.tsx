import Link from "next/link";
import { Button } from "@/components/ui/button";

function buildPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  if (current > 3) pages.push("…");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push("…");
  pages.push(total);
  return pages;
}

export function Pagination({
  currentPage,
  totalPages,
  pathname,
  searchParams,
  pageParam = "p",
}: {
  currentPage: number;
  totalPages: number;
  pathname: string;
  searchParams: Record<string, string | undefined>;
  pageParam?: string;
}) {
  if (totalPages <= 1) return null;

  function buildHref(page: number): string {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      if (v && k !== pageParam) p.set(k, v);
    }
    if (page > 1) p.set(pageParam, String(page));
    const qs = p.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  const pages = buildPageNumbers(currentPage, totalPages);

  return (
    <div className="flex items-center justify-center gap-1 flex-wrap">
      {currentPage > 1 ? (
        <Link href={buildHref(currentPage - 1)}>
          <Button size="sm" variant="outline">
            ‹
          </Button>
        </Link>
      ) : (
        <Button size="sm" variant="outline" disabled>
          ‹
        </Button>
      )}
      {pages.map((p, i) =>
        p === "…" ? (
          <span
            key={`ellipsis-${i}`}
            className="px-2 text-sm text-muted-foreground"
          >
            …
          </span>
        ) : (
          <Link key={p} href={buildHref(p)}>
            <Button
              size="sm"
              variant={p === currentPage ? "default" : "outline"}
            >
              {p}
            </Button>
          </Link>
        ),
      )}
      {currentPage < totalPages ? (
        <Link href={buildHref(currentPage + 1)}>
          <Button size="sm" variant="outline">
            ›
          </Button>
        </Link>
      ) : (
        <Button size="sm" variant="outline" disabled>
          ›
        </Button>
      )}
    </div>
  );
}
