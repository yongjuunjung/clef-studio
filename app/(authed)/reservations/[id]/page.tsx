import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ReservationForm } from "@/components/reservation-form";
import { DeleteReservationButton } from "@/components/delete-reservation-button";
import { CommissionEditor } from "@/components/commission-editor";
import { ReservationExtensionForm } from "@/components/reservation-extension-form";
import { RemoveExtensionButton } from "@/components/remove-extension-button";
import { TaxInvoiceIssuedToggle } from "@/components/tax-invoice-issued-toggle";
import {
  CancelReservationButton,
  RestoreReservationButton,
} from "@/components/status-action-buttons";
import {
  addReservationExtension,
  cancelReservation,
  deleteReservation,
  getReservation,
  removeLatestReservationExtension,
  restoreReservation,
  setTaxInvoiceIssued,
  updateCommissionAmount,
  updateRefundAmount,
  updateReservation,
} from "@/lib/reservations";
import { RefundEditor } from "@/components/refund-editor";
import { listPlatforms } from "@/lib/platforms";
import { peopleLabel } from "@/lib/reservations-helpers";
import { getSettings } from "@/lib/settings";
import {
  durationHours,
  fmtDate,
  fmtDateTime,
  fmtTimeRange,
  formatDurationHours,
  formatKRW,
  splitDayNightHoursFromDates,
  toLocalDateTimeInputs,
} from "@/lib/tz";

type Params = Promise<{ id: string }>;

export default async function ReservationDetailPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) notFound();

  const reservation = await getReservation(numericId);
  if (!reservation) notFound();

  const [s, platforms] = await Promise.all([getSettings(), listPlatforms()]);
  const startInputs = toLocalDateTimeInputs(reservation.startAt);
  const endInputs = toLocalDateTimeInputs(reservation.endAt);
  const hours = durationHours(reservation.startAt, reservation.endAt);
  const { dayHours, nightHours } = splitDayNightHoursFromDates(
    reservation.startAt,
    reservation.endAt,
  );
  const baseAmount = Math.round(
    dayHours * reservation.dayHourlyRate +
      nightHours * reservation.nightHourlyRate,
  );
  const extraAmount = reservation.subtotalAmount - baseAmount;
  const suggestedCommission = Math.round(
    (reservation.subtotalAmount * reservation.platformCommissionPct) / 100,
  );
  const netAmount =
    reservation.subtotalAmount - reservation.commissionAmount;

  const isCancelled = reservation.status === "cancelled";
  const keptMultiplier =
    isCancelled ? (100 - reservation.refundRatePct) / 100 : 1;
  const keptTotal = Math.round(reservation.totalAmount * keptMultiplier);
  const keptCommission = Math.round(
    reservation.commissionAmount * keptMultiplier,
  );
  const keptSubtotal = Math.round(reservation.subtotalAmount * keptMultiplier);
  const keptNet = keptSubtotal - keptCommission;

  const updateAction = updateReservation.bind(null, reservation.id);
  const deleteAction = deleteReservation.bind(null, reservation.id);
  const cancelAction = cancelReservation.bind(null, reservation.id);
  const restoreAction = restoreReservation.bind(null, reservation.id);
  const commissionAction = updateCommissionAmount.bind(null, reservation.id);
  const refundAction = updateRefundAmount.bind(null, reservation.id);
  const addExtensionAction = addReservationExtension.bind(
    null,
    reservation.id,
  );
  const removeExtensionAction = removeLatestReservationExtension.bind(
    null,
    reservation.id,
  );
  const taxInvoiceIssuedAction = setTaxInvoiceIssued.bind(null, reservation.id);

  const lastSegmentPeople =
    reservation.peopleSegments.length > 0
      ? reservation.peopleSegments[reservation.peopleSegments.length - 1]
          .peopleCount
      : s.defaultMinPeople;
  const extensionsTotalAmount = reservation.extensions.reduce(
    (sum, e) => sum + e.amount,
    0,
  );

  const savedSegments = reservation.peopleSegments.map((seg) => ({
    startTime: toLocalDateTimeInputs(seg.startAt).time,
    endTime: toLocalDateTimeInputs(seg.endAt).time,
    peopleCount: seg.peopleCount,
  }));

  return (
    <div className="space-y-6">
      {isCancelled ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive space-y-1">
          <div>
            이 예약은 <strong>취소됨</strong> 상태입니다
            {reservation.cancelledAt ? (
              <span className="text-xs ml-1">
                ({fmtDateTime(reservation.cancelledAt)} 취소)
              </span>
            ) : null}
            . 환불율 <strong>{reservation.refundRatePct}%</strong>,
            환불 금액{" "}
            <strong>{formatKRW(reservation.refundAmount)}</strong> · 매출에는{" "}
            <strong>{100 - reservation.refundRatePct}%</strong>만 반영됩니다.
          </div>
        </div>
      ) : null}

      <Card className={isCancelled ? "opacity-70" : ""}>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 flex-wrap">
              {reservation.customerName}
              {isCancelled ? (
                <Badge variant="destructive" className="text-[10px]">
                  취소됨
                </Badge>
              ) : null}
              {reservation.platform ? (
                <Badge variant="outline" className="text-[10px]">
                  {reservation.platform.name}
                </Badge>
              ) : null}
              {reservation.taxInvoice ? (
                reservation.taxInvoiceIssued ? (
                  <Badge className="text-[10px] bg-emerald-600 hover:bg-emerald-600">
                    세금계산서 발급
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-[10px] border-amber-500 text-amber-700"
                  >
                    세금계산서 미발급
                  </Badge>
                )
              ) : null}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {fmtDate(reservation.startAt)} ·{" "}
              {fmtTimeRange(reservation.startAt, reservation.endAt)} (
              {formatDurationHours(hours)})
            </p>
            <div className="flex items-center gap-1 mt-2">
              {dayHours > 0 ? (
                <Badge variant="secondary" className="text-[10px]">
                  주간 {formatDurationHours(dayHours)}
                </Badge>
              ) : null}
              {nightHours > 0 ? (
                <Badge className="text-[10px] bg-indigo-600 hover:bg-indigo-600">
                  야간 {formatDurationHours(nightHours)}
                </Badge>
              ) : null}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold">
              {formatKRW(reservation.totalAmount)}
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
              <div>인원 {peopleLabel(reservation.peopleSegments)}</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {reservation.peopleSegments.length > 0 ? (
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">시간별 인원</div>
              {reservation.peopleSegments.map((seg) => (
                <div
                  key={seg.id}
                  className="flex items-center gap-3 text-sm"
                >
                  <div className="font-mono w-32">
                    {fmtTimeRange(seg.startAt, seg.endAt)}
                  </div>
                  <div>{seg.peopleCount}명</div>
                </div>
              ))}
            </div>
          ) : null}
          {reservation.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {reservation.tags.map((t) => (
                <Badge key={t} variant="secondary">
                  {t}
                </Badge>
              ))}
            </div>
          ) : null}
          {reservation.notes ? (
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">
              {reservation.notes}
            </p>
          ) : null}
          {reservation.googleEventId ? (
            <p className="text-xs text-muted-foreground">
              Google Calendar와 동기화됨
            </p>
          ) : null}
        </CardContent>
      </Card>

      {!isCancelled ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">연장 내역</CardTitle>
            {reservation.extensions.length > 0 ? (
              <span className="text-xs text-muted-foreground font-mono">
                총 {reservation.extensions.length}회 ·{" "}
                {formatKRW(extensionsTotalAmount)}
              </span>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4">
            {reservation.extensions.length > 0 ? (
              <div className="space-y-1">
                {reservation.extensions.map((ext, idx) => {
                  const isLast = idx === reservation.extensions.length - 1;
                  return (
                    <div
                      key={ext.id}
                      className="flex items-center gap-3 text-sm py-1.5 border-b last:border-b-0"
                    >
                      <div className="font-mono text-xs w-24 shrink-0 text-muted-foreground">
                        {fmtDateTime(ext.createdAt)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div>
                          +{ext.extraHours}시간 · {ext.peopleCount}명
                        </div>
                        {ext.note ? (
                          <div className="text-xs text-muted-foreground truncate">
                            {ext.note}
                          </div>
                        ) : null}
                      </div>
                      <div className="font-mono text-sm shrink-0">
                        +{formatKRW(ext.amount)}
                      </div>
                      {isLast ? (
                        <RemoveExtensionButton
                          action={removeExtensionAction}
                          extraHours={ext.extraHours}
                          amount={ext.amount}
                        />
                      ) : (
                        <div className="w-8" />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                아직 연장된 내역이 없습니다.
              </p>
            )}
            <Separator />
            <ReservationExtensionForm
              action={addExtensionAction}
              currentEndTime={endInputs.time}
              dayHourlyRate={reservation.dayHourlyRate}
              nightHourlyRate={reservation.nightHourlyRate}
              defaultPeopleCount={lastSegmentPeople}
              minPeople={s.defaultMinPeople}
              extraPerPersonHourlyRate={s.extraPerPersonHourlyRate}
            />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">정산</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <Row label="기본 요금" value={formatKRW(baseAmount)} />
            {extraAmount > 0 ? (
              <Row label="인원 추가" value={formatKRW(extraAmount)} />
            ) : null}
            {reservation.extensions.length > 0 ? (
              <Row
                label={`연장 ${reservation.extensions.length}회`}
                value={`+ ${formatKRW(extensionsTotalAmount)}`}
              />
            ) : null}
            <Row label="공급가액" value={formatKRW(reservation.subtotalAmount)} />
            <Row label="부가세" value={formatKRW(reservation.vatAmount)} />
            <Row
              label="총 매출"
              value={formatKRW(reservation.totalAmount)}
              bold
            />
            <Row
              label="수수료"
              value={`- ${formatKRW(reservation.commissionAmount)}`}
              destructive
            />
            <Row label="실수령" value={formatKRW(netAmount)} bold success />
          </div>

          {isCancelled ? (
            <div className="rounded-md bg-muted/40 p-3 space-y-2">
              <div className="text-xs text-muted-foreground">
                취소 반영 (매출 집계용)
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <Row
                  label="환불"
                  value={`- ${formatKRW(reservation.refundAmount)}`}
                  destructive
                />
                <Row label="매출 반영 총액" value={formatKRW(keptTotal)} />
                <Row
                  label="반영 실수령"
                  value={formatKRW(keptNet)}
                  bold
                  success
                />
              </div>
            </div>
          ) : null}

          <Separator />

          <CommissionEditor
            action={commissionAction}
            currentAmount={reservation.commissionAmount}
            suggested={suggestedCommission}
            subtotal={reservation.subtotalAmount}
          />

          {reservation.platform ? (
            <p className="text-xs text-muted-foreground">
              플랫폼 {reservation.platform.name} 기본 수수료율{" "}
              {reservation.platformCommissionPct}% · 실수령은 매출 집계에서도
              이 수수료 값을 사용합니다.
            </p>
          ) : null}

          {reservation.taxInvoice ? (
            <>
              <Separator />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-sm font-medium">세금계산서</div>
                  <div className="text-xs text-muted-foreground">
                    {reservation.taxInvoiceIssued && reservation.taxInvoiceIssuedAt
                      ? `${fmtDateTime(reservation.taxInvoiceIssuedAt)}에 발급됨`
                      : "발급 후 버튼을 눌러 상태를 갱신하세요"}
                  </div>
                </div>
                <TaxInvoiceIssuedToggle
                  action={taxInvoiceIssuedAction}
                  initialIssued={reservation.taxInvoiceIssued}
                />
              </div>
            </>
          ) : null}

          {isCancelled ? (
            <>
              <Separator />
              <RefundEditor
                action={refundAction}
                currentAmount={reservation.refundAmount}
                totalAmount={reservation.totalAmount}
              />
            </>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>수정</CardTitle>
        </CardHeader>
        <CardContent>
          <ReservationForm
            action={updateAction}
            defaultDayRate={s.dayHourlyRate}
            defaultNightRate={s.nightHourlyRate}
            minPeople={s.defaultMinPeople}
            extraPerPersonHourlyRate={s.extraPerPersonHourlyRate}
            minBookingHours={s.minBookingHours}
            platforms={platforms.map((p) => ({
              id: p.id,
              name: p.name,
              commissionRatePct: p.commissionRatePct,
              taxInvoiceRequired: p.taxInvoiceRequired,
            }))}
            defaultValues={{
              customerName: reservation.customerName,
              customerPhone: reservation.customerPhone,
              customerEmail: reservation.customerEmail,
              date: startInputs.date,
              startTime: startInputs.time,
              endTime: endInputs.time,
              dayHourlyRate: reservation.dayHourlyRate,
              nightHourlyRate: reservation.nightHourlyRate,
              platformId: reservation.platformId,
              taxInvoice: reservation.taxInvoice,
              tags: reservation.tags.join(", "),
              notes: reservation.notes,
              segments: savedSegments,
            }}
            submitLabel="수정 저장"
          />
          <Separator className="my-6" />
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-muted-foreground">
              취소하면 매출 집계에서 제외됩니다. 영구 삭제는 되돌릴 수 없습니다.
            </p>
            <div className="flex items-center gap-2">
              {isCancelled ? (
                <RestoreReservationButton action={restoreAction} />
              ) : (
                <CancelReservationButton
                  action={cancelAction}
                  reservationStartAt={reservation.startAt}
                  totalAmount={reservation.totalAmount}
                />
              )}
              <DeleteReservationButton action={deleteAction} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  destructive,
  success,
}: {
  label: string;
  value: string;
  bold?: boolean;
  destructive?: boolean;
  success?: boolean;
}) {
  const valueClass = `font-mono ${bold ? "font-semibold" : ""} ${
    destructive ? "text-destructive" : success ? "text-emerald-600" : ""
  }`;
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}
