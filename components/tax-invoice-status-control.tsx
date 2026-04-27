"use client";

import { useState, useTransition } from "react";
import { Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";

export type TaxInvoiceStatus = "not_issued" | "in_progress" | "issued";

const OPTIONS: { value: TaxInvoiceStatus; label: string }[] = [
  { value: "not_issued", label: "미발행" },
  { value: "in_progress", label: "진행중" },
  { value: "issued", label: "발행완료" },
];

export function TaxInvoiceStatusControl({
  action,
  initialStatus,
}: {
  action: (formData: FormData) => Promise<void>;
  initialStatus: TaxInvoiceStatus;
}) {
  const [status, setStatus] = useState<TaxInvoiceStatus>(initialStatus);
  const [isPending, startTransition] = useTransition();

  function handleSelect(next: TaxInvoiceStatus) {
    if (next === status || isPending) return;
    const prev = status;
    setStatus(next);
    const fd = new FormData();
    fd.set("status", next);
    startTransition(async () => {
      try {
        await action(fd);
      } catch (e) {
        setStatus(prev);
        console.error(e);
      }
    });
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-md border p-1 bg-background">
      <Receipt className="h-4 w-4 mx-1 text-muted-foreground" />
      {OPTIONS.map((opt) => (
        <Button
          key={opt.value}
          type="button"
          variant={status === opt.value ? "default" : "ghost"}
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => handleSelect(opt.value)}
          disabled={isPending}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}
