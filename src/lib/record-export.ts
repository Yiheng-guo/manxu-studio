import type { Project, WorkRecord } from "./schema";
import { origins, recordKinds, recordStatuses } from "./workbench";

export function recordMarkdown(record: WorkRecord, project?: Project) {
  const e = record.evaluation;
  return `# ${record.title}\n\n类型：${recordKinds[record.kind]} · ${recordStatuses[record.status]} · ${origins[record.origin]}\n\n关联项目：${project?.title || "无"}；记录版本：${record.revision}；项目复核：${!record.projectId ? "未关联项目" : record.stale ? "内容已变，需复核" : "未检测到内容变化"}\n\n${[["摘要",record.summary],["目标",record.objective],["输入与任务",record.input],["通过条件",record.expected],["原始输出与观察",record.observed],["行动与复测",record.action]].map(([label,value])=>`## ${label}\n\n${value || "未填写"}`).join("\n\n")}\n\n## 证据\n\n${record.evidence.map((s)=>`- ${s.label} ${s.url}\n  ${s.note}`).join("\n") || "未添加"}${e ? `\n\n## 人工实测记录\n\n样例：${e.caseId || "未填写"}\n模型：${e.model || "未填写"}\nPrompt 版本：${e.promptVersion || "未填写"}\n完成：${e.completion}\n评分（0—5）：${e.score ?? "未知"}\n事实错误：${e.factualErrors ?? "未知"}\n人工干预：${e.interventions ?? "未知"}\n耗时（ms）：${e.latencyMs ?? "未知"}\nTokens：${e.tokens ?? "未知"}\n现金费用：${e.cost === null ? "未知" : `${e.cost} ${e.currency}`}\n计费依据：${e.costSource || "未提供"}` : ""}${record.media ? `\n\n## 媒体定位与复测\n\n${JSON.stringify(record.media,null,2)}\n\n积分不能直接换算现金；检查结果为人工录入。` : ""}\n\n保存时间：${record.updatedAt}\n\n说明：个人工作台记录；教学示例不作为实测业绩。费用未提供凭证时保持未知。\n`;
}
