"use client";
import { projectHref } from "@/lib/public-mode";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight, ArrowUpRight, BookOpen, Check, ChevronRight, Clapperboard, Download,
  ExternalLink, FileCheck2, FlaskConical, FolderOpen, GitBranch, Layers3,
  LoaderCircle, Plus, RefreshCw, ScanSearch, Search, ShieldCheck, Sparkles, Trash2,
} from "lucide-react";
import { ArchiveLink } from "./archive-link";
import { api } from "@/lib/api";
import { workRecordInputSchema, type Project, type WorkRecord, type WorkRecordInput } from "@/lib/schema";
import { emptyRecord, exampleRecord, methods, origins, recordKinds, recordStatuses, references } from "@/lib/workbench";
import { ErrorBanner, Modal, Shell, messageOf } from "./ui";
import { emptyMedia, MediaFields, MediaLedger, MediaSummary, TimelineInspector } from "./media-review";

const viewInfo: Record<string, { name: string; eyebrow: string; desc: string; kind: WorkRecordInput["kind"] }> = {
  research: { name: "研究与需求", eyebrow: "RESEARCH → DECISION", desc: "从创作者的真实任务出发。留下证据，再写判断与改进建议。", kind: "research" },
  evaluation: { name: "模型评测", eyebrow: "SAME TASK, VISIBLE EVIDENCE", desc: "固定样例和通过条件，保留模型、Prompt 版本与原始输出。", kind: "evaluation" },
  quality: { name: "质量与复测", eyebrow: "REVIEW → REPAIR → RETEST", desc: "先检查源产物，定位到镜头与区间，修订后复查局部、相邻与全片。", kind: "issue" },
  sharing: { name: "知识分享", eyebrow: "PRACTICE → KNOWLEDGE", desc: "将研究、模型实测与创作经验整理成可追溯的分享草稿。", kind: "sharing" },
};

function recordHref(record: WorkRecord) {
  const view = record.kind === "issue" || record.kind === "review" ? "quality" : record.kind;
  return `/?view=${view}&record=${record.id}`;
}
const dateLabel = (value: string) => new Date(value).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });

export default function Workbench({ view }: { view: string }) {
  const query = useSearchParams();
  const router = useRouter();
  const [records, setRecords] = useState<WorkRecord[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [caseId, setCaseId] = useState("");
  const [draft, setDraft] = useState<WorkRecordInput | null>(null);
  const [editing, setEditing] = useState<WorkRecord | null>(null);
  const [createId, setCreateId] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<WorkRecord | null>(null);
  const [notice, setNotice] = useState("");
  const [reconfirm, setReconfirm] = useState(false);
  const selected = records.find((r) => r.id === query.get("record"));
  const projectFilter = query.get("project");
  const info = viewInfo[view];
  const project = projects.find((p) => p.id === projectFilter);
  const kinds: WorkRecordInput["kind"][] = view === "quality" ? ["issue", "review"] : info ? [info.kind] : [];
  const filtered = records.filter((r) => kinds.includes(r.kind) && (!projectFilter || r.projectId === projectFilter) && (status === "all" || r.status === status) && `${r.title} ${r.summary} ${r.objective} ${r.evaluation?.model || ""}`.toLowerCase().includes(search.toLowerCase()));
  const realRecords = records.filter((r) => r.origin !== "example");

  useEffect(() => {
    let live = true;
    Promise.all([api.records.list(), api.list()]).then(([r,p]) => {
      if (live) { setRecords(r); setProjects(p); setError(""); }
    }).catch((e) => { if (live) setError(messageOf(e)); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [reload]);
  useEffect(() => {
    if(selected?.id) document.getElementById("practice-detail")?.scrollIntoView({block:"start"});
  }, [selected?.id]);
  function openRecord(kind: WorkRecordInput["kind"], example = false, record?: WorkRecord) {
    setEditing(record || null); setFormError(""); setReconfirm(false);
    setCreateId(record?.id || crypto.randomUUID());
    const next = record || (example ? exampleRecord(kind, project?.id || null) : emptyRecord(kind, project?.id || null));
    setDraft(!record && ["issue","review"].includes(kind) ? {...next,media:{...emptyMedia,episode:project?.title||""}} : next);
  }
  function closeForm() { if (!saving) { setDraft(null); setEditing(null); setFormError(""); } }
  async function saveRecord() {
    if (!draft) return;
    const parsed = workRecordInputSchema.safeParse(draft);
    if (!parsed.success) { setFormError(parsed.error.issues[0]?.message || "请检查输入"); return; }
    setSaving(true); setFormError("");
    try {
      const saved = editing
        ? await api.records.save({ ...parsed.data, id: editing.id, revision: editing.revision, reconfirmProjectRevision:reconfirm ? projects.find(p=>p.id===draft.projectId)?.revision : undefined })
        : await api.records.create({ ...parsed.data, id: createId });
      setRecords((list) => [saved, ...list.filter((r) => r.id !== saved.id)]);
      setDraft(null); setEditing(null); setNotice("记录已保存到当前设备，可刷新恢复。");
      router.push(recordHref(saved));
    } catch (e) { setFormError(messageOf(e)); }
    finally { setSaving(false); }
  }

  return (
    <Shell crumb={info?.name || (view === "methods" ? "方法与 Skill" : "实践总览")}>
      <div className="workbench-page">
        {error && <div className="wb-recovery"><ErrorBanner message={error} /><button className="button secondary" onClick={() => { setLoading(true); setReload((n)=>n+1); }}>重新载入</button></div>}
        {notice && <div className="wb-notice" role="status"><Check size={16}/>{notice}<button onClick={()=>setNotice("")} aria-label="关闭保存提示">关闭</button></div>}
        {(view === "overview" || (!info && view !== "methods")) && <>
          <div className="wb-heading"><div><span className="eyebrow">MANXU / PERSONAL PRACTICE SPACE</span><h1>让创作经验，成为可复用的系统。</h1><p>产品研究、模型评测、漫剧创作与质量复测，在同一条实践链路上。</p></div><ArchiveLink className="button secondary" href="/api/records/export"><Download size={16}/>导出实践档案</ArchiveLink></div>
          <div className="wb-hero">
            <div className="wb-hero-copy"><span className="wb-label"><Sparkles size={14}/>从实习方法到个人产品</span><h2>不只完成一部作品。<br/><em>也留下完成它的方法。</em></h2><p>把任务目标、证据、失败案例与复测放在一起。下一次判断和创作，都能从已有经验继续。</p><div className="wb-hero-actions"><button className="button primary" onClick={()=>openRecord("research")}><Plus size={16}/>开始一项研究</button><Link className="button secondary" href="/?view=studio">进入创作 <ArrowRight size={16}/></Link></div><span className="wb-hero-caption">个人工作台 · 数据保存在当前设备 · 示例明确标识</span></div>
            <div className="wb-hero-visual"><img src="/demo/station.png" alt="漫序原创示例：暮色中等待列车的女孩"/><div className="wb-visual-caption"><span>FRAMEFLOW ORIGINAL / 01</span><b>每一个镜头，都有前因与后续。</b></div></div>
          </div>
          <div className="wb-stats" aria-label="工作区实际记录统计">
            {[{label:"创作项目",value:projects.length,icon:Clapperboard,detail:"设备本地项目"},{label:"研究与评测",value:realRecords.filter(r=>["research","evaluation"].includes(r.kind)).length,icon:FlaskConical,detail:"不含教学示例"},{label:"待跟进记录",value:realRecords.filter(r=>["active","retest"].includes(r.status)).length,icon:ShieldCheck,detail:"进行中或待复测"},{label:"开源方法资产",value:methods.length,icon:Layers3,detail:"已核对独立仓库"}].map(s=><div className="wb-stat" key={s.label}><s.icon size={20}/><div><span>{s.label}</span><b>{(loading || error) && s.label!=="开源方法资产" ? "—" : s.value}</b><small>{s.detail}</small></div></div>)}
          </div>
          <div className="wb-section-heading"><div><span className="eyebrow">ONE CONNECTED WORKFLOW</span><h2>从发现问题，到验证改进</h2></div><Link href="/?view=methods">查看方法库 <ArrowUpRight size={16}/></Link></div>
          <div className="wb-workflow">{[{n:"01",name:"研究问题",desc:"创作者任务 · 竞品证据 · 需求判断",view:"research",icon:ScanSearch},{n:"02",name:"比较方案",desc:"同任务样例 · 评分口径 · 原始结果",view:"evaluation",icon:FlaskConical},{n:"03",name:"创作验证",desc:"脚本确认 · 角色与分镜 · 成片",view:"studio",icon:Clapperboard},{n:"04",name:"质量闭环",desc:"问题定位 · 局部修订 · 三层复测",view:"quality",icon:ShieldCheck}].map(s=><Link href={`/?view=${s.view}`} className="wb-workflow-step" key={s.n}><span>{s.n}</span><s.icon size={22}/><h3>{s.name}</h3><p>{s.desc}</p><ArrowRight size={17}/></Link>)}</div>
          <div className="wb-overview-columns">
            <section className="wb-panel"><div className="wb-panel-heading"><h2>最近的实践</h2><Link href="/?view=research">全部记录 <ChevronRight size={16}/></Link></div>{loading ? <Loading/> : records.length ? records.slice(0,4).map(r=><Link className="wb-recent" key={r.id} href={recordHref(r)}><div className="wb-recent-icon">{r.kind==="evaluation" ? <FlaskConical size={18}/> : r.kind==="issue"||r.kind==="review" ? <ShieldCheck size={18}/> : <BookOpen size={18}/>}</div><div><b>{r.title}</b><span>{recordKinds[r.kind]} · {origins[r.origin]} · {dateLabel(r.updatedAt)}</span></div><span className={`wb-status ${r.status}`}>{recordStatuses[r.status]}</span></Link>) : <div className="wb-empty-compact"><FolderOpen size={28}/><b>从一个真实问题开始</b><p>保存目标、证据与判断，让你的实践可以继续。</p><button className="button secondary" onClick={()=>openRecord("research")}>新建研究记录</button></div>}</section>
            <section className="wb-panel wb-background"><span className="eyebrow">PRACTICE BACKGROUND</span><h2>这套工作台，从哪里来</h2><div className="wb-timeline"><div><span>2026.03—05</span><b>快看漫画 · AI 产品经理实习</b><p>用户提供的经历：竞品拆解、模型评测、脚本与视频 Skill 定义、质量验收及跨团队协作。</p></div><div><span>实习后的个人沉淀</span><b>从方法，走向可运行工具</b><p>漫序于 9 月形成创作 MVP，现将研究、评测与复测连接起来；六项公开 Skill 提供方法资产。</p></div></div><small>经历说明来自用户资料；本工作台为个人后续实现，未宣称是快看内部系统或公司业绩证明。</small></section>
          </div>
          <div className="wb-section-heading"><div><span className="eyebrow">YOUR CREATIVE PROJECTS</span><h2>把实践，放回作品里</h2></div><Link href="/?view=studio">全部作品 <ArrowUpRight size={16}/></Link></div>
          <div className="wb-project-strip">{projects.slice(0,3).map(p=><Link key={p.id} href={projectHref(p.id)} className="wb-mini-project">{p.shots.find(s=>s.imageUrl)?.imageUrl ? <img src={p.shots.find(s=>s.imageUrl)!.imageUrl} alt={p.title}/> : <Clapperboard size={30}/>}<div><b>{p.title}</b><span>{p.shots.length} 个分镜 · {records.filter(r=>r.projectId===p.id).length} 项关联记录</span></div><ArrowUpRight size={18}/></Link>)}<Link className="wb-mini-project wb-new-project" href="/?view=studio"><Plus size={24}/><div><b>打开创作空间</b><span>从原创示例或你的新故事开始</span></div><ArrowRight size={18}/></Link></div>
        </>}
        {view === "methods" && <>
          <div className="wb-heading"><div><span className="eyebrow">METHODS & OPEN SOURCE</span><h1>六项方法，连成一条实践链。</h1><p>将拆解、评测、脚本、分镜、返工与交付的方法，带到下一次真实任务里。</p></div><a className="button secondary" href="https://github.com/Yiheng-guo/ai-product-skills" target="_blank" rel="noreferrer">查看开源合集 <ExternalLink size={16}/></a></div>
          <div className="wb-method-grid">{methods.map((m,i)=><article className="wb-method-card" key={m.id}><div className="wb-method-top"><span>0{i+1} / {m.phase}</span><a href={`https://github.com/Yiheng-guo/${m.id}`} target="_blank" rel="noreferrer" aria-label={`打开 ${m.name} GitHub 仓库`}><ArrowUpRight size={19}/></a></div><h2>{m.name}</h2><p>{m.desc}</p><dl><dt>输入</dt><dd>{m.input}</dd><dt>产出</dt><dd>{m.output}</dd></dl><div className="wb-method-check"><FileCheck2 size={16}/><span>{m.check}</span></div><button className="button secondary" onClick={()=>openRecord(m.kind)}>{m.view==="studio" ? "建立脚本审阅记录" : "用于新实践"}<ArrowRight size={15}/></button></article>)}</div>
          <div className="wb-evidence-note"><BookOpen size={18}/><p>这里展示已有公开方法资产。脚本、分镜、问题复测与交付 Skill 的公开合成样例不代表实习交付；进入工作台建立记录也不等于执行这些外部 Skill。</p></div>
          <section className="wb-breakfast-case"><div><span className="eyebrow">CASE STUDY / EXTERNAL PRODUCTION</span><h2>《下次做给我吃》：外部平台制作，方法在此沉淀。</h2><p>这部漫剧在另一个平台制作完成。漫序借鉴的是它的角色与道具约束、声轨检查、局部修复和交付流程，不将历史成片或生成消耗记作漫序产出。</p><a href="https://github.com/Yiheng-guo/ai-short-drama-production-playbook" target="_blank" rel="noreferrer">打开外部制作实践的公开复盘 <ExternalLink size={15}/></a></div><dl><div><dt>外部实践 · 作者报告</dt><dd>6 集 / 403 秒</dd></div><div><dt>外部视频生成流水</dt><dd>124 笔</dd></div><div><dt>外部总消耗积分</dt><dd>11,460</dd></div><div><dt>外部成片画幅</dt><dd>9:16</dd></div></dl><small>与漫序设备本地项目、模型调用和消耗分开统计。以上来自公开复盘，未在本轮逐片复测；原始流水未完整公开，不能推算各集、返工占比或实际现金支出。</small></section>
          <div className="wb-section-heading"><div><span className="eyebrow">MECHANISMS WE LEARNED FROM</span><h2>借鉴开源机制，保持产品自己的判断</h2></div><span className="muted">机制参考 · 独立实现</span></div>
          <div className="wb-reference-grid">{references.map(r=><article className="wb-reference" key={r.name}><span className="wb-label">{r.tag}</span><a href={r.url} target="_blank" rel="noreferrer"><h3>{r.name}</h3><ExternalLink size={16}/></a><p>{r.adopted}</p><small>{r.limit}</small></article>)}</div>
        </>}
        {info && <>
          <div className="wb-heading"><div><span className="eyebrow">{info.eyebrow}</span><h1>{info.name}</h1><p>{info.desc}</p></div><div className="wb-heading-actions"><button className="button secondary" onClick={()=>openRecord(info.kind,true)}>使用教学模板</button><button className="button primary" onClick={()=>openRecord(info.kind)}><Plus size={16}/>新建{view==="quality" ? "问题" : "记录"}</button></div></div>
          {projectFilter && <div className="wb-project-context"><Clapperboard size={20}/><div><b>{project?.title || "关联项目不存在"}</b><span>当前仅显示这个项目的记录</span></div>{project && <Link className="button secondary" href={projectHref(project.id)}>返回创作 <ArrowUpRight size={15}/></Link>}<Link href={`/?view=${view}`} className="wb-clear-filter">查看全部项目</Link></div>}
          <div className="wb-principles">{(view==="research" ? ["先写用户任务","证据链接 + 观察","区分事实与推断","需求有验收条件"] : view==="evaluation" ? ["冻结任务与输入","记录模型 / Prompt 版本","原始输出与失败同留","未知成本不填零"] : view==="quality" ? ["脚本先确认","问题定位到源镜头","只修必要部分","局部 / 相邻 / 全片复查"] : ["来自真实实践","给出证据与边界","保留失败结论","可导出继续分享"]).map((s,i)=><div key={s}><span>0{i+1}</span>{s}</div>)}</div>
          {view==="quality" && <>
            <div className="wb-quality-heading"><h2>创作项目检查</h2><span>结构检查与人工审阅分别记录</span><button className="button secondary" onClick={()=>openRecord("review")}><FileCheck2 size={16}/>新建阶段审阅</button></div>
            <div className="wb-quality-projects">{(project ? [project] : projects).map(p=>{
              const checks=[{label:"故事设定",ok:!!p.idea.trim()&&!!p.characters.length},{label:"分镜结构",ok:!!p.shots.length&&p.shots.every(s=>!!s.description.trim())},{label:"画面就绪",ok:!!p.shots.length&&p.shots.every(s=>!!s.imageUrl)},{label:"已有成片",ok:!!p.render}];
              const linked=records.filter(r=>r.projectId===p.id&&(r.kind==="issue"||r.kind==="review"));
              return <article className="wb-quality-project" key={p.id}><div><Link href={projectHref(p.id)}><h3>{p.title}<ArrowUpRight size={16}/></h3></Link><span>{p.shots.length} 个分镜 · {linked.length} 项质量记录</span></div><div className="wb-quality-checks">{checks.map(c=><span key={c.label} className={c.ok ? "present" : "missing"}>{c.ok ? <Check size={13}/> : <span>—</span>}{c.label}</span>)}</div><p>{linked.some(r=>r.stale) ? "作品内容有变动，原记录需复核。" : linked.some(r=>r.kind==="review"&&r.status==="closed") ? "已有归档审阅。是否通过请查看人审结论。" : "尚无归档人审；结构完整不代表内容验收通过。"}</p><Link href={`/?view=quality&project=${p.id}`}>查看项目记录 <ArrowRight size={14}/></Link></article>;
            })}{!loading&&!projects.length&&<div className="wb-empty-compact"><Clapperboard size={25}/><p>先创建一部作品，再关联质量审阅与问题记录。</p><Link href="/?view=studio" className="button secondary">进入创作</Link></div>}</div>
            {!loading&&<TimelineInspector projects={project ? [project] : projects} onIssue={(p,media)=>{openRecord("issue");setDraft({...emptyRecord("issue",p.id),title:`${p.title} · 镜头问题`,media,input:`${media.shotId}；问题发生于 ${media.timeStart} 秒。请核对合成区间与当前片版本。`});}}/>}
            <MediaLedger records={filtered}/>
          </>}
          {view==="evaluation" && <EvaluationMatrix records={filtered} caseId={caseId} onCase={setCaseId} onOpen={r=>router.push(recordHref(r))}/>}
          <div className="wb-record-toolbar"><h2>{view==="quality" ? "问题与审阅台账" : "实践记录"}<span>{loading ? "—" : filtered.length}</span></h2><div><button className="icon-button" aria-label="刷新记录与项目" disabled={loading} onClick={()=>{setLoading(true);setReload(n=>n+1);}}><RefreshCw size={16}/></button><label className="search-box"><Search size={16}/><input aria-label="搜索实践记录" placeholder="搜索标题、任务或模型" value={search} onChange={e=>setSearch(e.target.value)}/></label><label className="wb-filter"><span className="sr-only">筛选记录状态</span><select value={status} onChange={e=>setStatus(e.target.value)}><option value="all">所有状态</option>{Object.entries(recordStatuses).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label></div></div>
          {loading ? <Loading/> : error ? <div className="wb-empty-compact"><p>记录尚未载入，请重试。已有输入不会被当作空数据。</p></div> : filtered.length ? <div className="wb-record-grid">{filtered.map(r=><button className={`wb-record-card ${selected?.id===r.id ? "selected" : ""}`} key={r.id} onClick={()=>router.push(recordHref(r))}><div><span className="wb-kind">{recordKinds[r.kind]}</span><span className={`wb-status ${r.status}`}>{recordStatuses[r.status]}</span></div><h3>{r.title}</h3><p>{r.summary || r.objective || "还没有填写摘要与目标"}</p><footer><span>{origins[r.origin]} · {r.evidence.length} 项证据{r.stale ? " · 需复核" : ""}</span><span>{dateLabel(r.updatedAt)}<ArrowUpRight size={14}/></span></footer></button>)}</div> : <div className="wb-empty"><div><ScanSearch size={32}/></div><h2>{search || status!=="all" ? "没有匹配的记录" : "把一次实践，认真留下来。"}</h2><p>{search||status!=="all" ? "试试其他关键词或状态。" : "目标、输入、验收条件、观察与下一步，会一起保存在本机。"}</p><button className="button primary" onClick={()=>openRecord(info.kind)}><Plus size={16}/>新建记录</button></div>}
          {query.get("record")&&!loading&&!selected&&!error&&<div className="wb-evidence-note">记录不存在或已删除。你可以从台账重新选择。</div>}
          {selected && <RecordDetail record={selected} project={projects.find(p=>p.id===selected.projectId)} onEdit={()=>openRecord(selected.kind,false,selected)} onDelete={()=>setDeleteTarget(selected)} />}
          <div className="wb-evidence-note"><ShieldCheck size={17}/><p>{view==="evaluation" ? "评测由你录入真实输出与人工判断；本页不自动调用模型、不验证账单。没有原始输出、同任务条件和证据的记录不能用来宣称模型更好。" : "记录的状态表示跟进进度；已归档不自动等于验收通过。工作台仅保存你填写的观察、证据与结论。"}</p></div>
        </>}
      </div>
      <Modal open={!!draft} title={editing ? "编辑实践记录" : "新建实践记录"} onClose={closeForm} wide>
        {draft&&<form className="wb-record-form" onSubmit={e=>{e.preventDefault();void saveRecord();}}>
          {formError&&<ErrorBanner message={formError}/>}
          <fieldset disabled={saving}><div className="wb-form-top"><span>{recordKinds[draft.kind]} / {editing ? `v${editing.revision}` : "新记录"}</span><p>填写真实观察；未验证的内容标明未知。留空的消耗会保持未知。</p></div>
            <label>记录标题<input required maxLength={120} value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} placeholder="一个明确的研究问题、评测任务或质量问题"/></label>
            <div className="wb-form-row"><label>记录状态<select value={draft.status} onChange={e=>setDraft({...draft,status:e.target.value as WorkRecordInput["status"]})}>{Object.entries(recordStatuses).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><label>资料性质<select value={draft.origin} onChange={e=>setDraft({...draft,origin:e.target.value as WorkRecordInput["origin"]})}>{Object.entries(origins).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><label>关联创作项目<select value={draft.projectId||""} onChange={e=>setDraft({...draft,projectId:e.target.value||null})}><option value="">暂不关联</option>{projects.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label></div>
            <label>摘要<textarea rows={2} maxLength={6000} value={draft.summary} onChange={e=>setDraft({...draft,summary:e.target.value})} placeholder="让下一次打开的人理解这项记录的价值与边界。"/></label>
            <div className="wb-form-row two">{([{key:"objective",label:"任务目标",placeholder:"要解决谁的什么问题？"},{key:"input",label:"输入与任务",placeholder:"固定任务、样例、约束和输入版本。"},{key:"expected",label:"通过条件",placeholder:"明确必过项、否决项与人工审阅标准。"},{key:"observed",label:draft.kind==="evaluation" ? "原始输出与观察" : "观察结果与证据描述",placeholder:draft.kind==="evaluation" ? "粘贴真实模型输出和逐项判断。" : "区分事实、推断与未知；问题注明镜头和时间区间。"}] as const).map(f=><label key={f.key}>{f.label}<textarea maxLength={6000} rows={4} value={draft[f.key]} onChange={e=>setDraft({...draft,[f.key]:e.target.value})} placeholder={f.placeholder}/></label>)}</div>
            <label>行动与复测<textarea rows={4} maxLength={6000} value={draft.action} onChange={e=>setDraft({...draft,action:e.target.value})} placeholder={draft.kind==="issue" || draft.kind==="review" ? "写清修改范围和原因；分别记录【局部】【相邻镜头】【全片】通过 / 失败 / 未检查，附结果证据。" : "改进优先级、下次验证方法与仍然未知的问题。"}/></label>
            {draft.evaluation&&<EvaluationFields value={draft.evaluation} onChange={evaluation=>setDraft({...draft,evaluation})}/>}
            {draft.media&&<MediaFields value={draft.media} onChange={media=>setDraft({...draft,media})}/>}
            <div className="wb-form-section-heading"><h3>证据与来源</h3><button type="button" className="button subtle" disabled={draft.evidence.length>=12} onClick={()=>setDraft({...draft,evidence:[...draft.evidence,{label:"",url:"",note:""}]})}><Plus size={15}/>添加证据</button></div>
            {!draft.evidence.length&&<p className="wb-field-help">可记录官方资料链接，或本机文件名、镜头区间、观察时间和复测说明。不会上传本机文件。</p>}
            {draft.evidence.map((source,i)=><div className="wb-evidence-fields" key={i}><div className="wb-form-row two"><label>证据名称 {i+1}<input required maxLength={120} value={source.label} onChange={e=>setDraft({...draft,evidence:draft.evidence.map((s,j)=>j===i?{...s,label:e.target.value}:s)})}/></label><label>公开链接 {i+1}<input type="url" placeholder="https://…（可留空）" value={source.url} onChange={e=>setDraft({...draft,evidence:draft.evidence.map((s,j)=>j===i?{...s,url:e.target.value}:s)})}/></label></div><label>证据说明 {i+1}<textarea rows={2} maxLength={6000} placeholder="支持哪项判断？观察时间、版本、限制或本机文件名。" value={source.note} onChange={e=>setDraft({...draft,evidence:draft.evidence.map((s,j)=>j===i?{...s,note:e.target.value}:s)})}/></label><button type="button" className="wb-remove-evidence" onClick={()=>setDraft({...draft,evidence:draft.evidence.filter((_,j)=>j!==i)})}>移除此证据</button></div>)}
            {editing?.stale&&<div className="wb-evidence-note"><div><p>关联作品内容已变。普通编辑会保留原审阅版本；实际复查后才重新确认当前版本。</p><label className="wb-reconfirm"><input type="checkbox" checked={reconfirm} onChange={e=>setReconfirm(e.target.checked)}/>我已重新检查当前项目内容（版本 {projects.find(p=>p.id===draft.projectId)?.revision??"未知"}）</label></div></div>}
          </fieldset><div className="wb-form-footer"><span>{draft.origin==="example" ? "教学示例不会计入实测统计。" : "设备本地保存；导出后请检查可公开的范围。"}</span><button type="button" className="button secondary" disabled={saving} onClick={closeForm}>取消</button><button type="submit" className="button primary" disabled={saving}>{saving ? <LoaderCircle size={16} className="spin"/> : <Check size={16}/>}保存记录</button></div>
        </form>}
      </Modal>
      <Modal open={!!deleteTarget} title="删除这条实践记录？" onClose={()=>{if(!saving)setDeleteTarget(null);}}>
        <div className="wb-delete"><p>「{deleteTarget?.title}」会从本机台账删除。关联创作项目保留。建议先导出此记录备份。</p><div><button className="button secondary" disabled={saving} onClick={()=>setDeleteTarget(null)}>保留记录</button><button className="button danger" disabled={saving} onClick={async()=>{
          if(!deleteTarget)return;setSaving(true);
          try{await api.records.remove(deleteTarget.id,deleteTarget.revision);setRecords(list=>list.filter(r=>r.id!==deleteTarget.id));setDeleteTarget(null);router.push(`/?view=${view}`);setNotice("记录已删除。");}catch(e){setError(messageOf(e));setDeleteTarget(null);}finally{setSaving(false);}
        }}>删除记录</button></div></div>
      </Modal>
    </Shell>
  );
}
function Loading() { return <div className="wb-loading" role="status"><LoaderCircle className="spin" size={23}/><p>正在载入设备本地实践记录…</p></div>; }
function EvaluationFields({value,onChange}:{value:NonNullable<WorkRecordInput["evaluation"]>;onChange:(value:NonNullable<WorkRecordInput["evaluation"]>)=>void}) {
  return <section className="wb-evaluation-fields"><h3>人工实测指标</h3><p>同一个样例 ID 对照相同任务。原始输出、版本与标准同时保留；数值不是自动测得。</p><div className="wb-form-row">{([{key:"caseId",label:"样例 ID"},{key:"model",label:"模型与版本"},{key:"promptVersion",label:"Prompt 版本"}] as const).map(f=><label key={f.key}>{f.label}<input maxLength={120} value={value[f.key]} onChange={e=>onChange({...value,[f.key]:e.target.value})}/></label>)}</div><div className="wb-form-row"><label>任务完成判断<select value={value.completion} onChange={e=>onChange({...value,completion:e.target.value as typeof value.completion})}><option value="unknown">未判定</option><option value="pass">通过</option><option value="fail">失败</option></select></label>{([{key:"score",label:"评分（0—5）",max:5},{key:"factualErrors",label:"事实错误次数"},{key:"interventions",label:"人工干预次数"},{key:"latencyMs",label:"实际耗时（ms）"},{key:"tokens",label:"实际 Tokens"},{key:"cost",label:"现金费用"}] as const).map(f=><label key={f.key}>{f.label}<input type="number" min="0" max={"max" in f ? f.max : undefined} step={f.key==="cost"||f.key==="score" ? "any" : "1"} placeholder="未知" value={value[f.key]??""} onChange={e=>onChange({...value,[f.key]:e.target.value==="" ? null : Number(e.target.value)})}/></label>)}<label>费用币种<select value={value.currency} onChange={e=>onChange({...value,currency:e.target.value as "CNY"|"USD"})}><option value="CNY">CNY</option><option value="USD">USD</option></select></label></div><label>计费依据<input maxLength={6000} placeholder="填写金额时必填；账单文件、回执编号或可核对来源。" value={value.costSource} onChange={e=>onChange({...value,costSource:e.target.value})}/></label></section>;
}
function EvaluationMatrix({records,caseId,onCase,onOpen}:{records:WorkRecord[];caseId:string;onCase:(value:string)=>void;onOpen:(record:WorkRecord)=>void}) {
  const cases=Array.from(new Set(records.map(r=>r.evaluation?.caseId).filter((id):id is string=>!!id)));
  const current=cases.includes(caseId)?caseId:cases[0]||"";
  const rows=records.filter(r=>r.evaluation?.caseId===current&&!!current);
  const conditionKeys=new Set(rows.map(r=>JSON.stringify([r.objective,r.input,r.expected])));
  return <section className="wb-matrix"><div className="wb-panel-heading"><div><h2>同任务对照</h2><p>逐条人工实测；教学示例单独标识，不合并计算胜率。</p></div><label>样例<select value={current} onChange={e=>onCase(e.target.value)}><option value="">尚无样例</option>{cases.map(id=><option key={id} value={id}>{id}</option>)}</select></label></div>{conditionKeys.size>1&&<div className="wb-matrix-warning">同一 ID 下的目标、输入或标准存在差异，请先统一条件。这些记录不能直接比较优劣。</div>}{rows.length ? <div className="wb-table-scroll"><table><caption className="sr-only">同任务模型与 Prompt 版本的人工实测对照</caption><thead><tr>{["模型 / Prompt","完成","评分","事实错误","人工干预","耗时","Tokens","现金费用","原始记录"].map(t=><th key={t} scope="col">{t}</th>)}</tr></thead><tbody>{rows.map(r=>{
    const e=r.evaluation!;return <tr key={r.id}><th scope="row"><b>{e.model||"未填写"}</b><small>{e.promptVersion||"版本未知"} · {origins[r.origin]}</small></th><td><span className={`wb-status ${e.completion==="pass" ? "closed" : e.completion==="fail" ? "retest" : "draft"}`}>{e.completion==="pass" ? "通过" : e.completion==="fail" ? "失败" : "未判定"}</span></td><td>{e.score??"未知"}</td><td>{e.factualErrors??"未知"}</td><td>{e.interventions??"未知"}</td><td>{e.latencyMs===null ? "未知" : `${e.latencyMs} ms`}</td><td>{e.tokens??"未知"}</td><td>{e.cost===null ? "未知" : `${e.cost} ${e.currency}`}</td><td><button onClick={()=>onOpen(r)}>查看 <ArrowUpRight size={13}/></button></td></tr>;
  })}</tbody></table></div> : <div className="wb-matrix-empty"><FlaskConical size={23}/><p>还没有可对照的样例。给每次实测填写相同的样例 ID，并保留同一任务与标准。</p></div>}</section>;
}
function RecordDetail({record:r,project,onEdit,onDelete}:{record:WorkRecord;project?:Project;onEdit:()=>void;onDelete:()=>void}) {
  return <section id="practice-detail" className="wb-detail" aria-label="实践记录详情"><div className="wb-detail-heading"><div><span className="eyebrow">PRACTICE RECORD / V{r.revision}</span><h2>{r.title}</h2><p>{origins[r.origin]} · {recordStatuses[r.status]} · 更新于 {new Date(r.updatedAt).toLocaleString("zh-CN")}</p></div><div><ArchiveLink className="button secondary" href={`/api/records/${r.id}/export`}><Download size={15}/>导出 Markdown</ArchiveLink><button className="button primary" onClick={onEdit}>编辑记录</button><button className="icon-button" onClick={onDelete} aria-label={`删除记录 ${r.title}`}><Trash2 size={17}/></button></div></div>{project&&<div className="wb-detail-project"><GitBranch size={16}/><Link href={projectHref(project.id)}>关联作品：{project.title} <ArrowUpRight size={14}/></Link><span>{r.stale ? "内容已变化 · 需复核" : "关联内容未检测到变化"}</span></div>}{r.origin==="example"&&<div className="wb-matrix-warning">这是教学示例，不作为真实模型表现、实习案例或业务成果。</div>}{r.media&&<MediaSummary media={r.media}/>}<div className="wb-detail-fields">{[["摘要",r.summary],["任务目标",r.objective],["输入与任务",r.input],["通过条件",r.expected],["原始输出与观察",r.observed],["行动与复测",r.action]].map(([label,value])=><div key={label}><h3>{label}</h3><p>{value||"尚未填写"}</p></div>)}</div><div className="wb-detail-evidence"><h3>证据与来源 <span>{r.evidence.length}</span></h3>{r.evidence.map((e,i)=><article key={i}><span>0{i+1}</span><div>{e.url ? <a href={e.url} target="_blank" rel="noreferrer">{e.label}<ExternalLink size={14}/></a> : <b>{e.label}</b>}<p>{e.note||"未填写证据说明"}</p></div></article>)}{!r.evidence.length&&<p>尚未附证据。观察描述与已核实来源需要分别理解。</p>}</div><RecordHistory key={`${r.id}-${r.revision}`} id={r.id}/></section>;
}
function RecordHistory({id}:{id:string}) {
  const [versions,setVersions]=useState<WorkRecord[]|null>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  return <div className="wb-history"><div><button className="button secondary" disabled={loading} onClick={async()=>{
    if(versions){setVersions(null);return;}setLoading(true);setError("");try{setVersions(await api.records.history(id));}catch(e){setError(messageOf(e));}finally{setLoading(false);}
  }}>{loading ? "正在载入版本…" : versions ? "收起原始版本" : "查看原始版本"}<GitBranch size={15}/></button>{versions&&<ArchiveLink className="button subtle" href={`/api/records/${id}/export?format=history`}>导出版本档案 <Download size={14}/></ArchiveLink>}</div>{error&&<ErrorBanner message={error}/>} {versions&&<><p>历史快照保留当时的输入与输出，不代表当前作品已通过审阅；升级前未保存的旧修改无法补造。</p>{versions.map(r=><details key={r.revision}><summary>v{r.revision} · {r.title} · {new Date(r.updatedAt).toLocaleString("zh-CN")}</summary><p>原始观察：{r.observed||"未填写"}</p><p>行动与复测：{r.action||"未填写"}</p><small>证据 {r.evidence.length} 项 · 关联项目版本 {r.projectRevision??"无"}</small></details>)}</>}</div>;
}
