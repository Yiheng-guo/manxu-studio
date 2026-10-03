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
export const shotContinuitySchema = z.object({
  characters: z.string().max(600).default(""),
  props: z.string().max(600).default(""),
  entryState: z.string().max(1000).default(""),
  exitState: z.string().max(1000).default(""),
  dialogue: z.string().max(600).default(""),
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
  continuity: shotContinuitySchema.optional(),
});
export const renderTimelineEntrySchema = z
  .object({
    shotId: z.string().max(120),
    start: z.number().min(0, "合成时间起点不能小于零"),
    end: z.number().gt(0, "合成时间终点必须大于零"),
  })
  .refine((entry) => entry.end > entry.start, {
    message: "合成时间终点必须晚于起点",
    path: ["end"],
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
      timeline: z.array(renderTimelineEntrySchema).max(12).optional(),
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

const recordTextSchema = z
  .string()
  .max(6000, "单个字段不能超过 6000 字")
  .default("");
const nullableCountSchema = z
  .number({ error: "次数与 Token 数需填写数字，未知时请留空" })
  .int("次数与 Token 数必须是整数")
  .min(0, "次数与 Token 数不能小于零")
  .nullable()
  .default(null);
export const workRecordEvidenceSchema = z.object({
  label: recordTextSchema,
  url: z
    .string()
    .trim()
    .max(2048, "证据链接过长")
    .refine((value) => {
      if (value === "") return true;
      try {
        const url = new URL(value);
        return ["http:", "https:"].includes(url.protocol);
      } catch {
        return false;
      }
    }, "证据链接必须是 HTTP 或 HTTPS 地址")
    .default(""),
  note: recordTextSchema,
});
export const workRecordEvaluationSchema = z.object({
  caseId: recordTextSchema,
  model: recordTextSchema,
  promptVersion: recordTextSchema,
  completion: z
    .enum(["pass", "fail", "unknown"], { error: "请选择通过、失败或待判定" })
    .default("unknown"),
  score: z
    .number({ error: "评分需填写数字，未知时请留空" })
    .min(0, "评分不能小于零")
    .max(5, "评分不能超过 5 分")
    .nullable()
    .default(null),
  factualErrors: nullableCountSchema,
  interventions: nullableCountSchema,
  latencyMs: z
    .number({ error: "耗时需填写数字，未知时请留空" })
    .min(0, "耗时不能小于零")
    .nullable()
    .default(null),
  tokens: nullableCountSchema,
  cost: z
    .number({ error: "成本需填写数字，未知时请留空" })
    .min(0, "成本不能小于零")
    .nullable()
    .default(null),
  currency: z
    .enum(["CNY", "USD"], { error: "币种仅支持人民币或美元" })
    .default("CNY"),
  costSource: recordTextSchema,
});
const mediaCheckSchema = z
  .enum(["pending", "pass", "fail"], {
    error: "请选择待检查、通过或失败",
  })
  .default("pending");
const nullableMediaCountSchema = z
  .number({ error: "积分与尝试次数需填写数字，未知时请留空" })
  .int("积分与尝试次数必须是整数")
  .min(0, "积分与尝试次数不能小于零")
  .nullable()
  .default(null);
const mediaTimeSchema = z
  .number({ error: "问题时间需填写秒数，未知时请留空" })
  .min(0, "问题时间不能小于零")
  .nullable()
  .default(null);
export const workRecordMediaSchema = z
  .object({
    episode: z.string().max(120, "集数说明不能超过 120 字").default(""),
    stage: z
      .enum(
        ["script", "image", "audio", "subtitle", "composition", "delivery"],
        { error: "请选择有效的生产环节" },
      )
      .default("image"),
    timeStart: mediaTimeSchema,
    timeEnd: mediaTimeSchema,
    shotId: z.string().max(120, "镜头编号不能超过 120 字").default(""),
    issueType: z
      .enum(["continuity", "audio_overlap", "lip_sync", "text", "other"], {
        error: "请选择有效的问题类型",
      })
      .default("other"),
    audioStrategy: z
      .enum(["keep_source", "voiceover", "mute", "unknown"], {
        error: "请选择有效的音频策略",
      })
      .default("unknown"),
    repairScope: z
      .enum(["shot", "adjacent", "episode"], {
        error: "请选择单镜头、相邻镜头或整集范围",
      })
      .default("shot"),
    localCheck: mediaCheckSchema,
    adjacentCheck: mediaCheckSchema,
    fullCheck: mediaCheckSchema,
    credits: nullableMediaCountSchema,
    creditsSource: recordTextSchema,
    attempts: nullableMediaCountSchema,
  })
  .superRefine((media, ctx) => {
    if (
      media.timeStart !== null &&
      media.timeEnd !== null &&
      media.timeEnd <= media.timeStart
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["timeEnd"],
        message: "问题时间终点必须晚于起点",
      });
    }
    if (media.credits !== null && !media.creditsSource.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["creditsSource"],
        message:
          "填写积分消耗时，请注明平台记录或其他积分依据；积分不等同于现金成本",
      });
    }
  });
export type WorkRecordMedia = z.infer<typeof workRecordMediaSchema>;
const workRecordFieldsSchema = z.object({
  kind: z.enum(["research", "evaluation", "issue", "sharing", "review"], {
    error: "请选择有效的记录类型",
  }),
  title: z
    .string()
    .trim()
    .min(1, "请填写记录标题")
    .max(120, "标题不能超过 120 字"),
  status: z.enum(["draft", "active", "retest", "closed"], {
    error: "请选择有效的记录状态",
  }),
  origin: z.enum(["personal", "public", "example"], {
    error: "请选择个人记录、公开来源或演示示例",
  }),
  projectId: z.string().uuid("关联项目标识不正确").nullable().default(null),
  summary: recordTextSchema,
  objective: recordTextSchema,
  input: recordTextSchema,
  expected: recordTextSchema,
  observed: recordTextSchema,
  action: recordTextSchema,
  evidence: z
    .array(workRecordEvidenceSchema)
    .max(12, "最多保留 12 条证据")
    .default([]),
  evaluation: workRecordEvaluationSchema.nullable().default(null),
  media: workRecordMediaSchema.nullable().default(null),
});
function validateWorkRecord(
  input: z.infer<typeof workRecordFieldsSchema>,
  ctx: z.RefinementCtx,
) {
  if (input.media && !["issue", "review"].includes(input.kind)) {
    ctx.addIssue({
      code: "custom",
      path: ["media"],
      message: "媒体定位与复测卡仅用于问题记录或质量检查",
    });
  }
  if (
    input.evaluation?.cost !== null &&
    input.evaluation?.cost !== undefined &&
    !input.evaluation.costSource.trim()
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["evaluation", "costSource"],
      message: "填写成本时，请注明账单、调用记录或其他成本依据",
    });
  }
  if (input.status !== "closed") return;
  if (!input.observed.trim()) {
    ctx.addIssue({
      code: "custom",
      path: ["observed"],
      message: "关闭记录前，请填写实际结果或复测观察",
    });
  }
  if (input.kind === "review" && !input.projectId) {
    ctx.addIssue({
      code: "custom",
      path: ["projectId"],
      message: "关闭质量检查前，请关联创作项目",
    });
  }
  if (input.kind === "evaluation") {
    if (!input.expected.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["expected"],
        message: "关闭评测前，请填写通过条件",
      });
    }
    if (!input.evaluation?.model.trim() || !input.evaluation.caseId.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["evaluation"],
        message: "关闭评测前，请填写模型和任务编号",
      });
    }
    if (!input.evaluation || input.evaluation.completion === "unknown") {
      ctx.addIssue({
        code: "custom",
        path: ["evaluation", "completion"],
        message: "关闭评测前，请根据实测结果标记通过或失败",
      });
    }
  }
}
export const workRecordInputSchema =
  workRecordFieldsSchema.superRefine(validateWorkRecord);
export const workRecordCreateSchema = workRecordFieldsSchema
  .extend({
    id: z.string().uuid("记录标识不正确"),
  })
  .superRefine(validateWorkRecord);
export const workRecordPatchSchema = workRecordFieldsSchema
  .extend({
    revision: z.number().int().min(0),
    reconfirmProjectRevision: z.number().int().min(0).optional(),
  })
  .superRefine(validateWorkRecord);
// Returned records retain their history after a linked project is deleted.
// Closure requirements apply to new writes, not to this historical read shape.
export const workRecordSchema = workRecordFieldsSchema.extend({
  id: z.string().uuid(),
  revision: z.number().int().min(0),
  createdAt: z.string(),
  updatedAt: z.string(),
  projectRevision: z.number().int().min(0).nullable(),
  projectFingerprint: z.string().nullable(),
  stale: z.boolean(),
});
export type WorkRecordInput = z.infer<typeof workRecordInputSchema>;
export type WorkRecord = z.infer<typeof workRecordSchema>;
