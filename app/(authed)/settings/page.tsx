import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { PlatformBadge } from "@/components/platform-badge";
import { Separator } from "@/components/ui/separator";
import { disconnectGoogle } from "@/lib/google-calendar";
import {
  createPlatform,
  deletePlatform,
  listPlatforms,
} from "@/lib/platforms";
import { getSettings, updateSettings } from "@/lib/settings";

type SearchParams = Promise<{ google?: string; google_error?: string }>;

async function savePricingAction(formData: FormData) {
  "use server";
  const dayRate = Number(formData.get("dayHourlyRate"));
  const nightRate = Number(formData.get("nightHourlyRate"));
  const minPeople = Number(formData.get("defaultMinPeople"));
  const extraRate = Number(formData.get("extraPerPersonHourlyRate"));
  const minHours = Number(formData.get("minBookingHours"));
  if (!Number.isFinite(dayRate) || dayRate < 0) {
    throw new Error("주간 시간당 요금이 올바르지 않습니다");
  }
  if (!Number.isFinite(nightRate) || nightRate < 0) {
    throw new Error("야간 시간당 요금이 올바르지 않습니다");
  }
  if (!Number.isFinite(minPeople) || minPeople < 1) {
    throw new Error("최소 인원은 1 이상이어야 합니다");
  }
  if (!Number.isFinite(extraRate) || extraRate < 0) {
    throw new Error("초과 1인 시간당 요금이 올바르지 않습니다");
  }
  if (!Number.isFinite(minHours) || minHours < 1) {
    throw new Error("최소 예약 시간은 1 이상이어야 합니다");
  }
  await updateSettings({
    dayHourlyRate: Math.round(dayRate),
    nightHourlyRate: Math.round(nightRate),
    defaultMinPeople: Math.round(minPeople),
    extraPerPersonHourlyRate: Math.round(extraRate),
    minBookingHours: Math.round(minHours),
  });
  revalidatePath("/settings");
  redirect("/settings?saved=1");
}

async function disconnectAction() {
  "use server";
  await disconnectGoogle();
  revalidatePath("/settings");
  redirect("/settings");
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { google, google_error } = await searchParams;
  const [s, platforms] = await Promise.all([getSettings(), listPlatforms()]);
  const hasGoogleCreds = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>요금 설정</CardTitle>
          <CardDescription>
            예약 생성 시 기본값으로 사용되고, 인원 수에 따른 추가 금액이 자동 계산됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={savePricingAction} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dayHourlyRate">주간 시간당 요금 (원)</Label>
                <MoneyInput
                  id="dayHourlyRate"
                  name="dayHourlyRate"
                  defaultValue={s.dayHourlyRate}
                />
                <p className="text-xs text-muted-foreground">06:00 ~ 18:00</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nightHourlyRate">야간 시간당 요금 (원)</Label>
                <MoneyInput
                  id="nightHourlyRate"
                  name="nightHourlyRate"
                  defaultValue={s.nightHourlyRate}
                />
                <p className="text-xs text-muted-foreground">18:00 ~ 06:00</p>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minBookingHours">최소 예약 시간 (시간)</Label>
                <Input
                  id="minBookingHours"
                  name="minBookingHours"
                  type="number"
                  min={1}
                  max={24}
                  defaultValue={s.minBookingHours}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultMinPeople">기본 포함 인원 수</Label>
                <Input
                  id="defaultMinPeople"
                  name="defaultMinPeople"
                  type="number"
                  min={1}
                  defaultValue={s.defaultMinPeople}
                />
                <p className="text-xs text-muted-foreground">
                  이 인원까지는 추가 요금 없이 포함
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="extraPerPersonHourlyRate">
                  초과 1인 시간당 요금 (원)
                </Label>
                <MoneyInput
                  id="extraPerPersonHourlyRate"
                  name="extraPerPersonHourlyRate"
                  defaultValue={s.extraPerPersonHourlyRate}
                />
                <p className="text-xs text-muted-foreground">
                  예: 5,000 → 30분이면 2,500원
                </p>
              </div>
            </div>
            <Button type="submit">저장</Button>
          </form>
        </CardContent>
      </Card>

      <Card id="platforms">
        <CardHeader>
          <CardTitle>플랫폼</CardTitle>
          <CardDescription>
            예약 생성 시 선택한 플랫폼의 <strong>가격 가산 %</strong>가 기본/인원 요금에
            적용되고, <strong>수수료 %</strong>는 실수령액 계산용으로 기록됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {platforms.length > 0 ? (
            <div className="border rounded-md divide-y">
              {platforms.map((p) => {
                const deleteAction = deletePlatform.bind(null, p.id);
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1 truncate">
                      <PlatformBadge name={p.name} className="text-xs" />
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      수수료 {p.commissionRatePct}%
                    </Badge>
                    <Badge
                      variant={p.taxInvoiceRequired ? "default" : "secondary"}
                      className="text-[10px]"
                    >
                      세금계산서 {p.taxInvoiceRequired ? "필수" : "선택"}
                    </Badge>
                    <form action={deleteAction}>
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        aria-label={`${p.name} 삭제`}
                      >
                        ×
                      </Button>
                    </form>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              등록된 플랫폼이 없습니다.
            </p>
          )}
          <Separator />
          <form
            action={createPlatform}
            className="grid grid-cols-2 md:grid-cols-[1fr_auto_auto_auto] gap-3 items-end"
          >
            <div className="space-y-2 col-span-2 md:col-span-1">
              <Label htmlFor="platformName">플랫폼 이름</Label>
              <Input id="platformName" name="name" required maxLength={100} />
            </div>
            <div className="space-y-2 md:w-32">
              <Label htmlFor="commissionRatePct">수수료 %</Label>
              <Input
                id="commissionRatePct"
                name="commissionRatePct"
                type="number"
                min={0}
                max={100}
                step="0.001"
                defaultValue={0}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>세금계산서</Label>
              <label className="flex items-center gap-2 h-9">
                <input
                  type="checkbox"
                  name="taxInvoiceRequired"
                  className="h-4 w-4"
                />
                <span className="text-sm">필수</span>
              </label>
            </div>
            <Button type="submit" className="col-span-2 md:col-span-1">
              추가
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Google Calendar 연동</CardTitle>
          <CardDescription>
            예약 생성/수정/삭제 시 연결된 캘린더에 이벤트가 동기화됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {google === "connected" ? (
            <p className="text-sm text-emerald-600">연동되었습니다.</p>
          ) : null}
          {google_error ? (
            <p className="text-sm text-destructive">오류: {google_error}</p>
          ) : null}

          {!hasGoogleCreds ? (
            <p className="text-sm text-muted-foreground">
              <code>.env.local</code>에 <code>GOOGLE_CLIENT_ID</code>,{" "}
              <code>GOOGLE_CLIENT_SECRET</code>을 설정해야 연동할 수 있습니다.
            </p>
          ) : s.googleRefreshToken ? (
            <div className="space-y-3">
              <div className="text-sm">
                <div className="text-muted-foreground text-xs">연결된 계정</div>
                <div className="font-mono">{s.googleConnectedEmail ?? "(알 수 없음)"}</div>
              </div>
              <Separator />
              <form action={disconnectAction}>
                <Button variant="outline" type="submit">
                  연결 해제
                </Button>
              </form>
            </div>
          ) : (
            <a href="/api/google/connect">
              <Button>Google 계정 연결</Button>
            </a>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
