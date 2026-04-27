import { Badge } from "@/components/ui/badge";

export type TaxInvoiceStatus = "not_issued" | "in_progress" | "issued";

export function resolveTaxInvoiceStatus(
  status: string | null | undefined,
  legacyIssued: boolean,
): TaxInvoiceStatus {
  if (status === "not_issued" || status === "in_progress" || status === "issued") {
    return status;
  }
  return legacyIssued ? "issued" : "not_issued";
}

export function TaxInvoiceStatusBadge({
  status,
  size = "sm",
}: {
  status: TaxInvoiceStatus;
  size?: "sm" | "md";
}) {
  const cls = size === "md" ? "text-xs" : "text-[10px]";
  if (status === "issued") {
    return (
      <Badge className={`${cls} bg-emerald-600 hover:bg-emerald-600`}>
        계산서 발행완료
      </Badge>
    );
  }
  if (status === "in_progress") {
    return (
      <Badge className={`${cls} bg-sky-600 hover:bg-sky-600`}>
        계산서 진행중
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className={`${cls} border-amber-500 text-amber-700`}
    >
      계산서 미발행
    </Badge>
  );
}
