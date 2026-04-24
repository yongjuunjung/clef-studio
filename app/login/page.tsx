import { redirect } from "next/navigation";
import { AlertCircle, ArrowRight } from "lucide-react";
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

const chromeTextStyle: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(to bottom, #e8e6e0 0%, #ffffff 18%, #d4d2cc 42%, #8a8880 56%, #d8d6d0 78%, #a8a6a0 100%)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
  WebkitTextStroke: "1px rgba(120, 115, 105, 0.15)",
  filter:
    "drop-shadow(0 6px 10px rgba(90, 85, 75, 0.18)) drop-shadow(0 2px 3px rgba(90, 85, 75, 0.12))",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  if (await isAuthenticated()) redirect("/");
  const { error, next } = await searchParams;

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-[#efeadd] text-zinc-900">
      {/* Background: warm silver light + soft vignette */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#f5f0e3] via-[#e8e2d3] to-[#dcd5c4]" />
        {/* Top specular highlight */}
        <div className="absolute inset-x-0 top-0 h-2/3 bg-gradient-to-b from-white/50 via-white/10 to-transparent" />
        {/* Soft side highlight */}
        <div className="absolute -left-1/3 top-1/4 h-[40rem] w-[40rem] rounded-full bg-white/40 blur-3xl" />
        <div className="absolute -right-1/4 bottom-0 h-[30rem] w-[30rem] rounded-full bg-[#d9c9a5]/40 blur-3xl" />
        {/* Subtle grain via dot pattern */}
        <div
          className="absolute inset-0 opacity-[0.08] mix-blend-multiply"
          style={{
            backgroundImage:
              "radial-gradient(circle, #6b6354 0.5px, transparent 0.5px)",
            backgroundSize: "3px 3px",
          }}
        />
      </div>

      <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-10">
        {/* CLEF wordmark */}
        <div className="mb-10 flex flex-col items-center">
          <h1
            className="text-[5rem] leading-none font-black tracking-tight sm:text-[7rem]"
            style={chromeTextStyle}
          >
            CLEF
          </h1>
          <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.5em] text-zinc-600 sm:text-xs">
            Studio
          </p>
        </div>

        {/* Login card */}
        <div className="w-full max-w-sm">
          <div className="rounded-2xl border border-white/70 bg-white/60 p-6 shadow-[0_20px_60px_-20px_rgba(90,85,75,0.25),0_8px_24px_-12px_rgba(90,85,75,0.15)] backdrop-blur-xl sm:p-8">
            <form action={loginAction} className="space-y-5">
              <input type="hidden" name="next" value={next ?? "/"} />
              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-700"
                >
                  비밀번호
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoFocus
                  required
                  placeholder="••••••••"
                  className="h-12 rounded-xl border-zinc-300/70 bg-white/80 text-zinc-900 placeholder:text-zinc-400 focus-visible:border-zinc-500 focus-visible:ring-zinc-400/20"
                />
              </div>

              {error ? (
                <div className="flex items-start gap-2 rounded-xl border border-rose-300/60 bg-rose-100/60 px-3 py-2.5 text-sm text-rose-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>비밀번호가 올바르지 않습니다</span>
                </div>
              ) : null}

              <Button
                type="submit"
                className="group h-12 w-full rounded-xl border border-zinc-800 bg-zinc-900 font-medium text-zinc-50 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.35)] hover:bg-zinc-800 hover:shadow-[0_10px_28px_-8px_rgba(0,0,0,0.4)] transition-all"
              >
                로그인
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </form>
          </div>

          <p className="mt-8 text-center text-[11px] tracking-wider text-zinc-500">
            © 2026 CLEF STUDIO
          </p>
        </div>
      </div>
    </main>
  );
}
