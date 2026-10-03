"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Sparkles,
  Plus,
  Play,
  Pause,
  Upload,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Check,
  Download,
  Film,
  FileText,
  Images,
  AudioLines,
  ArrowUp,
  ArrowDown,
  Square,
  AlertCircle,
  Users,
  Monitor,
  Clock3,
  LoaderCircle,
} from "lucide-react";
import { publicDemo } from "@/lib/public-mode";
import { api } from "@/lib/api";
import {
  activeJob,
  styles,
  type Project,
  type Job,
  type Settings,
  type Shot,
  type JobKind,
} from "@/lib/schema";
import { Shell, Modal, ErrorBanner, formatDuration, messageOf } from "./ui";
export function Editor({ id }: { id: string }) {
  const [project, setProject] = useState<Project | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState<"story" | "board" | "export">("board");
  const [selected, setSelected] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [connected, setConnected] = useState(true);
  const [preview, setPreview] = useState(false);
  const [confirmKind, setConfirmKind] = useState<JobKind | null>(null);
  const [removeShot, setRemoveShot] = useState(false);
  const [pendingKey, setPendingKey] = useState<{
    kind: JobKind;
    key: string;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);
  const busy = activeJob(job);
  const locked = busy || saving || submitting;
  useEffect(() => {
    mounted.current = true;
    Promise.all([api.get(id), api.settings()])
      .then(([data, s]) => {
        if (mounted.current) {
          setProject(data.project);
          setJob(data.job);
          setSettings(s);
          setTab(data.project.shots.length ? "board" : "story");
        }
      })
      .catch((e) => {
        if (mounted.current) setError(messageOf(e));
      })
      .finally(() => {
        if (mounted.current) setLoading(false);
      });
    return () => {
      mounted.current = false;
    };
  }, [id]);
  useEffect(() => {
    if (!busy) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let failures = 0;
    async function poll() {
      try {
        const data = await api.get(id);
        if (stopped) return;
        setConnected(true);
        failures = 0;
        setJob(data.job);
        if (!activeJob(data.job)) {
          setProject(data.project);
          setSelected(0);
          setDirty(false);
          if (data.job?.status === "succeeded" && data.job.kind === "script")
            setTab("board");
          return;
        }
      } catch {
        if (!stopped) {
          setConnected(false);
          failures++;
        }
      }
      if (!stopped)
        timer = setTimeout(
          poll,
          document.hidden ? 5000 : Math.min(1000 * 2 ** failures, 8000),
        );
    }
    timer = setTimeout(poll, 700);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [id, job?.id, busy]);
  useEffect(() => {
    if (!dirty) return;
    const prevent = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty]);
  function edit(fn: (p: Project) => Project) {
    if (locked) return;
    setProject((p) => (p ? fn(p) : p));
    setDirty(true);
    setNotice("");
  }
  function editShot(patch: Partial<Shot>) {
    edit((p) => ({
      ...p,
      shots: p.shots.map((s, i) => (i === selected ? { ...s, ...patch } : s)),
    }));
  }
  async function save(): Promise<Project | null> {
    if (!project) return null;
    if (!dirty) return project;
    setSaving(true);
    setError("");
    try {
      const p = await api.save(project);
      setProject(p);
      setDirty(false);
      setNotice("所有修改已保存");
      return p;
    } catch (e) {
      setError(messageOf(e));
      return null;
    } finally {
      setSaving(false);
    }
  }
  async function startJob(kind: JobKind) {
    if (locked || !project) return;
    setConfirmKind(null);
    setError("");
    setNotice("");
    const p = await save();
    if (!p) return;
    setSubmitting(true);
    const key =
      pendingKey?.kind === kind ? pendingKey.key : crypto.randomUUID();
    setPendingKey({ kind, key });
    try {
      const j = await api.job(id, kind, key);
      setJob(j);
      setPendingKey(null);
      if (kind === "render") setTab("export");
    } catch (e) {
      setError(messageOf(e));
      try {
        const data = await api.get(id);
        if (activeJob(data.job)) {
          setJob(data.job);
          setPendingKey(null);
        }
      } catch {
        setConnected(false);
      }
    } finally {
      setSubmitting(false);
    }
  }
  async function upload(file: File) {
    if (locked || !project) return;
    const current = project.shots[selected];
    const p = await save();
    if (!p) return;
    setSubmitting(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("shotId", current.id);
      form.append("revision", String(p.revision));
      const updated = await api.upload(id, form);
      setProject(updated);
      setNotice("画面已上传并保存");
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setSubmitting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }
  function addShot() {
    edit((p) => ({
      ...p,
      shots: [
        ...p.shots,
        {
          id: crypto.randomUUID(),
          title: `第 ${p.shots.length + 1} 镜`,
          description: "",
          narration: "",
          imagePrompt: "",
          duration: 6,
          camera: "缓慢推进",
          imageUrl: "",
          imageSource: "none",
        },
      ],
    }));
    setSelected(project?.shots.length || 0);
  }
  function moveShot(direction: number) {
    if (!project) return;
    const dest = selected + direction;
    if (dest < 0 || dest >= project.shots.length) return;
    edit((p) => {
      const shots = [...p.shots];
      [shots[selected], shots[dest]] = [shots[dest], shots[selected]];
      return { ...p, shots };
    });
    setSelected(dest);
  }
  function downloadProject() {
    if (!project) return;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(project, null, 2)], {
        type: "application/json",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.title}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const shot = project?.shots[selected];
  const imageCount = project?.shots.filter((s) => s.imageUrl).length || 0;
  const seconds = project?.shots.reduce((t, s) => t + s.duration, 0) || 0;
  const outdated =
    !!project?.render &&
    (dirty || project.render.revision < project.revision - 1);
  return (
    <Shell
      crumb={project?.title || "漫剧编辑器"}
      action={
        <Link href="/?view=studio" className="topbar-link">
          <ArrowLeft size={14} />
          返回作品
        </Link>
      }
    >
      <div className="editor-page">
        {loading ? (
          <div className="page-loading">
            <LoaderCircle className="spin" />
            <p>正在载入你的故事…</p>
          </div>
        ) : !project ? (
          <div className="empty-state">
            <AlertCircle size={36} />
            <h2>暂时无法打开作品</h2>
            <p>{error}</p>
            <Link href="/" className="button primary">
              返回工作台
            </Link>
          </div>
        ) : (
          <>
            <div className="editor-heading">
              <div>
                <div className="editor-eyebrow">
                  <span className="eyebrow">STORY STUDIO</span>
                  <span className="status-chip">
                    {project.scriptSource === "demo"
                      ? "原创示例"
                      : project.scriptSource === "ai"
                        ? "AI 辅助创作"
                        : "我的原创"}
                  </span>
                </div>
                <h1>{project.title}</h1>
                <p>
                  <span>{project.style}</span>
                  <i /> <span>{project.ratio}</span>
                  <i />
                  <span>{project.shots.length} 个分镜</span>
                  <i />
                  <span>计划 {formatDuration(seconds)}</span>
                </p>
              </div>
              <div className="editor-actions">
                <span className="save-status">
                  {saving
                    ? "保存中…"
                    : dirty
                      ? "有未保存的修改"
                      : notice || "已保存到本地"}
                </span>
                <button
                  className="button secondary"
                  disabled={!dirty || locked}
                  onClick={() => save()}
                >
                  <Save size={16} />
                  {saving ? "保存中" : "保存"}
                </button>
                <button
                  className="button secondary"
                  disabled={!project.shots.length}
                  onClick={() => setPreview(true)}
                >
                  <Play size={16} />
                  分镜预演
                </button>
                <button
                  className="button primary"
                  onClick={() => setTab("export")}
                >
                  <Film size={16} />
                  导出成片
                </button>
              </div>
            </div>
            <div className="project-practice-bar">
              <span>把当前作品纳入实践记录：{dirty ? "请先保存修改，再记录审阅或问题。" : "先确认、再制作；局部修订后复查相邻镜头与全片。"}</span>
              <div>
                <Link href={`/?view=research&project=${project.id}`}>研究依据</Link>
                <Link href={`/?view=evaluation&project=${project.id}`}>评测记录</Link>
                <Link href={`/?view=quality&project=${project.id}`}>审阅与复测</Link>
              </div>
            </div>
            <div className="editor-tabs" role="tablist" aria-label="创作阶段">
              {[
                {
                  id: "story",
                  label: "故事设定",
                  icon: FileText,
                  desc: "剧本与角色",
                },
                {
                  id: "board",
                  label: "分镜画面",
                  icon: Images,
                  desc: "逐镜打磨",
                },
                {
                  id: "export",
                  label: "配音成片",
                  icon: Film,
                  desc: "预览与导出",
                },
              ].map((t, i) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id as typeof tab)}
                  className={tab === t.id ? "active" : ""}
                >
                  <span className="step-number">0{i + 1}</span>
                  <t.icon size={18} />
                  <b>{t.label}</b>
                  <small>{t.desc}</small>
                  {i < 2 && <ChevronRight size={16} />}
                </button>
              ))}
            </div>
            {error && (
              <ErrorBanner message={error} onDismiss={() => setError("")} />
            )}
            {!connected && (
              <ErrorBanner message="连接暂时中断，任务可能仍在后台执行。正在尝试恢复，请勿重复提交。" />
            )}
            {job && (
              <div
                className={`job-banner ${job.status === "failed" ? "job-failed" : ""}`}
                role="status"
              >
                <div className="job-icon">
                  {busy ? (
                    <LoaderCircle className="spin" size={20} />
                  ) : job.status === "failed" ? (
                    <AlertCircle size={20} />
                  ) : job.status === "cancelled" ? (
                    <Square size={18} />
                  ) : (
                    <Check size={20} />
                  )}
                </div>
                <div>
                  <b>{job.message}</b>
                  <p>
                    {job.error ||
                      (busy
                        ? "可以离开或刷新页面，任务会在后台继续。"
                        : "已保存的结果可以继续编辑。")}
                  </p>
                  {busy && (
                    <div className="progress-track">
                      <span style={{ width: job.progress + "%" }} />
                    </div>
                  )}
                </div>
                {busy ? (
                  <button
                    className="button subtle"
                    onClick={async () => {
                      try {
                        setJob(await api.cancel(job.id));
                        const data = await api.get(id);
                        setProject(data.project);
                      } catch (e) {
                        setError(messageOf(e));
                      }
                    }}
                  >
                    取消任务
                  </button>
                ) : (
                  <button
                    className="icon-button"
                    aria-label="收起任务提示"
                    onClick={() => setJob(null)}
                  >
                    ×
                  </button>
                )}
              </div>
            )}
            {tab === "story" && (
              <div className="story-layout">
                <section className="surface story-form">
                  <div className="panel-heading">
                    <h2>
                      <FileText size={19} />
                      故事的起点
                    </h2>
                    <span className="muted">先讲清楚，再让画面发生</span>
                  </div>
                  <fieldset disabled={locked}>
                    <label>
                      作品名称
                      <input
                        value={project.title}
                        maxLength={60}
                        onChange={(e) =>
                          edit((p) => ({ ...p, title: e.target.value }))
                        }
                      />
                    </label>
                    <label>
                      故事创意
                      <textarea
                        rows={7}
                        value={project.idea}
                        maxLength={6000}
                        placeholder="写下主角、冲突和结局，或粘贴你的短篇故事…"
                        onChange={(e) =>
                          edit((p) => ({ ...p, idea: e.target.value }))
                        }
                      />
                    </label>
                    <div className="form-row">
                      <label>
                        视觉风格
                        <select
                          value={project.style}
                          onChange={(e) =>
                            edit((p) => ({
                              ...p,
                              style: e.target.value as Project["style"],
                            }))
                          }
                        >
                          {styles.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        画面比例
                        <select
                          value={project.ratio}
                          onChange={(e) =>
                            edit((p) => ({
                              ...p,
                              ratio: e.target.value as Project["ratio"],
                            }))
                          }
                        >
                          <option value="16:9">16:9 · 横屏叙事</option>
                          <option value="9:16">9:16 · 竖屏短剧</option>
                        </select>
                      </label>
                    </div>
                  </fieldset>
                  <div className="generation-callout">
                    <span className="spark-box">
                      <Sparkles size={24} />
                    </span>
                    <div>
                      <h3>让灵感展开成故事</h3>
                      <p>
                        生成角色档案、旁白和可编辑分镜。你始终拥有最后的决定权。
                      </p>
                    </div>
                  </div>
                  <button
                    className="button primary"
                    disabled={
                      locked || !project.idea.trim() || !settings?.scriptReady
                    }
                    onClick={() =>
                      project.shots.length
                        ? setConfirmKind("script")
                        : startJob("script")
                    }
                  >
                    <Sparkles size={17} />
                    {busy && job?.kind === "script"
                      ? "正在构思故事…"
                      : "AI 生成剧本与分镜"}
                  </button>
                  {!settings?.scriptReady && (
                    <p className="inline-help">
                      剧本模型尚未配置。你可以{" "}
                      <Link href="/?view=settings">查看连接方法</Link>
                      ，也可以直接手动添加分镜。
                    </p>
                  )}
                  <p className="inline-help">
                    调用已配置的模型，使用相应账号额度。生成完成后不会自动开始生图。
                  </p>
                </section>
                <section className="surface character-panel">
                  <div className="panel-heading">
                    <h2>
                      <Users size={19} />
                      角色档案
                    </h2>
                    <button
                      className="icon-button"
                      aria-label="添加角色"
                      disabled={locked || project.characters.length >= 8}
                      onClick={() =>
                        edit((p) => ({
                          ...p,
                          characters: [
                            ...p.characters,
                            {
                              id: crypto.randomUUID(),
                              name: "新角色",
                              description: "",
                              color: "#689b99",
                            },
                          ],
                        }))
                      }
                    >
                      <Plus size={19} />
                    </button>
                  </div>
                  <p className="muted">
                    固定外貌与服装，让同一个角色走过每一镜。
                  </p>
                  {project.characters.map((c, i) => (
                    <fieldset
                      disabled={locked}
                      className="character-card"
                      key={c.id}
                    >
                      <div className="character-card-top">
                        <span
                          className="character-avatar"
                          style={{ background: c.color }}
                        >
                          {c.name.slice(0, 1)}
                        </span>
                        <label className="sr-only" htmlFor={`char-${c.id}`}>
                          角色 {i + 1} 名称
                        </label>
                        <input
                          id={`char-${c.id}`}
                          value={c.name}
                          maxLength={40}
                          onChange={(e) =>
                            edit((p) => ({
                              ...p,
                              characters: p.characters.map((x) =>
                                x.id === c.id
                                  ? { ...x, name: e.target.value }
                                  : x,
                              ),
                            }))
                          }
                        />
                        <button
                          className="icon-button"
                          aria-label={`删除角色 ${c.name}`}
                          onClick={() =>
                            edit((p) => ({
                              ...p,
                              characters: p.characters.filter(
                                (x) => x.id !== c.id,
                              ),
                            }))
                          }
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <label>
                        外貌与性格
                        <textarea
                          rows={4}
                          value={c.description}
                          maxLength={600}
                          placeholder="发型、服装、配色、性格…"
                          onChange={(e) =>
                            edit((p) => ({
                              ...p,
                              characters: p.characters.map((x) =>
                                x.id === c.id
                                  ? { ...x, description: e.target.value }
                                  : x,
                              ),
                            }))
                          }
                        />
                      </label>
                    </fieldset>
                  ))}
                  {!project.characters.length && (
                    <div className="small-empty">
                      <Users size={30} />
                      <p>给主角一张自己的名片</p>
                      <small>手动添加，或由 AI 随剧本生成。</small>
                    </div>
                  )}
                </section>
              </div>
            )}
            {tab === "board" && (
              <>
                <div className="board-toolbar">
                  <div>
                    <h2>
                      分镜故事板 <span>{project.shots.length}</span>
                    </h2>
                    <p>
                      {imageCount} / {project.shots.length} 个画面已就绪 ·
                      点击镜头开始编辑
                    </p>
                  </div>
                  <div className="toolbar-buttons">
                    <button
                      className="button secondary"
                      disabled={locked || project.shots.length >= 12}
                      onClick={addShot}
                    >
                      <Plus size={16} />
                      添加分镜
                    </button>
                    <button
                      className="button secondary"
                      disabled={
                        locked ||
                        !settings?.imageReady ||
                        !project.shots.length ||
                        imageCount === project.shots.length
                      }
                      onClick={() => setConfirmKind("images")}
                    >
                      <Sparkles size={16} />
                      生成缺失画面
                    </button>
                  </div>
                </div>
                {!settings?.imageReady && (
                  <div className="quiet-note">
                    <Images size={15} />
                    <span>
                      当前可逐镜上传画面；连接图片模型后可批量生成。示例画面为预制原创素材。
                    </span>
                    <Link href="/?view=settings">
                      连接模型 <ArrowUpRightSmall />
                    </Link>
                  </div>
                )}
                {!project.shots.length ? (
                  <div className="surface empty-state">
                    <ClapperboardIcon />
                    <h2>故事还在等它的第一镜</h2>
                    <p>先生成剧本，或手动添加一个分镜。</p>
                    <div className="toolbar-buttons">
                      <button
                        className="button primary"
                        onClick={() => setTab("story")}
                      >
                        <Sparkles size={16} />
                        前往故事设定
                      </button>
                      <button className="button secondary" onClick={addShot}>
                        <Plus size={16} />
                        手动添加分镜
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="board-layout">
                    <div className="shots-grid">
                      {project.shots.map((s, i) => (
                        <button
                          key={s.id}
                          className={`shot-card ${i === selected ? "selected" : ""}`}
                          aria-label={`编辑分镜 ${i + 1} ${s.title}`}
                          aria-pressed={i === selected}
                          onClick={() => {
                            setSelected(i);
                            if (window.innerWidth < 1000)
                              document
                                .getElementById("shot-inspector")
                                ?.scrollIntoView({
                                  behavior: "smooth",
                                  block: "start",
                                });
                          }}
                        >
                          <div
                            className={`shot-art ${project.ratio === "9:16" ? "portrait-thumb" : ""}`}
                          >
                            {s.imageUrl ? (
                              <img
                                src={s.imageUrl}
                                alt={s.description || s.title}
                              />
                            ) : (
                              <div className="shot-placeholder">
                                <Images size={30} />
                                <span>等待画面</span>
                                <small>选中后上传或生成</small>
                              </div>
                            )}
                            <span className="shot-index">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <span className="shot-length">
                              <Clock3 size={12} />
                              {s.duration}s
                            </span>
                            {i === selected && (
                              <span className="shot-check">
                                <Check size={13} />
                              </span>
                            )}
                          </div>
                          <div className="shot-card-body">
                            <div>
                              <h3>{s.title}</h3>
                              <span>{s.camera}</span>
                            </div>
                            <p>{s.narration || "为这个镜头写一句旁白…"}</p>
                            <footer>
                              <span
                                className={`source-chip ${s.imageUrl ? "has-image" : ""}`}
                              >
                                <span />
                                {
                                  {
                                    none: "待制作",
                                    demo: "示例素材",
                                    upload: "已上传",
                                    ai: "AI 生成",
                                  }[s.imageSource]
                                }
                              </span>
                              <small>
                                镜头 {String(i + 1).padStart(2, "0")}
                              </small>
                            </footer>
                          </div>
                        </button>
                      ))}
                    </div>
                    {shot && (
                      <aside id="shot-inspector" className="surface inspector">
                        <div className="inspector-heading">
                          <h2>
                            镜头 {String(selected + 1).padStart(2, "0")}{" "}
                            <span>编辑详情</span>
                          </h2>
                          <div>
                            <button
                              className="icon-button"
                              aria-label="上一个镜头"
                              disabled={selected === 0}
                              onClick={() => setSelected((v) => v - 1)}
                            >
                              <ChevronLeft size={17} />
                            </button>
                            <button
                              className="icon-button"
                              aria-label="下一个镜头"
                              disabled={selected === project.shots.length - 1}
                              onClick={() => setSelected((v) => v + 1)}
                            >
                              <ChevronRight size={17} />
                            </button>
                          </div>
                        </div>
                        <fieldset disabled={locked}>
                          <label>
                            镜头标题
                            <input
                              value={shot.title}
                              maxLength={80}
                              onChange={(e) =>
                                editShot({ title: e.target.value })
                              }
                            />
                          </label>
                          <label>
                            旁白 / 台词
                            <textarea
                              rows={3}
                              value={shot.narration}
                              maxLength={160}
                              placeholder="这个镜头里，观众会听到什么？"
                              onChange={(e) =>
                                editShot({ narration: e.target.value })
                              }
                            />
                            <small>{shot.narration.length} / 160</small>
                          </label>
                          <div className="form-row">
                            <label>
                              时长（秒）
                              <input
                                type="number"
                                min={2}
                                max={30}
                                value={shot.duration}
                                onChange={(e) =>
                                  editShot({ duration: Number(e.target.value) })
                                }
                              />
                            </label>
                            <label>
                              镜头运动
                              <select
                                value={shot.camera}
                                onChange={(e) =>
                                  editShot({
                                    camera: e.target.value as Shot["camera"],
                                  })
                                }
                              >
                                <option>缓慢推进</option>
                                <option>缓慢拉远</option>
                                <option>固定镜头</option>
                              </select>
                            </label>
                          </div>
                          <label>
                            画面描述
                            <textarea
                              rows={3}
                              value={shot.description}
                              maxLength={1400}
                              onChange={(e) =>
                                editShot({ description: e.target.value })
                              }
                            />
                          </label>
                          <details className="prompt-details continuity-details">
                            <summary>角色、道具与连续性镜头卡</summary>
                            <p>先确认人物和道具的起止状态，再制作画面。填写的准确台词用于审阅；配音仍使用上方旁白 / 台词。</p>
                            {([{key:"characters",label:"本镜角色",max:600},{key:"props",label:"本镜道具",max:600},{key:"entryState",label:"镜头起始状态",max:1000},{key:"exitState",label:"镜头结束状态",max:1000},{key:"dialogue",label:"准确台词（审阅用）",max:600}] as const).map(f=><label key={f.key}>{f.label}<textarea rows={2} maxLength={f.max} value={shot.continuity?.[f.key] || ""} onChange={e=>editShot({continuity:{characters:"",props:"",entryState:"",exitState:"",dialogue:"",...shot.continuity,[f.key]:e.target.value}})}/></label>)}
                            <p>上一镜结束：{project.shots[selected-1]?.continuity?.exitState || "尚无记录"}</p>
                            <p>下一镜起始：{project.shots[selected+1]?.continuity?.entryState || "尚无记录"}</p>
                          </details>
                          <details className="prompt-details">
                            <summary>
                              <Sparkles size={14} />
                              画面生成提示词
                            </summary>
                            <label>
                              <span className="sr-only">画面生成提示词</span>
                              <textarea
                                rows={4}
                                value={shot.imagePrompt}
                                maxLength={2000}
                                onChange={(e) =>
                                  editShot({ imagePrompt: e.target.value })
                                }
                              />
                            </label>
                            <p>角色档案会自动加入生图请求。</p>
                          </details>
                          <button
                            className="button secondary full"
                            disabled={publicDemo}
                            onClick={() => fileRef.current?.click()}
                          >
                            <Upload size={16} />
                            {shot.imageUrl ? "替换这张画面" : "上传分镜画面"}
                          </button>
                          <input
                            className="sr-only"
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            ref={fileRef}
                            aria-label="上传分镜图片"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) upload(file);
                            }}
                          />
                          <p className="inline-help centered">
                            {publicDemo ? "公网版可编辑镜头；图片上传使用完整本机版。" : "PNG / JPG / WebP · 不超过 10 MB"}
                          </p>
                          <div className="inspector-tools">
                            <button
                              className="icon-button"
                              aria-label="镜头上移"
                              disabled={selected === 0}
                              onClick={() => moveShot(-1)}
                            >
                              <ArrowUp size={16} />
                            </button>
                            <button
                              className="icon-button"
                              aria-label="镜头下移"
                              disabled={selected === project.shots.length - 1}
                              onClick={() => moveShot(1)}
                            >
                              <ArrowDown size={16} />
                            </button>
                            {shot.imageUrl && (
                              <button
                                className="text-button"
                                onClick={() =>
                                  editShot({
                                    imageUrl: "",
                                    imageSource: "none",
                                  })
                                }
                              >
                                移除画面
                              </button>
                            )}
                            <button
                              className="icon-button danger-text"
                              aria-label="删除当前镜头"
                              onClick={() => setRemoveShot(true)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </fieldset>
                      </aside>
                    )}
                  </div>
                )}
              </>
            )}
            {tab === "export" && (
              <div className="export-layout">
                <section className="surface export-preview">
                  <div className="panel-heading">
                    <h2>
                      <Film size={20} />
                      成片放映室
                    </h2>
                    <span className="pill">{project.ratio} · MP4</span>
                  </div>
                  {project.render ? (
                    <>
                      <video
                        key={project.render.videoUrl}
                        controls
                        preload="metadata"
                        poster={project.shots[0]?.imageUrl || undefined}
                        src={project.render.videoUrl}
                        aria-label="漫剧成片播放器"
                      />
                      <div className="render-meta">
                        <span>
                          {formatDuration(project.render.duration)} ·{" "}
                          {project.render.hasAudio
                            ? "包含配音与字幕"
                            : "含字幕 · 无配音"}
                        </span>
                        <span>
                          {new Date(project.render.createdAt).toLocaleString(
                            "zh-CN",
                          )}
                        </span>
                      </div>
                      {outdated && (
                        <div className="warning-note">
                          你已修改项目。这是上一次成片，请重新合成以应用最新内容。
                        </div>
                      )}
                      <div className="download-actions">
                        <a
                          className="button primary"
                          href={project.render.videoUrl + "?download=1"}
                          download
                        >
                          <Download size={16} />
                          下载 MP4
                        </a>
                        <a
                          className="button secondary"
                          href={project.render.srtUrl + "?download=1"}
                          download
                        >
                          <FileText size={16} />
                          下载字幕
                        </a>
                      </div>
                    </>
                  ) : (
                    <div
                      className="film-empty"
                      style={
                        project.shots[0]?.imageUrl
                          ? {
                              backgroundImage: `linear-gradient(0deg,rgba(16,22,23,.8),rgba(16,22,23,.3)),url(${project.shots[0].imageUrl})`,
                            }
                          : undefined
                      }
                    >
                      <span>
                        <Play size={35} />
                      </span>
                      <h3>你的故事，即将上映。</h3>
                      <p>准备好分镜画面，点击右侧「开始合成」。</p>
                    </div>
                  )}
                  <div className="export-notes">
                    <h3>每个镜头，都有自己的节奏</h3>
                    <p>
                      成片会加入你选择的镜头推拉、旁白和字幕。若配音比设定时长更长，会延长镜头以保留完整台词。
                    </p>
                    <button
                      className="text-button"
                      onClick={() => setPreview(true)}
                      disabled={!project.shots.length}
                    >
                      <Play size={14} />
                      先看分镜预演 <ArrowRight size={14} />
                    </button>
                  </div>
                </section>
                <aside className="surface export-settings">
                  <h2>成片设置</h2>
                  <div className="export-setting">
                    <Monitor size={18} />
                    <span>画面规格</span>
                    <b>
                      {project.ratio === "16:9" ? "1280 × 720" : "720 × 1280"}
                    </b>
                  </div>
                  <div className="export-setting">
                    <Clock3 size={18} />
                    <span>预计时长</span>
                    <b>{formatDuration(seconds)}</b>
                  </div>
                  <div className="export-setting">
                    <AudioLines size={18} />
                    <span>旁白配音</span>
                    <b>
                      {settings?.voiceReady ? settings.voiceProvider : "无配音"}
                    </b>
                  </div>
                  <div className="export-setting">
                    <FileText size={18} />
                    <span>字幕</span>
                    <b>画面字幕 + SRT</b>
                  </div>
                  <div className="readiness">
                    <h3>开拍前，检查一下</h3>
                    {[
                      [!!project.shots.length, "剧本与分镜已准备"],
                      [
                        !!project.shots.length &&
                          imageCount === project.shots.length,
                        `画面已准备 ${imageCount} / ${project.shots.length}`,
                      ],
                      [
                        !!settings?.ffmpegReady && !!settings?.workerReady,
                        "视频合成服务就绪",
                      ],
                    ].map(([ok, label]) => (
                      <div key={String(label)} className={ok ? "ok" : ""}>
                        {ok ? <Check size={16} /> : <AlertCircle size={16} />}
                        <span>{String(label)}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    className="button primary full"
                    disabled={
                      locked ||
                      !project.shots.length ||
                      imageCount !== project.shots.length ||
                      !settings?.ffmpegReady ||
                      !settings?.workerReady
                    }
                    onClick={() => setConfirmKind("render")}
                  >
                    <ClapperboardIcon small />
                    {busy && job?.kind === "render"
                      ? "正在合成…"
                      : project.render
                        ? "重新合成成片"
                        : "开始合成成片"}
                  </button>
                  <p className="inline-help">
                    合成在本机后台执行。关闭页面不会取消任务，已完成的作品保留在本地。
                  </p>
                  <hr />
                  <button
                    className="button secondary full"
                    onClick={downloadProject}
                  >
                    <Download size={16} />
                    导出项目 JSON
                  </button>
                  <p className="inline-help">
                    包含剧本、角色和分镜信息。媒体备份请同时保留 data 目录。
                  </p>
                </aside>
              </div>
            )}
          </>
        )}
      </div>
      <Modal
        open={!!confirmKind}
        title={
          confirmKind === "script"
            ? "重新生成剧本与分镜？"
            : confirmKind === "images"
              ? "开始制作分镜画面？"
              : "准备让故事上映？"
        }
        onClose={() => setConfirmKind(null)}
      >
        <div className="modal-body">
          <p>
            {confirmKind === "script"
              ? "新的 AI 结果会替换当前角色与分镜，成功后原来的手动修改和画面关联将被替换。建议先导出项目 JSON。"
              : confirmKind === "images"
                ? "只为没有画面的分镜生成图片，已有画面会保留。请求会发送到你配置的图片服务，并使用对应账号额度。"
                : `将合成 ${project?.shots.length || 0} 个镜头，${settings?.voiceReady ? "包含旁白配音和字幕" : "当前没有配音服务，将导出带字幕的无配音成片"}。`}
          </p>
          <div className="modal-actions">
            <button
              className="button secondary"
              onClick={() => setConfirmKind(null)}
            >
              再检查一下
            </button>
            <button
              className="button primary"
              disabled={locked}
              onClick={() => {
                if (confirmKind) startJob(confirmKind);
              }}
            >
              {" "}
              {confirmKind === "script"
                ? "替换并生成"
                : confirmKind === "images"
                  ? "生成缺失画面"
                  : "开始合成"}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </Modal>
      <Modal
        open={removeShot}
        title="删除这个分镜？"
        onClose={() => setRemoveShot(false)}
      >
        <div className="modal-body">
          <p>将从故事板中移除「{shot?.title}」。保存后生效。</p>
          <div className="modal-actions">
            <button
              className="button secondary"
              onClick={() => setRemoveShot(false)}
            >
              保留
            </button>
            <button
              className="button danger"
              onClick={() => {
                edit((p) => ({
                  ...p,
                  shots: p.shots.filter((_, i) => i !== selected),
                }));
                setSelected(Math.max(0, selected - 1));
                setRemoveShot(false);
              }}
            >
              删除分镜
            </button>
          </div>
        </div>
      </Modal>
      {project && (
        <StoryboardPreview
          open={preview}
          onClose={() => setPreview(false)}
          project={project}
        />
      )}
    </Shell>
  );
}
function ArrowUpRightSmall() {
  return <ArrowRight size={13} />;
}
function ClapperboardIcon({ small = false }: { small?: boolean }) {
  return <Film size={small ? 17 : 34} />;
}
function StoryboardPreview({
  open,
  onClose,
  project,
}: {
  open: boolean;
  onClose: () => void;
  project: Project;
}) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const shot = project.shots[index] || project.shots[0];
  useEffect(() => {
    if (!open || !playing || !shot) return;
    const timer = setInterval(() => setElapsed((v) => v + 0.1), 100);
    return () => clearInterval(timer);
  }, [open, playing, shot]);
  useEffect(() => {
    if (!shot || elapsed < shot.duration) return;
    const timer = setTimeout(() => {
      setElapsed(0);
      if (index < project.shots.length - 1) setIndex((i) => i + 1);
      else {
        setPlaying(false);
        setIndex(0);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [elapsed, index, project.shots.length, shot]);
  return (
    <Modal
      open={open}
      title="分镜预演"
      wide
      onClose={() => {
        setPlaying(false);
        onClose();
      }}
    >
      <div className="preview-body">
        {shot ? (
          <>
            <div
              className={`preview-screen ${project.ratio === "9:16" ? "vertical" : ""}`}
            >
              {shot.imageUrl ? (
                <img src={shot.imageUrl} alt={shot.title} />
              ) : (
                <div className="shot-placeholder">
                  <Images size={40} />
                  <p>这个镜头尚未添加画面</p>
                </div>
              )}
              <span className="preview-counter">
                {index + 1} / {project.shots.length}
              </span>
              <p>{shot.narration}</p>
            </div>
            <div className="preview-controls">
              <button
                className="icon-button"
                aria-label="预演上一个镜头"
                disabled={index === 0}
                onClick={() => {
                  setIndex((i) => i - 1);
                  setElapsed(0);
                }}
              >
                <ChevronLeft size={22} />
              </button>
              <button
                className="button primary"
                onClick={() => setPlaying((p) => !p)}
              >
                {playing ? <Pause size={17} /> : <Play size={17} />}{" "}
                {playing ? "暂停" : "播放"}
              </button>
              <button
                className="icon-button"
                aria-label="预演下一个镜头"
                disabled={index >= project.shots.length - 1}
                onClick={() => {
                  setIndex((i) => i + 1);
                  setElapsed(0);
                }}
              >
                <ChevronRight size={22} />
              </button>
              <span>
                {shot.title} · {formatDuration(elapsed)} /{" "}
                {formatDuration(shot.duration)}
              </span>
            </div>
            <div className="preview-timeline">
              {project.shots.map((s, i) => (
                <button
                  className={i === index ? "active" : ""}
                  key={s.id}
                  aria-label={`跳转到镜头 ${i + 1}`}
                  onClick={() => {
                    setIndex(i);
                    setElapsed(0);
                  }}
                >
                  <span
                    style={{
                      width:
                        i < index
                          ? "100%"
                          : i === index
                            ? `${(elapsed / s.duration) * 100}%`
                            : "0%",
                    }}
                  />
                </button>
              ))}
            </div>
            <p className="inline-help centered">
              此处为无配音分镜预演。配音、字幕与镜头推拉效果请在合成后查看成片。
            </p>
          </>
        ) : (
          <p>请先添加分镜。</p>
        )}
      </div>
    </Modal>
  );
}
