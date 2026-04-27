"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { Textarea } from "@/components/ui/textarea";

type Segment = { startTime: string; endTime: string; people: number };

export type PlatformOption = {
  id: number;
  name: string;
  commissionRatePct: number;
  taxInvoiceRequired: boolean;
};

export type ReservationFormValues = {
  customerName?: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  date?: string;
  startTime?: string;
  endTime?: string;
  dayHourlyRate?: number;
  nightHourlyRate?: number;
  platformId?: number | null;
  taxInvoice?: boolean;
  tags?: string;
  notes?: string | null;
  segments?: { startTime: string; endTime: string; peopleCount: number }[];
};

const DAY_START = 6 * 60;
const DAY_END = 18 * 60;
const VAT_RATE = 0.1;

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(min: number): string {
  const safe = Math.max(0, Math.min(24 * 60, min));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function splitDayNight(startMin: number, endMin: number) {
  const dayMin = Math.max(
    0,
    Math.min(endMin, DAY_END) - Math.max(startMin, DAY_START),
  );
  const total = Math.max(0, endMin - startMin);
  return { dayMin, nightMin: total - dayMin };
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length < 4) return digits;
  if (digits.length < 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length <= 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export function ReservationForm({
  action,
  defaultValues = {},
  defaultDayRate,
  defaultNightRate,
  minPeople,
  extraPerPersonHourlyRate,
  minBookingHours,
  platforms,
  knownTags = [],
  submitLabel = "저장",
}: {
  action: (formData: FormData) => Promise<void>;
  defaultValues?: ReservationFormValues;
  defaultDayRate: number;
  defaultNightRate: number;
  minPeople: number;
  extraPerPersonHourlyRate: number;
  minBookingHours: number;
  platforms: PlatformOption[];
  knownTags?: string[];
  submitLabel?: string;
}) {
  const initStart = defaultValues.startTime ?? "10:00";
  const initEnd =
    defaultValues.endTime ??
    minutesToTime(timeToMinutes(initStart) + minBookingHours * 60);

  const [startTime, setStartTime] = useState(initStart);
  const [endTime, setEndTime] = useState(initEnd);
  const [dayRate, setDayRate] = useState<number>(
    defaultValues.dayHourlyRate ?? defaultDayRate,
  );
  const [nightRate, setNightRate] = useState<number>(
    defaultValues.nightHourlyRate ?? defaultNightRate,
  );
  const [taxInvoice, setTaxInvoice] = useState<boolean>(
    defaultValues.taxInvoice ?? false,
  );
  const [platformId, setPlatformId] = useState<string>(
    defaultValues.platformId ? String(defaultValues.platformId) : "",
  );
  const [phone, setPhone] = useState<string>(
    formatPhone(defaultValues.customerPhone ?? ""),
  );
  const [tagsInput, setTagsInput] = useState<string>(
    defaultValues.tags ?? "",
  );
  const selectedPlatform = platforms.find(
    (p) => String(p.id) === platformId,
  );

  function onPlatformChange(next: string) {
    setPlatformId(next);
    const p = platforms.find((x) => String(x.id) === next);
    if (p?.taxInvoiceRequired) {
      setTaxInvoice(true);
    }
  }
  const [segments, setSegments] = useState<Segment[]>(() => {
    if (defaultValues.segments && defaultValues.segments.length > 0) {
      return defaultValues.segments.map((s) => ({
        startTime: s.startTime,
        endTime: s.endTime,
        people: s.peopleCount,
      }));
    }
    return [{ startTime: initStart, endTime: initEnd, people: minPeople }];
  });
  const [pending, startTransition] = useTransition();

  /** 예약 시작/종료 변경 시 첫/마지막 세그먼트 경계 동기화 */
  useEffect(() => {
    setSegments((prev) => {
      if (prev.length === 0) {
        return [{ startTime, endTime, people: minPeople }];
      }
      const next = [...prev];
      next[0] = { ...next[0], startTime };
      next[next.length - 1] = { ...next[next.length - 1], endTime };
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startTime, endTime]);

  /** 시작 시간 변경 시 종료 시간을 기본 minBookingHours 뒤로 자동 설정 */
  function handleStartChange(value: string) {
    setStartTime(value);
    const nextEnd = minutesToTime(
      timeToMinutes(value) + minBookingHours * 60,
    );
    setEndTime(nextEnd);
  }

  function handleEndChange(value: string) {
    setEndTime(value);
  }

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPhone(formatPhone(e.target.value));
  }

  /** 텍스트 input 안에서 Enter 누르면 폼 제출되지 않도록 차단 */
  function handleKeyDown(e: React.KeyboardEvent<HTMLFormElement>) {
    if (e.key !== "Enter") return;
    const target = e.target as HTMLElement;
    const tag = target.tagName;
    const type = (target as HTMLInputElement).type;
    if (tag === "TEXTAREA") return;
    if (tag === "BUTTON" && type === "submit") return;
    e.preventDefault();
  }

  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);
  const totalHours = endMin > startMin ? (endMin - startMin) / 60 : 0;
  const hoursLabel = Number.isInteger(totalHours)
    ? `${totalHours}시간`
    : `${totalHours.toFixed(1)}시간`;

  const timeErrors: string[] = [];
  if (endMin <= startMin) timeErrors.push("종료 시간은 시작보다 이후여야 합니다");
  else if (totalHours < minBookingHours)
    timeErrors.push(`최소 예약 시간은 ${minBookingHours}시간입니다`);
  else if (totalHours > 24) timeErrors.push("최대 24시간까지만 예약 가능합니다");

  /** 세그먼트 검증: 연속 + 커버 */
  const segmentErrors: string[] = useMemo(() => {
    const errs: string[] = [];
    if (segments.length === 0) {
      errs.push("시간별 인원을 최소 1개 입력하세요");
      return errs;
    }
    const sorted = [...segments].sort(
      (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime),
    );
    for (const s of sorted) {
      if (timeToMinutes(s.endTime) <= timeToMinutes(s.startTime)) {
        errs.push("인원 구간의 시작/종료가 올바르지 않습니다");
        return errs;
      }
      if (s.people < 1) {
        errs.push("인원은 1 이상이어야 합니다");
        return errs;
      }
    }
    if (timeToMinutes(sorted[0].startTime) !== startMin) {
      errs.push("첫 구간이 예약 시작 시간부터 시작해야 합니다");
    }
    if (timeToMinutes(sorted[sorted.length - 1].endTime) !== endMin) {
      errs.push("마지막 구간이 예약 종료 시간까지 이어져야 합니다");
    }
    for (let i = 1; i < sorted.length; i++) {
      if (
        timeToMinutes(sorted[i].startTime) !==
        timeToMinutes(sorted[i - 1].endTime)
      ) {
        errs.push("인원 구간이 연속되지 않습니다 (빈 시간 또는 겹침)");
        break;
      }
    }
    return errs;
  }, [segments, startMin, endMin]);

  /** 요금 계산 */
  const { dayMin, nightMin } = splitDayNight(startMin, endMin);
  const base = Math.round(
    (dayMin / 60) * dayRate + (nightMin / 60) * nightRate,
  );
  const extraCharge = useMemo(() => {
    let t = 0;
    for (const s of segments) {
      const hrs =
        (timeToMinutes(s.endTime) - timeToMinutes(s.startTime)) / 60;
      if (hrs <= 0) continue;
      const extraPeople = Math.max(0, s.people - minPeople);
      t += Math.round(hrs * extraPeople * extraPerPersonHourlyRate);
    }
    return t;
  }, [segments, minPeople, extraPerPersonHourlyRate]);
  const subtotal = base + extraCharge;
  const vat = taxInvoice ? Math.round(subtotal * VAT_RATE) : 0;
  const total = subtotal + vat;

  const segmentsJson = JSON.stringify(
    segments.map((s) => ({
      startTime: s.startTime,
      endTime: s.endTime,
      peopleCount: s.people,
    })),
  );

  function updateSegment(i: number, patch: Partial<Segment>) {
    setSegments((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], ...patch };
      return next;
    });
  }

  /** 인원 구간 추가: 현재 종료시간 이후로 1시간 연장하며 새 구간 추가 */
  function addSegment() {
    const lastEndMin = segments.length
      ? timeToMinutes(segments[segments.length - 1].endTime)
      : endMin;
    const proposedEndMin = Math.min(24 * 60, lastEndMin + 60);
    if (proposedEndMin <= lastEndMin) {
      toast.error("종료 시간이 24시를 넘을 수 없습니다");
      return;
    }
    const totalAfter = (proposedEndMin - startMin) / 60;
    if (totalAfter > 24) {
      toast.error("최대 24시간까지만 예약 가능합니다");
      return;
    }
    const newStart = minutesToTime(lastEndMin);
    const newEnd = minutesToTime(proposedEndMin);
    const lastPeople = segments.length
      ? segments[segments.length - 1].people
      : minPeople;
    setSegments((prev) => [
      ...prev,
      { startTime: newStart, endTime: newEnd, people: lastPeople },
    ]);
    setEndTime(newEnd);
  }

  function removeSegment(i: number) {
    setSegments((prev) => {
      if (prev.length <= 1) return prev;
      const removed = prev[i];
      const next = prev.filter((_, idx) => idx !== i);
      if (i === 0) {
        next[0] = { ...next[0], startTime: removed.startTime };
      } else if (i === prev.length - 1) {
        next[next.length - 1] = {
          ...next[next.length - 1],
          endTime: removed.endTime,
        };
      } else {
        next[i - 1] = { ...next[i - 1], endTime: removed.endTime };
      }
      return next;
    });
  }

  /** 태그 추가/제거 */
  function appendTag(tag: string) {
    setTagsInput((prev) => {
      const existing = prev
        .split(/[,\s]+/)
        .map((t) => t.trim())
        .filter(Boolean);
      if (existing.includes(tag)) return prev;
      const sep = prev.trim().length > 0 && !prev.trim().endsWith(",") ? ", " : "";
      return `${prev}${sep}${tag}`;
    });
  }

  const currentTagSet = useMemo(() => {
    return new Set(
      tagsInput
        .split(/[,\s]+/)
        .map((t) => t.trim())
        .filter(Boolean),
    );
  }, [tagsInput]);

  const suggestedTags = useMemo(
    () => knownTags.filter((t) => !currentTagSet.has(t)),
    [knownTags, currentTagSet],
  );

  async function handleSubmit(formData: FormData) {
    if (timeErrors.length > 0 || segmentErrors.length > 0) {
      toast.error(timeErrors[0] ?? segmentErrors[0] ?? "입력을 확인하세요");
      return;
    }
    startTransition(async () => {
      try {
        await action(formData);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "저장 실패";
        if (!msg.includes("NEXT_REDIRECT")) toast.error(msg);
      }
    });
  }

  return (
    <form action={handleSubmit} onKeyDown={handleKeyDown} className="space-y-5">
      <input type="hidden" name="segmentsJson" value={segmentsJson} />
      <input type="hidden" name="platformId" value={platformId} />
      <input
        type="hidden"
        name="taxInvoice"
        value={taxInvoice ? "on" : ""}
      />

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="customerName">예약자 이름 *</Label>
          <Input
            id="customerName"
            name="customerName"
            defaultValue={defaultValues.customerName ?? ""}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customerPhone">연락처</Label>
          <Input
            id="customerPhone"
            name="customerPhone"
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={handlePhoneChange}
            placeholder="010-0000-0000"
            maxLength={13}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">날짜 *</Label>
          <Input
            id="date"
            name="date"
            type="date"
            defaultValue={defaultValues.date}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="startTime">시작 시간 *</Label>
          <Input
            id="startTime"
            name="startTime"
            type="time"
            step={3600}
            value={startTime}
            onChange={(e) => handleStartChange(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endTime">종료 시간 *</Label>
          <Input
            id="endTime"
            name="endTime"
            type="time"
            step={3600}
            value={endTime}
            onChange={(e) => handleEndChange(e.target.value)}
            required
          />
          {timeErrors.length > 0 ? (
            <p className="text-xs text-destructive">{timeErrors[0]}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              사용 {hoursLabel} ·{" "}
              {dayMin > 0 ? `주간 ${(dayMin / 60).toFixed(dayMin % 60 === 0 ? 0 : 1)}h` : ""}
              {dayMin > 0 && nightMin > 0 ? " + " : ""}
              {nightMin > 0 ? `야간 ${(nightMin / 60).toFixed(nightMin % 60 === 0 ? 0 : 1)}h` : ""}
            </p>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dayHourlyRate">
            <span className="inline-flex items-center gap-2">
              주간 시간당 요금 (원)
              <Badge variant="secondary" className="text-[10px]">06 ~ 18시</Badge>
            </span>
          </Label>
          <MoneyInput
            id="dayHourlyRate"
            name="dayHourlyRate"
            value={dayRate}
            onChange={setDayRate}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nightHourlyRate">
            <span className="inline-flex items-center gap-2">
              야간 시간당 요금 (원)
              <Badge className="text-[10px] bg-indigo-600 hover:bg-indigo-600">
                18 ~ 06시
              </Badge>
            </span>
          </Label>
          <MoneyInput
            id="nightHourlyRate"
            name="nightHourlyRate"
            value={nightRate}
            onChange={setNightRate}
            required
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <Label>시간별 인원</Label>
          <p className="text-xs text-muted-foreground">
            기본 {minPeople}명 포함 · 초과 1인 시간당{" "}
            {extraPerPersonHourlyRate.toLocaleString()}원
          </p>
        </div>
        {segmentErrors.length > 0 ? (
          <p className="text-xs text-destructive">{segmentErrors[0]}</p>
        ) : null}
        <div className="border rounded-md divide-y">
          {segments.map((s, i) => (
            <SegmentRow
              key={i}
              index={i}
              segment={s}
              canRemove={segments.length > 1}
              startTimeLocked={i === 0 ? startTime : undefined}
              endTimeLocked={i === segments.length - 1 ? endTime : undefined}
              minPeople={minPeople}
              extraPerPersonHourlyRate={extraPerPersonHourlyRate}
              onChange={(patch) => updateSegment(i, patch)}
              onRemove={() => removeSegment(i)}
            />
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addSegment}>
          + 인원 구간 추가
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="platformId">플랫폼</Label>
        <select
          id="platformId"
          value={platformId}
          onChange={(e) => onPlatformChange(e.target.value)}
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
        >
          <option value="">직접 / 없음</option>
          {platforms.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.commissionRatePct ? ` (수수료 ${p.commissionRatePct}%)` : ""}
              {p.taxInvoiceRequired ? " · 세금계산서 필수" : ""}
            </option>
          ))}
        </select>
        {selectedPlatform ? (
          <p className="text-xs text-muted-foreground">
            수수료 {selectedPlatform.commissionRatePct}% (실수령 계산용)
            {selectedPlatform.taxInvoiceRequired
              ? " · 이 플랫폼은 세금계산서 발행이 필수입니다"
              : ""}
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-3 p-3 border rounded-md bg-muted/30">
        <Checkbox
          id="taxInvoice"
          checked={taxInvoice}
          onCheckedChange={(v) => setTaxInvoice(!!v)}
        />
        <Label htmlFor="taxInvoice" className="font-normal cursor-pointer">
          세금계산서 발행 (계산 금액의 10% 부가세 추가)
        </Label>
      </div>

      <div className="p-4 rounded-md bg-muted/40 space-y-1">
        <div className="flex justify-between text-sm">
          <span>기본 요금 ({hoursLabel})</span>
          <span className="font-mono">{base.toLocaleString()}원</span>
        </div>
        {extraCharge > 0 ? (
          <div className="flex justify-between text-sm">
            <span>인원 추가</span>
            <span className="font-mono">+ {extraCharge.toLocaleString()}원</span>
          </div>
        ) : null}
        {vat > 0 ? (
          <div className="flex justify-between text-sm">
            <span>부가세 10%</span>
            <span className="font-mono">+ {vat.toLocaleString()}원</span>
          </div>
        ) : null}
        <div className="flex justify-between text-base pt-1 border-t font-semibold">
          <span>총 금액</span>
          <span className="font-mono">{total.toLocaleString()}원</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tags">태그 (쉼표 또는 공백 구분)</Label>
        <Input
          id="tags"
          name="tags"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="촬영, 단골, 영상"
          list="reservation-tags-suggestions"
          autoComplete="off"
        />
        {knownTags.length > 0 ? (
          <datalist id="reservation-tags-suggestions">
            {knownTags.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        ) : null}
        {suggestedTags.length > 0 ? (
          <div className="flex flex-wrap gap-1 pt-1">
            {suggestedTags.slice(0, 15).map((t) => (
              <Button
                key={t}
                type="button"
                variant="outline"
                size="sm"
                className="h-6 px-2 text-[11px]"
                onClick={() => appendTag(t)}
              >
                + {t}
              </Button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">메모</Label>
        <Textarea
          id="notes"
          name="notes"
          defaultValue={defaultValues.notes ?? ""}
          rows={4}
        />
      </div>

      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={
            pending || timeErrors.length > 0 || segmentErrors.length > 0
          }
        >
          {pending ? "저장 중..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function PeopleNumberInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  const [text, setText] = useState<string>(String(value));

  useEffect(() => {
    setText((prev) => {
      const n = prev === "" ? 0 : Number(prev);
      if (Number.isFinite(n) && n === value) return prev;
      return String(value);
    });
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "");
    const trimmed = raw.replace(/^0+(?=\d)/, "");
    setText(trimmed);
    const num = trimmed === "" ? 0 : Number(trimmed);
    onChange(num);
  }

  function handleBlur() {
    if (text === "" || Number(text) < 1) {
      setText("1");
      onChange(1);
    }
  }

  return (
    <Input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={text}
      onFocus={(e) => e.currentTarget.select()}
      onChange={handleChange}
      onBlur={handleBlur}
      className="w-24"
    />
  );
}

function SegmentRow({
  index,
  segment,
  canRemove,
  startTimeLocked,
  endTimeLocked,
  minPeople,
  extraPerPersonHourlyRate,
  onChange,
  onRemove,
}: {
  index: number;
  segment: Segment;
  canRemove: boolean;
  startTimeLocked?: string;
  endTimeLocked?: string;
  minPeople: number;
  extraPerPersonHourlyRate: number;
  onChange: (patch: Partial<Segment>) => void;
  onRemove: () => void;
}) {
  const startMin = timeToMinutes(segment.startTime);
  const endMin = timeToMinutes(segment.endTime);
  const { dayMin, nightMin } = splitDayNight(startMin, endMin);
  const hours = endMin > startMin ? (endMin - startMin) / 60 : 0;
  const extraPeople = Math.max(0, segment.people - minPeople);
  const extraCharge = Math.round(
    hours * extraPeople * extraPerPersonHourlyRate,
  );

  return (
    <div className="px-3 py-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 shrink-0">
          <Input
            type="time"
            step={3600}
            value={segment.startTime}
            onChange={(e) => onChange({ startTime: e.target.value })}
            readOnly={Boolean(startTimeLocked)}
            className="w-[9.5rem]"
          />
          <span className="text-muted-foreground">~</span>
          <Input
            type="time"
            step={3600}
            value={segment.endTime}
            onChange={(e) => onChange({ endTime: e.target.value })}
            readOnly={Boolean(endTimeLocked)}
            className="w-[9.5rem]"
          />
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <PeopleNumberInput
            value={segment.people}
            onChange={(n) => onChange({ people: n })}
          />
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            명
          </span>
          {extraPeople > 0 ? (
            <Badge
              variant="outline"
              className="text-[10px] whitespace-nowrap border-emerald-500 text-emerald-700"
            >
              +{extraPeople}명 추가
            </Badge>
          ) : null}
        </div>

        {canRemove ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            aria-label={`구간 ${index + 1} 삭제`}
            className="ml-auto h-8 w-8 shrink-0"
          >
            ×
          </Button>
        ) : null}
      </div>

      <div className="flex items-center gap-2 flex-wrap text-xs">
        {dayMin > 0 ? (
          <Badge variant="secondary" className="text-[10px] whitespace-nowrap">
            주간 {(dayMin / 60).toFixed(dayMin % 60 === 0 ? 0 : 1)}h
          </Badge>
        ) : null}
        {nightMin > 0 ? (
          <Badge className="text-[10px] bg-indigo-600 hover:bg-indigo-600 whitespace-nowrap">
            야간 {(nightMin / 60).toFixed(nightMin % 60 === 0 ? 0 : 1)}h
          </Badge>
        ) : null}
        <span className="ml-auto font-mono text-muted-foreground whitespace-nowrap">
          {extraCharge > 0
            ? `+ ${extraCharge.toLocaleString()}원`
            : "기본 인원"}
        </span>
      </div>
    </div>
  );
}
