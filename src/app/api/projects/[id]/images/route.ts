import { NextResponse } from "next/server";
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { AppError, changeProject, dataDir, getProject } from "@/lib/server/db";
import { failure, guard } from "@/lib/server/http";
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    guard(req);
    const { id } = await ctx.params;
    const p = getProject(id);
    const form = await req.formData();
    const shotId = form.get("shotId");
    if (!p.shots.some((s) => s.id === shotId))
      throw new AppError(404, "NOT_FOUND", "分镜不存在");
    const file = form.get("file");
    if (
      !(file instanceof File) ||
      file.size > 10 * 1024 * 1024 ||
      file.size === 0
    )
      throw new AppError(
        400,
        "INVALID_FILE",
        "请选择 10 MB 以内的 PNG、JPG 或 WebP 图片",
      );
    const input = Buffer.from(await file.arrayBuffer());
    let output: Buffer;
    try {
      const img = sharp(input, { limitInputPixels: 30_000_000 });
      const meta = await img.metadata();
      if (!["png", "jpeg", "webp"].includes(meta.format || ""))
        throw new Error();
      output = await img
        .rotate()
        .resize(1920, 1920, { fit: "inside", withoutEnlargement: true })
        .png()
        .toBuffer();
    } catch {
      throw new AppError(
        400,
        "INVALID_IMAGE",
        "图片无法读取，请上传有效的 PNG、JPG 或 WebP",
      );
    }
    const dir = path.join(dataDir, "assets", id);
    await fs.mkdir(dir, { recursive: true });
    const name = randomUUID() + ".png";
    await fs.writeFile(path.join(dir, name), output);
    const result = changeProject(
      id,
      (project) => ({
        ...project,
        shots: project.shots.map((s) =>
          s.id === shotId
            ? {
                ...s,
                imageUrl: `/api/assets/${id}/${name}`,
                imageSource: "upload",
              }
            : s,
        ),
      }),
      Number(form.get("revision")),
    );
    return NextResponse.json(result);
  } catch (e) {
    return failure(e);
  }
}
