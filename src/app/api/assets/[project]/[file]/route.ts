import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { AppError, dataDir, getProject } from "@/lib/server/db";
import { failure } from "@/lib/server/http";
export async function GET(
  req: Request,
  ctx: { params: Promise<{ project: string; file: string }> },
) {
  try {
    const { project, file } = await ctx.params;
    if (
      !/^[a-f0-9-]{36}$/.test(project) ||
      !/^[-\w]+\.(png|jpg|webp|mp4|srt)$/.test(file)
    )
      throw new AppError(404, "NOT_FOUND", "文件不存在");
    getProject(project);
    const target = path.join(dataDir, "assets", project, file);
    if (!fs.existsSync(target))
      throw new AppError(404, "NOT_FOUND", "文件不存在");
    const size = fs.statSync(target).size;
    const types: Record<string, string> = {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".webp": "image/webp",
      ".mp4": "video/mp4",
      ".srt": "application/x-subrip; charset=utf-8",
    };
    const headers: Record<string, string> = {
      "Content-Type": types[path.extname(file)],
      "Accept-Ranges": "bytes",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=3600",
    };
    if (new URL(req.url).searchParams.has("download"))
      headers["Content-Disposition"] = `attachment; filename="${file}"`;
    let start = 0,
      end = size - 1,
      status = 200;
    const range = req.headers.get("range");
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match || (!match[1] && !match[2]))
        return new Response(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${size}` },
        });
      if (!match[1]) start = Math.max(0, size - Number(match[2]));
      else {
        start = Number(match[1]);
        if (match[2]) end = Math.min(size - 1, Number(match[2]));
      }
      if (start >= size || end < start)
        return new Response(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${size}` },
        });
      status = 206;
      headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
    }
    headers["Content-Length"] = String(end - start + 1);
    const stream = Readable.toWeb(fs.createReadStream(target, { start, end }));
    return new Response(stream as ReadableStream, { status, headers });
  } catch (e) {
    return failure(e);
  }
}
