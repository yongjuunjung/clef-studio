import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type PlatformKey = "naver" | "hourplace" | "instagram" | "other";

function platformKey(name: string): PlatformKey {
  const n = name.toLowerCase().replace(/\s/g, "");
  if (n.includes("네이버") || n.includes("naver")) return "naver";
  if (n.includes("아워플레이스") || n.includes("hourplace")) return "hourplace";
  if (n.includes("인스타") || n.includes("instagram")) return "instagram";
  return "other";
}

const STYLES: Record<Exclude<PlatformKey, "other">, string> = {
  naver:
    "bg-[#03c75a] text-white border-transparent hover:bg-[#03c75a]/90",
  hourplace:
    "bg-zinc-900 text-white border-transparent hover:bg-zinc-900/90",
  instagram:
    "bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 text-white border-transparent",
};

export function PlatformBadge({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const key = platformKey(name);
  if (key === "other") {
    return (
      <Badge variant="outline" className={cn("text-[10px]", className)}>
        {name}
      </Badge>
    );
  }
  return (
    <Badge className={cn("text-[10px]", STYLES[key], className)}>
      {name}
    </Badge>
  );
}
