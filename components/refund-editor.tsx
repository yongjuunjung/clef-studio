"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RefundEditor({
  action,
  currentAmount,
  totalAmount,
}: {
  action: (formData: FormData) => Promise<void>;
  currentAmount: number;
  totalAmount: number;
}) {
  const [amount, setAmount] = useState<number>(currentAmount);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setAmount(currentAmount);
  }, [currentAmount]);

  const dirty = amount !== currentAmount;
  const pct = totalAmount > 0 ? (amount / totalAmount) * 100 : 0;
  const invalid = amount < 0 || amount > totalAmount;

  function handleSubmit(formData: FormData) {
    if (invalid) {
      toast.error("환불 금액이 올바르지 않습니다");
      return;
    }
    startTransition(async () => {
      try {
        await action(formData);
        toast.success(
          `환불 금액을 ${amount.toLocaleString()}원으로 저장했습니다`,
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : "저장 실패";
        if (!msg.includes("NEXT_REDIRECT")) toast.error(msg);
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-2">
      <input type="hidden" name="refundAmount" value={amount} />
      <Label htmlFor="refundAmountDisplay">환불 금액 (원)</Label>
      <div className="flex items-center gap-2 flex-wrap">
        <Input
          id="refundAmountDisplay"
          type="number"
          min={0}
          max={totalAmount}
          step={100}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value) || 0)}
          className="w-40 font-mono"
        />
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          총 매출의 {pct.toFixed(2)}%
        </span>
        <Button
          type="submit"
          size="sm"
          disabled={pending || !dirty || invalid}
        >
          {pending ? "저장 중..." : "저장"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        0원이면 100% 매출로 집계, 총액이면 매출 0원으로 집계됩니다.
      </p>
    </form>
  );
}
