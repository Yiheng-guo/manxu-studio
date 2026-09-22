import { z } from "zod";
export const styles = ["电影日漫", "清新水彩", "国风水墨", "赛博都市"] as const;
export const imageUrlSchema = z
  .string()
  .max(250)
  .refine(
    (v) =>
      v === "" ||
      /^\/demo\/[a-z0-9-]+\.png$/.test(v) ||
      /^\/api\/assets\/[a-f0-9-]{36}\/[a-zA-Z0-9_.-]+\.(png|jpg|webp)$/.test(v),
    "仅允许项目内图片",
  );
export const characterSchema = z.object({
  id: z.string().max(60),
  name: z.string().min(1).max(40),
  description: z.string().max(600),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});
export const shotSchema = z.object({
  id: z.string().max(60),
  title: z.string().min(1).max(80),
  description: z.string().max(1400),
  narration: z.string().max(160),
  imagePrompt: z.string().max(2000),
  duration: z.number().min(2).max(30),
  camera: z.enum(["缓慢推进", "缓慢拉远", "固定镜头"]),
  imageUrl: imageUrlSchema,
  imageSource: z.enum(["none", "demo", "upload", "ai"]).default("none"),
});
export const projectInputSchema = z.object({
  title: z.string().trim().min(1).max(60),
  idea: z.string().trim().max(6000),
  style: z.enum(styles),
  ratio: z.enum(["16:9", "9:16"]),
  characters: z.array(characterSchema).max(8),
  shots: z.array(shotSchema).max(12),
});
export const projectSchema = projectInputSchema.extend({
  id: z.string().uuid(),
  revision: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
  scriptSource: z.enum(["manual", "demo", "ai"]),
  render: z
    .object({
      videoUrl: z.string(),
      srtUrl: z.string(),
      duration: z.number(),
      hasAudio: z.boolean(),
      revision: z.number(),
      createdAt: z.string(),
    })
    .nullable(),
});
export type Project = z.infer<typeof projectSchema>;
export type ProjectInput = z.infer<typeof projectInputSchema>;
export type Shot = z.infer<typeof shotSchema>;
export type Character = z.infer<typeof characterSchema>;
export const jobKindSchema = z.enum(["script", "images", "render"]);
export const jobSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  kind: jobKindSchema,
  status: z.enum([
    "queued",
    "running",
    "succeeded",
    "partially_succeeded",
    "failed",
    "cancelled",
  ]),
  progress: z.number(),
  message: z.string(),
  error: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Job = z.infer<typeof jobSchema>;
export type JobKind = z.infer<typeof jobKindSchema>;
export const activeJob = (job: Job | null | undefined) =>
  !!job && ["queued", "running"].includes(job.status);
export const settingsSchema = z.object({
  scriptProvider: z.string(),
  scriptReady: z.boolean(),
  imageReady: z.boolean(),
  voiceProvider: z.string(),
  voiceReady: z.boolean(),
  ffmpegReady: z.boolean(),
  workerReady: z.boolean(),
  localOnly: z.boolean(),
});
export type Settings = z.infer<typeof settingsSchema>;
export const generatedScriptSchema = z.object({
  title: z.string().min(1).max(60),
  characters: z
    .array(characterSchema.omit({ id: true }))
    .min(1)
    .max(4),
  shots: z
    .array(shotSchema.omit({ id: true, imageUrl: true, imageSource: true }))
    .min(3)
    .max(8),
});
export const projectPatchSchema = projectInputSchema.extend({
  revision: z.number().int().min(0),
});
export function parseModelJson(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/, "")
    .replace(/\s*```$/, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{"),
      end = cleaned.lastIndexOf("}");
    if (start < 0 || end < start) throw new Error("模型没有返回有效 JSON");
    return JSON.parse(cleaned.slice(start, end + 1));
  }
}
export function srtTime(seconds: number) {
  const ms = Math.round(seconds * 1000);
  return `${String(Math.floor(ms / 3600000)).padStart(2, "0")}:${String(Math.floor(ms / 60000) % 60).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")},${String(ms % 1000).padStart(3, "0")}`;
}
