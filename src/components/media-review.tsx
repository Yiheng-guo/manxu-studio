"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock3, FileSearch, LocateFixed } from "lucide-react";
import type { Project, WorkRecord, WorkRecordMedia } from "@/lib/schema";
import { projectTimeline, shotAtTime } from "@/lib/timeline";

export const emptyMedia: WorkRecordMedia = {
  episode:"",stage:"image",timeStart:null,timeEnd:null,shotId:"",issueType:"other",audioStrategy:"unknown",repairScope:"shot",
  localCheck:"pending",adjacentCheck:"pending",fullCheck:"pending",credits:null,creditsSource:"",attempts:null,
};
export const mediaLabels = {
  stage:{script:"脚本",image:"画面",audio:"音频",subtitle:"字幕",composition:"合成",delivery:"交付"},
  issueType:{continuity:"人物 / 道具连续性",audio_overlap:"重复声轨叠加",lip_sync:"口型 / 音画错位",text:"文字乱码",other:"其他"},
  audioStrategy:{keep_source:"保留原声",voiceover:"使用额外配音",mute:"静音",unknown:"未确定"},
  repairScope:{shot:"局部镜头",adjacent:"相邻镜头",episode:"整集"},
  check:{pending:"未检查",pass:"通过",fail:"失败"},
};
export function MediaFields({value,onChange}:{value:WorkRecordMedia;onChange:(value:WorkRecordMedia)=>void}) {
  return <section className="wb-evaluation-fields"><h3>媒体定位、返工与复测</h3><p>记录采用区间与声轨策略；本表不直接剪辑或停用声轨。修复后分别验证三个范围。</p><div className="wb-form-row two"><label>集 / 片段标识<input maxLength={120} value={value.episode} onChange={e=>onChange({...value,episode:e.target.value})} placeholder="例如 EP06，或当前创作项目名"/></label><label>源镜头 ID<input maxLength={120} value={value.shotId} onChange={e=>onChange({...value,shotId:e.target.value})} placeholder="例如 scene-2；从成片定位面板带入"/></label></div><div className="wb-form-row">{([{key:"stage",label:"问题阶段",options:mediaLabels.stage},{key:"issueType",label:"问题类型",options:mediaLabels.issueType},{key:"audioStrategy",label:"声轨采用策略",options:mediaLabels.audioStrategy},{key:"repairScope",label:"返工范围",options:mediaLabels.repairScope}] as const).map(f=><label key={f.key}>{f.label}<select value={value[f.key]} onChange={e=>onChange({...value,[f.key]:e.target.value})}>{Object.entries(f.options).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>)}{([{key:"timeStart",label:"成片问题开始（秒）"},{key:"timeEnd",label:"成片问题结束（秒）"}] as const).map(f=><label key={f.key}>{f.label}<input type="number" min="0" step="0.01" placeholder="未知" value={value[f.key]??""} onChange={e=>onChange({...value,[f.key]:e.target.value===""?null:Number(e.target.value)})}/></label>)}</div><div className="wb-form-row">{([{key:"localCheck",label:"局部复测"},{key:"adjacentCheck",label:"相邻镜头复测"},{key:"fullCheck",label:"全片 / 整集复测"}] as const).map(f=><label key={f.key}>{f.label}<select value={value[f.key]} onChange={e=>onChange({...value,[f.key]:e.target.value})}>{Object.entries(mediaLabels.check).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>)}</div><div className="wb-form-row two"><label>实际消耗积分<input type="number" min="0" step="1" placeholder="未知；不换算现金" value={value.credits??""} onChange={e=>onChange({...value,credits:e.target.value===""?null:Number(e.target.value)})}/></label><label>生成尝试次数<input type="number" min="0" step="1" placeholder="未知；含候选与返工需说明" value={value.attempts??""} onChange={e=>onChange({...value,attempts:e.target.value===""?null:Number(e.target.value)})}/></label></div><label>积分与尝试口径<input maxLength={6000} value={value.creditsSource} onChange={e=>onChange({...value,creditsSource:e.target.value})} placeholder="积分有值时必填；记录来源、是否含候选和返工、是否能对应镜头。"/></label></section>;
}
export function MediaSummary({media}:{media:WorkRecordMedia}) {
  return <div className="wb-media-summary"><div><b>{media.episode||"未填集标识"}</b><span>{mediaLabels.stage[media.stage]} · {mediaLabels.issueType[media.issueType]}</span></div><p>源镜头：{media.shotId||"未知"} · 区间：{media.timeStart??"未知"}—{media.timeEnd??"未知"} 秒 · 声轨：{mediaLabels.audioStrategy[media.audioStrategy]} · 修改范围：{mediaLabels.repairScope[media.repairScope]}</p><div className="wb-check-results">{[["局部",media.localCheck],["相邻",media.adjacentCheck],["全片",media.fullCheck]].map(([label,result])=><span key={label} className={result}>{label} · {mediaLabels.check[result as keyof typeof mediaLabels.check]}</span>)}</div><p>积分：{media.credits??"未知"} · 生成尝试：{media.attempts??"未知"} · 依据：{media.creditsSource||"未提供"}</p><small>三项人审通过需要实际复测；这里展示填写结果，没有自动内容认证。</small></div>;
}
export function TimelineInspector({projects,onIssue}:{projects:Project[];onIssue:(project:Project,media:WorkRecordMedia)=>void}) {
  const [selected,setSelected]=useState("");
  const [seconds,setSeconds]=useState("");
  const project=projects.find(p=>p.id===selected)||projects[0];
  const timeline=project?projectTimeline(project):null;
  const match=timeline && seconds.trim()!=="" ? shotAtTime(timeline.entries,Number(seconds)) : null;
  const index=project?.shots.findIndex(s=>s.id===match?.shotId)??-1;
  const shot=project?.shots[index];
  const staleFilm=!!project?.render&&project.render.revision<project.revision-1;
  return <section className="wb-timeline-inspector"><div className="wb-panel-heading"><div><h2><LocateFixed size={18}/>从问题时间，回到源镜头</h2><p>把问题定位带入记录，再处理对应源画面、声音或字幕。</p></div><Clock3 size={22}/></div><div className="wb-locate-inputs"><label>创作项目<select value={project?.id||""} onChange={e=>{setSelected(e.target.value);setSeconds("");}}><option value="">选择项目</option>{projects.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label><label>成片问题时间（秒）<input type="number" min="0" step="0.01" value={seconds} onChange={e=>setSeconds(e.target.value)} placeholder="例如 8.5"/></label></div>{timeline&&<div className={`wb-timeline-source ${timeline.source}`}><span>{timeline.source==="render" ? "使用合成记录区间" : "仅有计划区间"}</span><p>{timeline.source==="render" ? "从编码镜头元数据留存区间，时长保留两位小数；拼接与帧舍入可能产生偏差，片段边界需播放器复核。" : "配音可能延长镜头。当前区间不能当作实际成片时间；重新合成后会保存编码区间。"}{staleFilm ? " 作品在成片后有修改；当前镜头卡需与旧片逐项核对。" : ""}</p></div>}{shot&&match&&project ? <div className="wb-locate-result"><div><FileSearch size={18}/><b>S{String(index+1).padStart(2,"0")} · {shot.title}</b><span>{match.start.toFixed(2)}—{match.end.toFixed(2)} 秒</span></div><p>{shot.description}</p><button className="button secondary" onClick={()=>onIssue(project,{...emptyMedia,episode:project.title,shotId:shot.id,timeStart:Number(seconds),timeEnd:match.end})}>带入问题记录 <ArrowRight size={15}/></button><Link href={`/project/${project.id}`}>打开作品逐镜修订</Link></div> : <p className="wb-locate-help">{!project ? "先创建创作项目。" : seconds.trim()==="" ? "输入问题发生的秒数，查看对应镜头与区间。" : "此时间没有匹配当前区间；请核对成片版本和输入范围。"}</p>}</section>;
}
export function MediaLedger({records}:{records:WorkRecord[]}) {
  const entries=records.filter(r=>r.origin!=="example"&&r.media);
  const withCredits=entries.filter(r=>r.media?.credits!==null);
  const withAttempts=entries.filter(r=>r.media?.attempts!==null);
  return <div className="wb-media-ledger"><div><span>已填积分</span><b>{withCredits.length ? withCredits.reduce((n,r)=>n+(r.media?.credits??0),0).toLocaleString("zh-CN") : "未知"}</b><small>{withCredits.length} 条有依据记录 · 未核验账单</small></div><div><span>已填生成尝试</span><b>{withAttempts.length ? withAttempts.reduce((n,r)=>n+(r.media?.attempts??0),0) : "未知"}</b><small>仅汇总填写值 · 教学示例排除</small></div><p>积分、尝试次数和现金费用分别记录。未绑定镜头的流水不能用来推断各集或返工成本；不要重复录入同一笔消耗。</p></div>;
}
