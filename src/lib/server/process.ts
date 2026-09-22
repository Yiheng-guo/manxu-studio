import { spawn } from "node:child_process";
export async function runProcess(
  command: string,
  args: string[],
  options: { signal?: AbortSignal; timeout?: number; maxBytes?: number } = {},
) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      signal: options.signal,
      env: { ...process.env, PI_OFFLINE: "1" },
    });
    let stdout = "",
      stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("处理超时，请稍后重试"));
    }, options.timeout || 120000);
    child.stdout.on("data", (d) => {
      stdout += d.toString();
      if (stdout.length > (options.maxBytes || 2000000)) {
        child.kill();
        reject(new Error("输出超过限制"));
      }
    });
    child.stderr.on("data", (d) => {
      stderr = (stderr + d.toString()).slice(-16000);
    });
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`子进程未完成 (${code})`));
    });
  });
}
