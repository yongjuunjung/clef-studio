"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export function RemoveExtensionButton({
  action,
  extraHours,
  amount,
}: {
  action: () => Promise<void>;
  extraHours: number;
  amount: number;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          className="h-7 px-2 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>마지막 연장을 취소하시겠습니까?</AlertDialogTitle>
          <AlertDialogDescription>
            +{extraHours}시간 연장 (+{amount.toLocaleString()}원)이 제거되고,
            예약 종료 시각과 매출이 원래대로 돌아갑니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              startTransition(async () => {
                try {
                  await action();
                } catch (e) {
                  const msg = e instanceof Error ? e.message : "삭제 실패";
                  if (!msg.includes("NEXT_REDIRECT")) toast.error(msg);
                }
              })
            }
          >
            연장 취소
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
