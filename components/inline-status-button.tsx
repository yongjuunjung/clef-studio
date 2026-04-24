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

type CancelProps = {
  action: () => Promise<void>;
  variant: "cancel";
  reservationStartAt: Date;
  totalAmount: number;
};

type RestoreProps = {
  action: () => Promise<void>;
  variant: "restore";
};

export function InlineStatusButton(props: CancelProps | RestoreProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const preview = useMemo(() => {
    if (props.variant !== "cancel") return null;
    return computeRefund(props.reservationStartAt, props.totalAmount);
  }, [props]);

  function run() {
    startTransition(async () => {
      try {
        await props.action();
        toast.success(props.variant === "cancel" ? "취소 처리됨" : "복구됨");
        setOpen(false);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "실패";
        if (!msg.includes("NEXT_REDIRECT")) toast.error(msg);
      }
    });
  }

  if (props.variant === "restore") {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          run();
        }}
      >
        복구
      </Button>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
      >
        취소
      </Button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>예약을 취소하시겠습니까?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm">
              {preview ? (
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
              ) : null}
              <p className="text-xs text-muted-foreground">
                매출 집계에서는 {preview ? 100 - preview.rate : 0}% 만 반영됩니다.
                환불 금액은 취소 후 직접 수정할 수 있습니다.
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
