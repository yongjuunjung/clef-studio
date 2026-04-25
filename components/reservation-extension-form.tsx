"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const QUICK_HOURS = [0.5, 1, 2, 3] as const;

function splitDayNightForExtension(
  endAtISOInKST: string,
  extraHours: number,
): { dayHours: number; nightHours: number } {
  const [hStr, mStr] = endAtISOInKST.split(":");
  const startMin = Number(hStr) * 60 + Number(mStr);
  let endMin = startMin + extraHours * 60;
  const dayStart = 6 * 60;
  const dayEnd = 18 * 60;
  let dayMin = 0;
  let nightMin = 0;
  let cur = startMin;
  while (cur < endMin) {
    const next = Math.min(cur + 60, endMin);
    const slotStart = cur % (24 * 60);
    const slotMid = (cur + (next - cur) / 2) % (24 * 60);
    const isDay = slotMid >= dayStart && slotMid < dayEnd;
    const len = next - cur;
    if (isDay) dayMin += len;
    else nightMin += len;
    cur = next;
  }
  return { dayHours: dayMin / 60, nightHours: nightMin / 60 };
}

export function ReservationExtensionForm({
  action,
  currentEndTime,
  dayHourlyRate,
  nightHourlyRate,
  defaultPeopleCount,
  minPeople,
  extraPerPersonHourlyRate,
}: {
  action: (formData: FormData) => Promise<void>;
  currentEndTime: string;
  dayHourlyRate: number;
  nightHourlyRate: number;
  defaultPeopleCount: number;
  minPeople: number;
  extraPerPersonHourlyRate: number;
}) {
  const [extraHours, setExtraHours] = useState<number>(1);
  const [peopleCount, setPeopleCount] = useState<number>(defaultPeopleCount);
  const [pending, setPending] = useState(false);

  const preview = useMemo(() => {
    if (extraHours <= 0) return null;
    const { dayHours, nightHours } = splitDayNightForExtension(
      currentEndTime,
      extraHours,
    );
    const baseAmount = Math.round(
      dayHours * dayHourlyRate + nightHours * nightHourlyRate,
    );
    const extraPeople = Math.max(0, peopleCount - minPeople);
    const peopleCharge = Math.round(
      extraPeople * extraPerPersonHourlyRate * extraHours,
    );
    return {
      dayHours,
      nightHours,
      total: baseAmount + peopleCharge,
      baseAmount,
      peopleCharge,
    };
  }, [
    extraHours,
    currentEndTime,
    dayHourlyRate,
    nightHourlyRate,
    peopleCount,
    minPeople,
    extraPerPersonHourlyRate,
  ]);

  return (
    <form
      action={async (fd) => {
        setPending(true);
        try {
          await action(fd);
        } finally {
          setPending(false);
        }
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="space-y-1 col-span-2 sm:col-span-1">
          <Label htmlFor="extraHours" className="text-xs">
            연장 시간
          </Label>
          <Input
            id="extraHours"
            name="extraHours"
            type="number"
            step="0.5"
            min="0.5"
            max="12"
            value={extraHours}
            onChange={(e) => setExtraHours(Number(e.target.value))}
            required
          />
          <div className="flex flex-wrap gap-1 mt-1">
            {QUICK_HOURS.map((h) => (
              <Button
                key={h}
                type="button"
                variant={extraHours === h ? "default" : "outline"}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setExtraHours(h)}
              >
                +{h}h
              </Button>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="peopleCount" className="text-xs">
            인원수
          </Label>
          <Input
            id="peopleCount"
            name="peopleCount"
            type="number"
            min="1"
            max="1000"
            value={peopleCount}
            onChange={(e) => setPeopleCount(Number(e.target.value))}
            required
          />
        </div>
        <div className="space-y-1 col-span-2 sm:col-span-1">
          <Label htmlFor="note" className="text-xs">
            메모 (선택)
          </Label>
          <Input
            id="note"
            name="note"
            type="text"
            placeholder="고객 요청 등"
            maxLength={500}
          />
        </div>
      </div>

      {preview ? (
        <div className="rounded-md bg-muted/40 p-3 text-xs space-y-0.5">
          <div className="flex justify-between">
            <span className="text-muted-foreground">연장 구간</span>
            <span className="font-mono">
              {currentEndTime} ~{" "}
              {(() => {
                const [h, m] = currentEndTime.split(":").map(Number);
                const total = h * 60 + m + extraHours * 60;
                const eh = Math.floor(total / 60) % 24;
                const em = total % 60;
                return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
              })()}
              {preview.dayHours > 0 ? ` · 주간 ${preview.dayHours}h` : ""}
              {preview.nightHours > 0 ? ` · 야간 ${preview.nightHours}h` : ""}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">기본 요금</span>
            <span className="font-mono">+{preview.baseAmount.toLocaleString()}원</span>
          </div>
          {preview.peopleCharge > 0 ? (
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                인원 추가 ({peopleCount - minPeople}명 × {extraHours}h)
              </span>
              <span className="font-mono">
                +{preview.peopleCharge.toLocaleString()}원
              </span>
            </div>
          ) : null}
          <div className="flex justify-between border-t pt-1 mt-1 font-semibold">
            <span>합계</span>
            <span className="font-mono">+{preview.total.toLocaleString()}원</span>
          </div>
        </div>
      ) : null}

      <Button type="submit" size="sm" disabled={pending} className="gap-1.5">
        <Plus className="h-4 w-4" />
        {pending ? "추가 중..." : "연장 추가"}
      </Button>
    </form>
  );
}
