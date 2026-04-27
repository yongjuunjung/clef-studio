import { spawnSync } from "node:child_process";

/**
 * Vercel 프로덕션 빌드에서만 drizzle 마이그레이션을 자동 실행한다.
 * - VERCEL_ENV=production 일 때만 동작
 * - 미설정(로컬) 또는 preview 빌드에서는 건너뜀
 * - DATABASE_URL이 없으면 안전하게 건너뜀
 */
const env = process.env.VERCEL_ENV;

if (env !== "production") {
  console.log(
    `[db:migrate] skipped (VERCEL_ENV=${env ?? "unset"} — only runs on production)`,
  );
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.log("[db:migrate] skipped (DATABASE_URL not set)");
  process.exit(0);
}

console.log("[db:migrate] running drizzle-kit migrate (production deploy)");
const result = spawnSync(
  process.execPath,
  ["./node_modules/drizzle-kit/bin.cjs", "migrate"],
  { stdio: "inherit" },
);

if (result.error) {
  console.error("[db:migrate] failed to spawn drizzle-kit", result.error);
  process.exit(1);
}

process.exit(result.status ?? 0);
