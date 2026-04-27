import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ReservationForm } from "@/components/reservation-form";
import {
  createReservation,
  getAllTags,
  getReservation,
} from "@/lib/reservations";
import { listPlatforms } from "@/lib/platforms";
import { getSettings } from "@/lib/settings";
import { minutesToTimeStr, toLocalDateTimeInputs } from "@/lib/tz";

type SearchParams = Promise<{ date?: string; copyFrom?: string }>;

export default async function NewReservationPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [s, platforms, knownTags] = await Promise.all([
    getSettings(),
    listPlatforms(),
    getAllTags(),
  ]);
  const { date, copyFrom } = await searchParams;
  const copyId = copyFrom ? Number(copyFrom) : NaN;
  const source = Number.isFinite(copyId) ? await getReservation(copyId) : null;

  const today = format(new Date(), "yyyy-MM-dd");
  const defaultDate = date ?? today;

  const defaultValues = source
    ? {
        customerName: source.customerName,
        customerPhone: source.customerPhone,
        customerEmail: source.customerEmail,
        date: defaultDate,
        startTime: toLocalDateTimeInputs(source.startAt).time,
        endTime: toLocalDateTimeInputs(source.endAt).time,
        dayHourlyRate: source.dayHourlyRate,
        nightHourlyRate: source.nightHourlyRate,
        platformId: source.platformId,
        taxInvoice: source.taxInvoice,
        tags: source.tags.join(", "),
        notes: source.notes,
        segments: source.peopleSegments.map((seg) => ({
          startTime: toLocalDateTimeInputs(seg.startAt).time,
          endTime: toLocalDateTimeInputs(seg.endAt).time,
          peopleCount: seg.peopleCount,
        })),
      }
    : {
        date: defaultDate,
        startTime: "10:00",
        endTime: minutesToTimeStr(10 * 60 + s.minBookingHours * 60),
        dayHourlyRate: s.dayHourlyRate,
        nightHourlyRate: s.nightHourlyRate,
      };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{source ? "새 예약 (복사)" : "새 예약"}</CardTitle>
      </CardHeader>
      <CardContent>
        <ReservationForm
          action={createReservation}
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
          knownTags={knownTags}
          defaultValues={defaultValues}
          submitLabel="예약 생성"
        />
      </CardContent>
    </Card>
  );
}
