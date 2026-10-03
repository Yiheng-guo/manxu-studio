import type { WorkRecordInput } from "./schema";

export const recordKinds = {
  research: "研究与需求", evaluation: "模型评测", issue: "问题与返工",
  review: "阶段审阅", sharing: "知识分享",
} as const;
export const recordStatuses = { draft: "草稿", active: "进行中", retest: "待复测", closed: "已归档" } as const;
export const origins = { personal: "个人记录", public: "公开资料", example: "教学示例" } as const;
export const methods = [
  { id: "ai-product-teardown", name: "AI 产品拆解", phase: "研究", desc: "沿生成、修改与交付流程，把体验问题转为有证据的需求。", input: "真实界面、官方资料、用户任务", output: "证据台账、旅程、改进优先级", check: "事实、推断、建议与未知分开；未看到产物不宣布交付。", view: "research", kind: "research" },
  { id: "model-eval-workflow", name: "模型评测工作流", phase: "选型", desc: "统一任务、样本和评分口径，再比较质量、完成度与消耗。", input: "冻结样例、通过条件、模型与 Prompt 版本", output: "原始结果、Bad Case、评测报告", check: "待判定不等于通过；关键否决项独立检查；无账单不估费用。", view: "evaluation", kind: "evaluation" },
  { id: "aigc-script-development", name: "脚本筹划", phase: "脚本", desc: "把人物、剧情和时长要求转为完整脚本与逐项约束。", input: "创意、人物设定、集数、时长与硬约束", output: "剧本、约束检查、人工确认", check: "工具可查标注与时长；人物动机与叙事合理性仍需人审。", view: "studio", kind: "review" },
  { id: "aigc-storyboard-planning", name: "分镜连续性", phase: "分镜", desc: "用稳定的角色与场景状态，检查相邻镜头的变化。", input: "已确认脚本、角色与参考资产", output: "镜头卡、状态键、相邻差异", check: "检查服装、道具、位置与动作；没有实际画面不能声称锁脸。", view: "quality", kind: "review" },
  { id: "aigc-media-badcase-review", name: "媒体问题定位与修复", phase: "返工", desc: "定位到镜头和时间区间，提出最小修改并保留复测。", input: "异常片段、源镜头与合成映射", output: "原因假设、局部修复与复测计划", check: "分别复查局部、相邻镜头和全片；这项 Skill 本身不重生媒体。", view: "quality", kind: "issue" },
  { id: "aigc-video-delivery", name: "视频交付检查", phase: "交付", desc: "将实际成片、字幕、技术检查和人审结论一起留档。", input: "审核素材、音轨、字幕与计费凭证", output: "MP4 / SRT、技术报告、费用台账", check: "技术合成成功与内容验收分别记录；本工作台提供独立本地合成。", view: "quality", kind: "review" },
] as const;
export const references = [
  { name: "promptfoo", url: "https://github.com/promptfoo/promptfoo", tag: "评测", adopted: "同任务样例 × 模型 / Prompt 版本的对照矩阵，保留原始输出与未知值。", limit: "本版为人工实测台账，未接入 promptfoo 引擎。" },
  { name: "LangGraph JS", url: "https://github.com/langchain-ai/langgraphjs", tag: "确认", adopted: "明确人工确认点与可恢复状态；将审阅记录关联到项目内容版本。", limit: "沿用 SQLite 与现有 worker，自行实现记录，不引入框架。" },
  { name: "Toonflow", url: "https://github.com/HBAI-Ltd/Toonflow-app", tag: "连续性", adopted: "按角色、道具、空间、动作和音画定位连续性问题，优先局部修订。", limit: "仅借鉴审阅机制，不接入其 Agent、模型或无限画布。" },
  { name: "MoneyPrinterTurbo", url: "https://github.com/harry0703/MoneyPrinterTurbo", tag: "流水线", adopted: "拆开脚本、素材、配音、字幕与合成阶段，保留各阶段产物。", limit: "现有独立合成流程延续此参考，无第三方视频素材自动下载。" },
];
export function emptyRecord(kind: WorkRecordInput["kind"], projectId: string | null = null): WorkRecordInput {
  return {
    kind, title: "", status: "draft", origin: "personal", projectId,
    summary: "", objective: "", input: "", expected: "", observed: "", action: "", evidence: [], media: null,
    evaluation: kind === "evaluation" ? {
      caseId: "", model: "", promptVersion: "", completion: "unknown", score: null,
      factualErrors: null, interventions: null, latencyMs: null, tokens: null,
      cost: null, currency: "CNY", costSource: "",
    } : null,
  };
}
export function exampleRecord(kind: WorkRecordInput["kind"], projectId: string | null = null): WorkRecordInput {
  const base = { ...emptyRecord(kind, projectId), origin: "example" as const };
  if (kind === "evaluation") return { ...base, title: "教学示例 · 同一剧本任务的模型对照", summary: "仅提供任务与验收模板，尚未调用模型，没有真实评分或费用。", objective: "比较同任务下的交付完整性、人物行为和修改成本。", input: "CASE-01：女孩在末班车前作出选择。相同人物设定、4 个镜头、约 30 秒、同一 Prompt；候选模型分别执行。", expected: "结构完整；人物行为符合给定设定；分镜 4 个；无空白交付。先校准评分口径，再进行人工审阅。", action: "执行后粘贴原始输出与记录版本；未知指标保持空白，费用附供应商账单。", evaluation: { ...base.evaluation!, caseId: "CASE-01", promptVersion: "待填写真实版本" } };
  if (kind === "issue") return { ...base, title: "教学示例 · 相邻镜头道具不连续", summary: "假设性 Bad Case，用于演示定位与复测，不是实习中的真实问题。", objective: "区分源画面生成问题与视频合成问题，减少整片返工。", input: "示例定位格式：S02 → S03；00:08—00:16；源画面文件与时间区间。", expected: "人物服装、手持道具与动作状态在相邻镜头中能合理衔接。", action: "先回查源画面。只修订有问题的镜头；复查【局部】【相邻】【全片】，每项记录通过 / 失败 / 未检查及证据。" };
  if (kind === "review") return { ...base, title: "教学示例 · 分镜制作前确认", objective: "避免未确认的脚本问题向画面与合成阶段传播。", expected: "【脚本】人物行为、剧情、时长；【分镜】服装、道具、空间、动作；【成片】声音、字幕、画面与交付文件。", action: "查看当前项目再填写人审观察，未查看的项目标为未检查。修改后按新版本重新审阅。" };
  if (kind === "sharing") return { ...base, title: "教学示例 · 一次模型实测分享", objective: "把实测中的有效方法与失败边界分享给协作者。", expected: "包含任务背景、原始记录、方法变化、成本依据与尚未解决的问题。", action: "填写真实实践后导出 Markdown，作为分享草稿。" };
  return { ...base, title: "教学示例 · 创作者局部修改需求", summary: "从生成—修改—交付链路拆解体验问题；这是结构模板，没有声称已访谈或测试竞品。", objective: "判断局部修订入口是否减少不必要的整片返工。", input: "待填写：创作者任务、实际界面或官方资料、版本和观察时间。", expected: "证据能支持问题；事实与推断分开；需求有优先级、约束和验收条件。", action: "【事实】附证据；【推断】说明推断链；【建议】最小可验证改进；【未知】列出待验证点。" };
}
