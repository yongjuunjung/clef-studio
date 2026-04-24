"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CommissionEditor({
  action,
  currentAmount,
  suggested,
  subtotal,
}: {
  action: (formData: FormData) => Promise<void>;
  currentAmount: number;
  /** 플랫폼 수수료 % × subtotal 로 계산되는 기본값 */
  suggested: number;
  subtotal: number;
}) {
  const [amount, setAmount] = useState<number>(currentAmount);
  const [pending, startTransition] = useTransition();

  // 서버에서 currentAmount가 갱신되면(저장 후 revalidate) 로컬 상태도 동기화
  useEffect(() => {
    setAmount(currentAmount);
  }, [currentAmount]);

  const dirty = amount !== currentAmount;
  const pct = subtotal > 0 ? (amount / subtotal) * 100 : 0;

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await action(formData);
        toast.success(`수수료를 ${amount.toLocaleString()}원으로 저장했습니다`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "저장 실패";
        if (!msg.includes("NEXT_REDIRECT")) toast.error(msg);
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-2">
      {/* hidden input을 통해 FormData에 값이 확실히 포함되도록 보증 */}
      <input type="hidden" name="commissionAmount" value={amount} />
      <Label htmlFor="commissionAmountDisplay">수수료 (원)</Label>
      <div className="flex items-center gap-2 flex-wrap">
        <Input
          id="commissionAmountDisplay"
          type="number"
          min={0}
          step={100}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value) || 0)}
          className="w-40 font-mono"
        />
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          공급가액의 {pct.toFixed(2)}%
        </span>
        <Button type="submit" size="sm" disabled={pending || !dirty}>
          {pending ? "저장 중..." : "저장"}
        </Button>
        {amount !== suggested ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setAmount(suggested)}
          >
            플랫폼 기본값 ({suggested.toLocaleString()}원)
          </Button>
        ) : null}
      </div>
    </form>
  );
}
