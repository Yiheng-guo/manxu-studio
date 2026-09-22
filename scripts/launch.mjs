import { spawn } from "node:child_process";
import { loadEnvFile } from "node:process";
try {
  loadEnvFile(".env.local");
} catch {}
const mode = process.argv[2] || "dev";
const env = { ...process.env, PORT: process.env.PORT || "3210" };
const children = [
  spawn(process.execPath, ["--import", "tsx", "scripts/worker.ts"], {
    env,
    stdio: "inherit",
  }),
  spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      mode,
      "--hostname",
      "127.0.0.1",
      "--port",
      env.PORT,
    ],
    { env, stdio: "inherit" },
  ),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const p of children) p.kill("SIGTERM");
  setTimeout(() => process.exit(code), 800).unref();
}
children.forEach((p) => p.on("exit", (code) => stop(code || 0)));
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
