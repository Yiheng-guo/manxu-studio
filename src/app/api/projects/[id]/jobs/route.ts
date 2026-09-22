import { NextResponse } from "next/server";
import {
  AppError,
  enqueue,
  getProject,
  workerReady,
  findJobByKey,
} from "@/lib/server/db";
import { failure, guard, jsonBody } from "@/lib/server/http";
import { getSettings } from "@/lib/server/providers";
import { jobKindSchema } from "@/lib/schema";
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    guard(req);
    const { id } = await ctx.params;
    const { kind } = await jsonBody(req);
    const valid = jobKindSchema.parse(kind);
    const key = req.headers.get("idempotency-key");
    if (!key || key.length > 100)
      throw new AppError(400, "KEY_REQUIRED", "缺少有效请求标识");
    const p = getProject(id);
    const existing = findJobByKey(id, valid, key);
    if (existing) return NextResponse.json(existing, { status: 202 });
    const settings = getSettings();
    if (!workerReady())
      throw new AppError(
        503,
        "WORKER_OFFLINE",
        "后台任务未启动，请使用 npm run dev 或 npm start 启动完整服务",
      );
    if (valid === "script" && (!settings.scriptReady || !p.idea.trim()))
      throw new AppError(
        400,
        "SCRIPT_NOT_READY",
        !p.idea.trim() ? "请先填写故事创意" : "请先配置剧本模型",
      );
    if (
      valid === "images" &&
      (!settings.imageReady ||
        !p.shots.length ||
        p.shots.every((s) => s.imageUrl))
    )
      throw new AppError(
        400,
        "IMAGE_NOT_READY",
        !settings.imageReady
          ? "请先配置图片服务，或逐镜上传画面"
          : "没有待生成的分镜画面",
      );
    if (
      valid === "render" &&
      (!p.shots.length || p.shots.some((s) => !s.imageUrl))
    )
      throw new AppError(400, "MISSING_IMAGES", "请先为每个分镜准备画面");
    if (valid === "render" && !settings.ffmpegReady)
      throw new AppError(
        503,
        "FFMPEG_MISSING",
        "未找到 FFmpeg，请检查安装或 FFMPEG_PATH",
      );
    return NextResponse.json(enqueue(id, valid, key), { status: 202 });
  } catch (e) {
    return failure(e);
  }
}
