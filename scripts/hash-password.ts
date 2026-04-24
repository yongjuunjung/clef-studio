import { scryptSync, randomBytes } from "node:crypto";

const password = process.argv[2];
if (!password) {
  console.error("Usage: pnpm tsx scripts/hash-password.ts <password>");
  process.exit(1);
}

const salt = randomBytes(16).toString("hex");
const hash = scryptSync(password, salt, 64).toString("hex");
const encoded = `${salt}:${hash}`;

console.log("\nAUTH_PASSWORD_HASH=" + encoded + "\n");
console.log("위 값을 .env.local 의 AUTH_PASSWORD_HASH 에 붙여넣으세요.\n");
