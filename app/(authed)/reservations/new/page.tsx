import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ReservationForm } from "@/components/reservation-form";
import { createReservation } from "@/lib/reservations";
import { listPlatforms } from "@/lib/platforms";
import { getSettings } from "@/lib/settings";
import { minutesToTimeStr } from "@/lib/tz";

type SearchParams = Promise<{ date?: string }>;

export default async function NewReservationPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [s, platforms] = await Promise.all([getSettings(), listPlatforms()]);
  const { date } = await searchParams;
  const defaultDate = date ?? format(new Date(), "yyyy-MM-dd");
  const endTime = minutesToTimeStr(10 * 60 + s.minBookingHours * 60);

  return (
    <Card>
      <CardHeader>
        <CardTitle>새 예약</CardTitle>
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
          defaultValues={{
            date: defaultDate,
            startTime: "10:00",
            endTime,
            dayHourlyRate: s.dayHourlyRate,
            nightHourlyRate: s.nightHourlyRate,
          }}
          submitLabel="예약 생성"
        />
      </CardContent>
    </Card>
  );
}
