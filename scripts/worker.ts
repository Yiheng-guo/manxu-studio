import fs from "node:fs";
import path from "node:path";
import {
  cancelJob,
  applyJobProject,
  claimJob,
  dataDir,
  getJob,
  heartbeat,
  recoverJobs,
  updateJob,
} from "../src/lib/server/db";
import { generateImage, generateScript } from "../src/lib/server/providers";
import { renderMovie } from "../src/lib/server/render";
const lock = path.join(dataDir, "worker.pid");
if (fs.existsSync(lock)) {
  const pid = Number(fs.readFileSync(lock, "utf8"));
  try {
    process.kill(pid, 0);
    console.error("已有后台工作进程，请勿重复启动");
    process.exit(1);
  } catch {
    fs.unlinkSync(lock);
  }
}
fs.writeFileSync(lock, String(process.pid), { flag: "wx" });
recoverJobs();
heartbeat();
const heartbeatTimer = setInterval(heartbeat, 3000);
let stopping = false;
let active: AbortController | null = null;
function stop() {
  stopping = true;
  active?.abort();
  clearInterval(heartbeatTimer);
  try {
    fs.unlinkSync(lock);
  } catch {}
  setTimeout(() => process.exit(0), 1000).unref();
}
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
console.log("漫序后台任务已启动");
while (!stopping) {
  const next = claimJob();
  if (!next) {
    await new Promise((r) => setTimeout(r, 500));
    continue;
  }
  const { job, project } = next;
  const controller = new AbortController();
  active = controller;
  const timer = setInterval(() => {
    try {
      if (getJob(job.id).status === "cancelled") controller.abort();
    } catch {
      controller.abort();
    }
  }, 350);
  const deadline = setTimeout(
    () => controller.abort(new Error("任务超过 15 分钟，请重试")),
    900000,
  );
  const dir = path.join(dataDir, "assets", project.id);
  fs.mkdirSync(dir, { recursive: true });
  try {
    if (job.kind === "script") {
      updateJob(job.id, { progress: 15, message: "正在构思角色与故事节奏" });
      const script = await generateScript(project, controller.signal);
      controller.signal.throwIfAborted();
      applyJobProject(
        job.id,
        (p) => ({ ...p, ...script, scriptSource: "ai" }),
        "剧本与分镜已完成，请审阅后制作画面",
      );
    } else if (job.kind === "images") {
      let failed = 0;
      let done = 0;
      const missing = project.shots
        .map((s, i) => ({ s, i }))
        .filter(({ s }) => !s.imageUrl);
      for (const { s, i } of missing) {
        controller.signal.throwIfAborted();
        updateJob(job.id, {
          progress: Math.round((done / missing.length) * 90),
          message: `正在绘制第 ${i + 1} 镜，已完成的画面会保留`,
        });
        const file = `${job.id}-${i}-ai.png`;
        try {
          await generateImage(
            project,
            i,
            path.join(dir, file),
            controller.signal,
          );
          controller.signal.throwIfAborted();
          applyJobProject(job.id, (p) => ({
            ...p,
            shots: p.shots.map((x) =>
              x.id === s.id
                ? {
                    ...x,
                    imageUrl: `/api/assets/${p.id}/${file}`,
                    imageSource: "ai",
                  }
                : x,
            ),
          }));
        } catch (e) {
          if (controller.signal.aborted) throw e;
          failed++;
        }
        done++;
      }
      updateJob(job.id, {
        status:
          failed === missing.length
            ? "failed"
            : failed
              ? "partially_succeeded"
              : "succeeded",
        progress: 100,
        message: failed
          ? `${done - failed} 镜完成，${failed} 镜失败；重试只处理缺失画面`
          : "所有分镜画面已准备好",
        error: failed
          ? "部分图片生成失败，请检查图片服务配置和额度后重试"
          : null,
      });
    } else {
      const render = await renderMovie(
        project,
        dir,
        job.id,
        controller.signal,
        (progress, message) => updateJob(job.id, { progress, message }),
      );
      controller.signal.throwIfAborted();
      applyJobProject(
        job.id,
        (p) => ({ ...p, render }),
        render.hasAudio
          ? "成片已完成，包含配音和字幕"
          : "成片已完成（无配音），包含字幕",
      );
    }
  } catch (error) {
    let exists = true;
    let cancelled = false;
    try {
      cancelled = getJob(job.id).status === "cancelled";
    } catch {
      exists = false;
    }
    if (exists && !cancelled) {
      const message = stopping
        ? "服务已停止，已有素材保留，请重试"
        : controller.signal.aborted
          ? "任务处理超时，请重试"
          : error instanceof Error &&
              /模型|接口|配音|图片|第 \d|超时/.test(error.message)
            ? error.message.slice(0, 180)
            : "处理未完成，请检查模型连接或媒体配置后重试";
      updateJob(job.id, {
        status: "failed",
        message: "任务未完成",
        error: message,
      });
    } else if (exists) cancelJob(job.id);
  } finally {
    clearInterval(timer);
    clearTimeout(deadline);
    active = null;
  }
}
