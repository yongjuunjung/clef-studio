"use client";

import { useState, useTransition } from "react";
import { Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TaxInvoiceIssuedToggle({
  action,
  initialIssued,
}: {
  action: (formData: FormData) => Promise<void>;
  initialIssued: boolean;
}) {
  const [issued, setIssued] = useState(initialIssued);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const next = !issued;
    setIssued(next);
    const fd = new FormData();
    fd.set("issued", next ? "on" : "");
    startTransition(async () => {
      try {
        await action(fd);
      } catch (e) {
        setIssued(!next);
        console.error(e);
      }
    });
  }

  return (
    <Button
      type="button"
      variant={issued ? "default" : "outline"}
      size="sm"
      onClick={handleClick}
      disabled={isPending}
      className="gap-1.5"
    >
      <Receipt className="h-4 w-4" />
      {issued ? "세금계산서 발급됨" : "세금계산서 미발급"}
    </Button>
  );
}
