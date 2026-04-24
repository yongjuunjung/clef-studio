"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { computeRefund } from "@/lib/refund-policy";

function useAction(action: () => Promise<void>) {
  const [pending, startTransition] = useTransition();
  function run() {
    startTransition(async () => {
      try {
        await action();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "실패";
        if (!msg.includes("NEXT_REDIRECT")) toast.error(msg);
      }
    });
  }
  return { pending, run };
}

export function CancelReservationButton({
  action,
  reservationStartAt,
  totalAmount,
}: {
  action: () => Promise<void>;
  reservationStartAt: Date;
  totalAmount: number;
}) {
  const [open, setOpen] = useState(false);
  const { pending, run } = useAction(action);
  const preview = useMemo(
    () => computeRefund(reservationStartAt, totalAmount),
    [reservationStartAt, totalAmount],
  );

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => setOpen(true)}
      >
        예약 취소
      </Button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>예약을 취소하시겠습니까?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm">
              <div className="rounded-md border px-3 py-2 space-y-1 bg-muted/30">
                <div className="text-xs text-muted-foreground">
                  {preview.rule}
                </div>
                <div className="flex justify-between">
                  <span>환불율</span>
                  <span className="font-mono">{preview.rate}%</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>환불 금액</span>
                  <span className="font-mono">
                    {preview.amount.toLocaleString()}원
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                매출에는 {100 - preview.rate}%가 반영됩니다. 환불 금액은 취소 후
                정산 섹션에서 직접 수정할 수 있습니다.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>닫기</AlertDialogCancel>
          <AlertDialogAction onClick={run}>취소 처리</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function RestoreReservationButton({
  action,
}: {
  action: () => Promise<void>;
}) {
  const { pending, run } = useAction(action);
  return (
    <Button variant="outline" size="sm" disabled={pending} onClick={run}>
      예약 복구
    </Button>
  );
}
