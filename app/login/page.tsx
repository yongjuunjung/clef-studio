import { redirect } from "next/navigation";
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
import { createSession, isAuthenticated, verifyPassword } from "@/lib/auth";

type SearchParams = Promise<{ error?: string; next?: string }>;

async function loginAction(formData: FormData) {
  "use server";
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");
  if (!verifyPassword(password)) {
    redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
  }
  await createSession();
  redirect(next || "/");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  if (await isAuthenticated()) redirect("/");
  const { error, next } = await searchParams;

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Studio Reservation</CardTitle>
          <CardDescription>비밀번호를 입력해 주세요.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={loginAction} className="space-y-4">
            <input type="hidden" name="next" value={next ?? "/"} />
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoFocus
                required
              />
            </div>
            {error ? (
              <p className="text-sm text-destructive">
                비밀번호가 올바르지 않습니다.
              </p>
            ) : null}
            <Button type="submit" className="w-full">
              로그인
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
