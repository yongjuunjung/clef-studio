import { redirect } from "next/navigation";
import { AlertCircle, ArrowRight, Lock, Music2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <main className="relative min-h-screen w-full overflow-hidden bg-zinc-950 text-white">
      {/* Background layers */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-zinc-950 via-slate-900 to-zinc-950" />
      <div className="pointer-events-none absolute -top-40 -left-40 h-[32rem] w-[32rem] rounded-full bg-indigo-600 opacity-30 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-40 h-[34rem] w-[34rem] rounded-full bg-violet-600 opacity-25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 left-1/4 h-[24rem] w-[24rem] rounded-full bg-fuchsia-500 opacity-20 blur-3xl" />

      <div className="relative flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Brand */}
          <div className="mb-10 flex flex-col items-center text-center">
            <div className="relative mb-5">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 opacity-60 blur-xl" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 shadow-lg shadow-indigo-500/40 ring-1 ring-white/10">
                <Music2 className="h-8 w-8 text-white" strokeWidth={2.5} />
              </div>
            </div>
            <h1 className="bg-gradient-to-br from-white to-indigo-200 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
              Clef Studio
            </h1>
            <p className="mt-2 text-sm text-zinc-400">스튜디오 예약 관리자</p>
          </div>

          {/* Glass card */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-8">
            <form action={loginAction} className="space-y-5">
              <input type="hidden" name="next" value={next ?? "/"} />
              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-sm font-medium text-zinc-200"
                >
                  비밀번호
                </Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoFocus
                    required
                    placeholder="••••••••"
                    className="h-12 border-white/10 bg-white/5 pl-10 text-white placeholder:text-zinc-600 focus-visible:border-indigo-400/50 focus-visible:ring-indigo-400/30"
                  />
                </div>
              </div>

              {error ? (
                <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-300">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>비밀번호가 올바르지 않습니다</span>
                </div>
              ) : null}

              <Button
                type="submit"
                className="group h-12 w-full border-0 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 font-medium text-white shadow-lg shadow-indigo-500/40 hover:opacity-90"
              >
                로그인
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </form>
          </div>

          <p className="mt-8 text-center text-xs text-zinc-500">
            © 2026 Clef Studio
          </p>
        </div>
      </div>
    </main>
  );
}
