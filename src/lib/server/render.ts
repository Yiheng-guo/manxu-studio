import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { type Project, srtTime } from "../schema";
import { assetPath, ffmpegPath, synthesize } from "./providers";
import { runProcess } from "./process";
const escapeXml = (s: string) =>
  s.replace(
    /[<>&"']/g,
    (c) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
export function subtitleSvg(text: string, width: number, height: number) {
  const limit = width > height ? 28 : 15;
  const chars = Array.from(text);
  const lines: string[] = [];
  for (let i = 0; i < chars.length; i += limit)
    lines.push(chars.slice(i, i + limit).join(""));
  const font = width > height ? 30 : 34;
  const lineHeight = font * 1.5;
  const bottom = height > width ? 160 : 64;
  const top = height - bottom - lines.length * lineHeight;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".75"/></linearGradient></defs><rect x="0" y="${top - 60}" width="${width}" height="${height - top + 60}" fill="url(#g)"/>${lines.map((line, i) => `<text x="${width / 2}" y="${top + (i + 1) * lineHeight}" text-anchor="middle" fill="white" font-size="${font}" font-family="PingFang SC, Noto Sans CJK SC, Microsoft YaHei, sans-serif" font-weight="600">${escapeXml(line)}</text>`).join("")}</svg>`;
}
export async function renderMovie(
  project: Project,
  dir: string,
  jobId: string,
  signal: AbortSignal,
  progress: (n: number, message: string) => void,
) {
  const landscape = project.ratio === "16:9";
  const w = landscape ? 1280 : 720,
    h = landscape ? 720 : 1280;
  const segments: string[] = [];
  const subtitles: string[] = [];
  let total = 0;
  let audioCount = 0;
  for (let i = 0; i < project.shots.length; i++) {
    signal.throwIfAborted();
    const shot = project.shots[i];
    if (!shot.imageUrl)
      throw new Error(`第 ${i + 1} 镜缺少画面，请先上传或生成`);
    progress(
      5 + Math.round((i / project.shots.length) * 85),
      `正在制作第 ${i + 1} / ${project.shots.length} 镜：${shot.title}`,
    );
    const prefix = path.join(dir, `${jobId}-${i}`);
    const frame = prefix + ".png",
      overlay = prefix + "-caption.png",
      audio = prefix + ".aiff",
      segment = prefix + ".mp4";
    await sharp(assetPath(shot.imageUrl))
      .resize(w * 2, h * 2, { fit: "cover" })
      .png()
      .toFile(frame);
    await sharp(Buffer.from(subtitleSvg(shot.narration, w, h)))
      .png()
      .toFile(overlay);
    const hasAudio = await synthesize(shot.narration, audio, signal);
    let duration = shot.duration;
    if (hasAudio) {
      audioCount++;
      const probe = await runProcess(
        ffmpegPath,
        ["-hide_banner", "-i", audio, "-f", "null", "-"],
        { signal },
      );
      const match = probe.stderr.match(/Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/);
      if (!match) throw new Error("无法读取配音时长");
      duration = Math.max(
        duration,
        Number(match[1]) * 3600 +
          Number(match[2]) * 60 +
          Number(match[3]) +
          0.4,
      );
    }
    const frames = Math.ceil(duration * 24);
    const zoom =
      shot.camera === "缓慢推进"
        ? `1+0.10*on/${frames}`
        : shot.camera === "缓慢拉远"
          ? `1.10-0.10*on/${frames}`
          : "1";
    const args = [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-loop",
      "1",
      "-i",
      frame,
      "-loop",
      "1",
      "-i",
      overlay,
      ...(hasAudio
        ? ["-i", audio]
        : ["-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo"]),
      "-filter_complex",
      `[0:v]zoompan=z='${zoom}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s=${w}x${h}:fps=24,setsar=1[scene];[scene][1:v]overlay=0:0:shortest=1,format=yuv420p[v]`,
      "-map",
      "[v]",
      "-map",
      "2:a",
      "-af",
      "apad",
      "-t",
      String(duration),
      "-r",
      "24",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "22",
      "-threads",
      "2",
      "-c:a",
      "aac",
      "-ar",
      "44100",
      "-ac",
      "2",
      "-b:a",
      "128k",
      "-movflags",
      "+faststart",
      segment,
    ];
    await runProcess(ffmpegPath, args, { signal, timeout: 180000 });
    segments.push(segment);
    if (shot.narration.trim())
      subtitles.push(
        `${subtitles.length + 1}\n${srtTime(total)} --> ${srtTime(total + duration)}\n${shot.narration}\n`,
      );
    total += duration;
    await Promise.all([
      fs.unlink(frame),
      fs.unlink(overlay),
      ...(hasAudio ? [fs.unlink(audio)] : []),
    ]);
  }
  progress(94, "正在合并镜头与封装成片");
  const manifest = path.join(dir, jobId + "-concat.txt");
  await fs.writeFile(
    manifest,
    segments.map((f) => `file '${path.basename(f)}'`).join("\n"),
  );
  const videoName = jobId + "-film.mp4",
    srtName = jobId + "-subtitles.srt";
  await runProcess(
    ffmpegPath,
    [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-f",
      "concat",
      "-safe",
      "1",
      "-i",
      manifest,
      "-c",
      "copy",
      "-movflags",
      "+faststart",
      path.join(dir, videoName),
    ],
    { signal, timeout: 90000 },
  );
  await fs.writeFile(path.join(dir, srtName), subtitles.join("\n"));
  await Promise.all([
    ...segments.map((f) => fs.unlink(f)),
    fs.unlink(manifest),
  ]);
  return {
    videoUrl: `/api/assets/${project.id}/${videoName}`,
    srtUrl: `/api/assets/${project.id}/${srtName}`,
    duration: total,
    hasAudio: audioCount > 0,
    revision: project.revision,
    createdAt: new Date().toISOString(),
  };
}
