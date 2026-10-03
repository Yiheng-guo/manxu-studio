"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Plus,
  Search,
  Play,
  Clapperboard,
  Sparkles,
  Clock3,
  MoreHorizontal,
  FileText,
  Images,
  AudioLines,
  Film,
  Check,
  RefreshCw,
  FolderOpen,
  Download,
  ChevronRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { styles, type Project, type Settings } from "@/lib/schema";
import { Shell, Modal, ErrorBanner, formatDuration, messageOf } from "./ui";
export function Dashboard() {
  const router = useRouter();
  const query = useSearchParams();
  const view = query.get("view") || "studio";
  const [projects, setProjects] = useState<Project[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [idea, setIdea] = useState("");
  const [style, setStyle] = useState<(typeof styles)[number]>("电影日漫");
  const [ratio, setRatio] = useState<"16:9" | "9:16">("16:9");
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  useEffect(() => {
    let live = true;
    Promise.all([api.list(), api.settings()])
      .then(([p, s]) => {
        if (live) {
          setProjects(p);
          setSettings(s);
        }
      })
      .catch((e) => {
        if (live) setError(messageOf(e));
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, []);
  async function create(demo = false) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const p = await api.create(
        demo
          ? { template: "demo" }
          : {
              title: title.trim() || "未命名的故事",
              idea,
              style,
              ratio,
              characters: [],
              shots: [],
            },
      );
      router.push(`/project/${p.id}`);
    } catch (e) {
      setError(messageOf(e));
      setBusy(false);
    }
  }
  const filtered = projects.filter(
    (p) =>
      (filter === "all" || (filter === "done" ? p.render : !p.render)) &&
      `${p.title} ${p.idea}`.includes(search),
  );
  return (
    <Shell
      crumb={
        {
          studio: "创作工作台",
          assets: "灵感素材库",
          guide: "创作指南",
          settings: "模型与连接",
        }[view] || "创作工作台"
      }
    >
      <div className="dashboard">
        <div className="page-heading">
          <div>
            <span className="eyebrow">YOUR STORIES, FRAME BY FRAME</span>
            <h1>
              {view === "assets"
                ? "让灵感，有迹可循。"
                : view === "guide"
                  ? "你的第一部漫剧，从这里开始。"
                  : view === "settings"
                    ? "连接你的创作能力。"
                    : "把脑海里的故事，变成漫剧。"}
            </h1>
            <p>
              {view === "studio"
                ? "从一个灵感，到一部作品。剧本、分镜与成片，在这里发生。"
                : view === "assets"
                  ? "收集角色与场景，让每个镜头都属于同一个世界。"
                  : view === "guide"
                    ? "四个步骤，把一句话变成可播放的故事。"
                    : "模型负责想象，工作台让想象落地。"}
            </p>
          </div>
          {view === "studio" && (
            <button className="button primary" onClick={() => setOpen(true)}>
              <Plus size={18} />
              新建漫剧
            </button>
          )}
        </div>
        {error && (
          <ErrorBanner message={error} onDismiss={() => setError("")} />
        )}
        {view === "studio" && (
          <>
            <section className="hero">
              <div className="hero-copy">
                <span className="pill light">
                  <Sparkles size={13} />
                  灵感放映室 · 原创示例
                </span>
                <h2>
                  下一站，
                  <br />
                  <span>是你的故事。</span>
                </h2>
                <p>
                  一张写着「明天」的车票，
                  <br />
                  一场与未来自己的意外相遇。
                </p>
                <button
                  className="button ink"
                  onClick={() => create(true)}
                  disabled={busy}
                >
                  打开示例，开始创作 <ArrowRight size={17} />
                </button>
                <div className="hero-meta">
                  <span>4 个分镜</span>
                  <i />
                  <span>电影日漫</span>
                  <i />
                  <span>含原创示例画面</span>
                </div>
              </div>
              <div className="hero-art">
                <img
                  src="/demo/station.png"
                  alt="原创漫剧画面：暮色站台上，短发女孩等待青绿色列车"
                />
                <div className="hero-art-shade" />
                <div className="hero-film-label">
                  <span className="live-square" />
                  FRAMEFLOW ORIGINAL
                </div>
                <div className="hero-art-caption">
                  <span>01 / 开往明天的末班车</span>
                  <button
                    aria-label="打开开往明天的末班车示例"
                    onClick={() => create(true)}
                    disabled={busy}
                  >
                    <Play size={20} fill="currentColor" />
                  </button>
                </div>
                <div className="floating-note">
                  <span className="note-line" />
                  <span>让每一帧，都有故事。</span>
                </div>
              </div>
            </section>
            <div className="workflow-strip">
              {[
                {
                  icon: FileText,
                  n: "01",
                  title: "故事与剧本",
                  desc: "一句灵感，展开完整叙事",
                },
                {
                  icon: Images,
                  n: "02",
                  title: "角色与分镜",
                  desc: "把故事拆成可见的画面",
                },
                {
                  icon: AudioLines,
                  n: "03",
                  title: "配音与字幕",
                  desc: "让角色和情绪有声音",
                },
                {
                  icon: Film,
                  n: "04",
                  title: "预览与成片",
                  desc: "导出属于你的漫剧作品",
                },
              ].map((s, i) => (
                <div className="workflow-item" key={s.n}>
                  <span className="workflow-icon">
                    <s.icon size={20} />
                  </span>
                  <div>
                    <b>
                      <small>{s.n}</small>
                      {s.title}
                    </b>
                    <p>{s.desc}</p>
                  </div>
                  {i < 3 && (
                    <ChevronRight className="workflow-arrow" size={15} />
                  )}
                </div>
              ))}
            </div>
            <section className="projects-section">
              <div className="section-heading">
                <h2>
                  我的作品 <span>{projects.length}</span>
                </h2>
                <div className="project-filters">
                  <div className="segmented">
                    {[
                      ["all", "全部"],
                      ["draft", "创作中"],
                      ["done", "已成片"],
                    ].map(([id, label]) => (
                      <button
                        key={id}
                        className={filter === id ? "selected" : ""}
                        onClick={() => setFilter(id)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <label className="search-box">
                    <Search size={16} />
                    <input
                      aria-label="搜索作品"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="搜索作品…"
                    />
                  </label>
                </div>
              </div>
              {loading ? (
                <div className="loading-grid">
                  {[1, 2, 3].map((i) => (
                    <div className="skeleton" key={i} />
                  ))}
                </div>
              ) : (
                <div className="project-grid">
                  {filtered.map((p) => (
                    <article className="project-card" key={p.id}>
                      <Link href={`/project/${p.id}`} className="project-cover">
                        {p.shots.find((s) => s.imageUrl)?.imageUrl ? (
                          <img
                            alt={p.title + "封面"}
                            src={p.shots.find((s) => s.imageUrl)!.imageUrl}
                          />
                        ) : (
                          <div className="empty-cover">
                            <Clapperboard size={42} />
                            <span>故事正在酝酿</span>
                          </div>
                        )}
                        <span
                          className={`cover-label ${p.render ? "complete" : ""}`}
                        >
                          {p.render
                            ? "已成片"
                            : p.shots.length
                              ? "分镜创作中"
                              : "故事草稿"}
                        </span>
                        <span className="cover-duration">
                          {formatDuration(
                            p.shots.reduce((n, s) => n + s.duration, 0),
                          )}
                        </span>
                      </Link>
                      <div className="project-details">
                        <div>
                          <Link href={`/project/${p.id}`}>
                            <h3>{p.title}</h3>
                          </Link>
                          <button
                            className="icon-button"
                            aria-label={`删除作品 ${p.title}`}
                            onClick={() => setDeleteTarget(p)}
                          >
                            <MoreHorizontal size={20} />
                          </button>
                        </div>
                        <p>
                          {p.style}
                          <span>·</span>
                          {p.shots.length} 个分镜<span>·</span>
                          {p.ratio}
                        </p>
                        <footer>
                          <span>
                            <Clock3 size={12} />
                            {new Date(p.updatedAt).toLocaleDateString(
                              "zh-CN",
                            )}{" "}
                            更新
                          </span>
                          <Link
                            href={`/project/${p.id}`}
                            aria-label={`继续创作 ${p.title}`}
                          >
                            <ArrowUpRight size={16} />
                          </Link>
                        </footer>
                      </div>
                    </article>
                  ))}
                  {!search && filter === "all" && (
                    <button
                      className="new-project-card"
                      onClick={() => setOpen(true)}
                    >
                      <span>
                        <Plus size={28} />
                      </span>
                      <b>新的故事，等你开场</b>
                      <p>把一闪而过的灵感留下来</p>
                      <small>
                        创建新作品 <ArrowRight size={14} />
                      </small>
                    </button>
                  )}
                  {!filtered.length && (search || filter !== "all") && (
                    <div className="empty-state">
                      <FolderOpen size={32} />
                      <h3>还没有找到作品</h3>
                      <p>试试其他关键词或筛选条件。</p>
                    </div>
                  )}
                </div>
              )}
            </section>
            <div className="bottom-tip">
              <span>
                <Sparkles size={17} />
                <b>不必等灵感完美，再开始创作。</b>{" "}
                先写一句话，故事会慢慢长出来。
              </span>
              <Link href="/?view=guide">
                查看创作指南 <ArrowRight size={15} />
              </Link>
            </div>
          </>
        )}
        {view === "assets" && (
          <>
            <div className="section-heading">
              <h2>原创示例画面</h2>
              <span className="muted">预制 AI 示例素材 · 可下载用于本项目</span>
            </div>
            <div className="asset-grid">
              {[
                ["station", "黄昏站台"],
                ["window", "云海列车"],
                ["sunrise", "下一站，出发"],
              ].map(([id, name]) => (
                <article className="asset-card" key={id}>
                  <img src={`/demo/${id}.png`} alt={name} />
                  <div>
                    <h3>{name}</h3>
                    <a
                      className="button subtle"
                      href={`/demo/${id}.png`}
                      download
                    >
                      <Download size={15} />
                      下载画面
                    </a>
                  </div>
                </article>
              ))}
            </div>
            <div className="info-card">
              <h3>让人物跨镜头保持一致</h3>
              <p>
                在作品的「故事设定」中固定角色的发型、服装和标志性配色。生成画面时会自动加入角色描述；最终一致性仍需逐镜审阅，也可以上传你修订后的画面。
              </p>
              <button
                className="button secondary"
                onClick={() => create(true)}
                disabled={busy}
              >
                使用示例开启创作 <ArrowRight size={15} />
              </button>
            </div>
          </>
        )}
        {view === "guide" && (
          <>
            <div className="guide-grid">
              {[
                {
                  n: "01",
                  title: "给故事一个起点",
                  text: "写清主角是谁、遇到什么阻碍、最终发生什么改变。20—60 秒的故事，围绕一个转折就足够。",
                  tip: "例：毕业前夜，一个女孩坐上开往十年后的列车。",
                },
                {
                  n: "02",
                  title: "审阅，再逐镜打磨",
                  text: "AI 生成剧本和镜头后，你可以修改旁白、画面描述和时长。先确认故事，再花时间制作画面。",
                  tip: "建议：每个镜头只表达一个动作或情绪。",
                },
                {
                  n: "03",
                  title: "让画面与声音相遇",
                  text: "逐镜上传漫画图片，或连接图片模型批量生成缺失画面。配音使用本机语音或你配置的语音接口。",
                  tip: "图片：PNG / JPG / WebP，每张不超过 10 MB。",
                },
                {
                  n: "04",
                  title: "把故事交给观众",
                  text: "合成带镜头推拉、字幕和旁白的 MP4，预览后下载。还可以导出 SRT 字幕和项目 JSON 备份。",
                  tip: "这是动态漫画成片，不是角色口型动画。",
                },
              ].map((s) => (
                <article className="guide-card" key={s.n}>
                  <span>{s.n}</span>
                  <h2>{s.title}</h2>
                  <p>{s.text}</p>
                  <small>{s.tip}</small>
                </article>
              ))}
            </div>
            <div className="info-card">
              <h3>用一次创作串起你的实践</h3>
              <p>
                从示例开始，先确认脚本与角色，再逐镜检查。把问题记录到「质量与复测」，修订画面或旁白后，复查局部、相邻镜头和全片。研究、评测与成片可以关联到同一作品。
              </p>
              <button
                className="button primary"
                onClick={() => create(true)}
                disabled={busy}
              >
                从原创示例开始 <ArrowRight size={16} />
              </button>
            </div>
          </>
        )}
        {view === "settings" && (
          <>
            <div className="connection-grid">
              {[
                {
                  title: "剧本模型",
                  icon: FileText,
                  ready: settings?.scriptReady,
                  desc:
                    settings?.scriptProvider === "pi"
                      ? "本机 Pi · 使用已登录模型账号"
                      : settings?.scriptProvider === "openai"
                        ? "兼容 Chat Completions 的模型接口"
                        : "尚未配置，可以先手动创作或体验示例",
                },
                {
                  title: "画面生成",
                  icon: Images,
                  ready: settings?.imageReady,
                  desc: "兼容 Images API；未连接时可以逐镜上传图片",
                },
                {
                  title: "旁白配音",
                  icon: AudioLines,
                  ready: settings?.voiceReady,
                  desc: settings?.voiceProvider || "正在检查…",
                },
                {
                  title: "视频工作进程",
                  icon: Film,
                  ready: settings?.workerReady && settings.ffmpegReady,
                  desc: "独立后台处理 · FFmpeg 本地视频合成",
                },
              ].map((c) => (
                <article className="connection-card" key={c.title}>
                  <c.icon size={23} />
                  <h3>{c.title}</h3>
                  <p>{c.desc}</p>
                  <span className={`status-chip ${c.ready ? "ready" : ""}`}>
                    {c.ready ? (
                      <Check size={13} />
                    ) : (
                      <span className="status-dot" />
                    )}
                    {c.ready ? "已配置" : "待配置"}
                  </span>
                </article>
              ))}
            </div>
            <div className="settings-instructions">
              <h2>配置一次，开始创作</h2>
              <p>
                在项目根目录复制 <code>.env.example</code> 为{" "}
                <code>.env.local</code>
                ，按需填写对应配置，然后重启服务。密钥只保留在服务端，不会出现在浏览器中。
              </p>
              <pre>
                {
                  "AI_PROVIDER=openai\nAI_BASE_URL=你的兼容接口地址\nAI_MODEL=模型名称\nAI_API_KEY=在本地填写密钥\n\nIMAGE_BASE_URL=图片接口地址\nIMAGE_MODEL=图片模型名称\nIMAGE_API_KEY=在本地填写密钥"
                }
              </pre>
              <p>
                已有本机 Pi 登录？设置 <code>AI_PROVIDER=pi</code>、
                <code>PI_PROVIDER</code> 和 <code>PI_MODEL</code>{" "}
                即可。模型调用会使用相应账号额度；「已配置」不代表已验证供应商额度。
              </p>
              <button
                className="button secondary"
                onClick={async () => {
                  try {
                    setSettings(await api.settings());
                  } catch (e) {
                    setError(messageOf(e));
                  }
                }}
              >
                <RefreshCw size={16} />
                重新检查连接
              </button>
            </div>
          </>
        )}
      </div>
      <Modal
        open={open}
        title="开始一个新的故事"
        onClose={() => {
          if (!busy) setOpen(false);
        }}
      >
        <form
          className="create-form"
          onSubmit={(e) => {
            e.preventDefault();
            create();
          }}
        >
          <p className="muted">不用一次想好所有细节，先留下灵感。</p>
          <label>
            作品名称
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="为你的故事起个名字"
              maxLength={60}
              required
            />
          </label>
          <label>
            故事灵感
            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="主角是谁？发生了什么？你想让观众记住什么？"
              maxLength={6000}
              rows={5}
            />
          </label>
          <div className="form-row">
            <label>
              视觉风格
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value as typeof style)}
              >
                {styles.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              画面比例
              <select
                value={ratio}
                onChange={(e) => setRatio(e.target.value as typeof ratio)}
              >
                <option value="16:9">16:9 · 横屏叙事</option>
                <option value="9:16">9:16 · 竖屏短剧</option>
              </select>
            </label>
          </div>
          {error && <ErrorBanner message={error} />}
          <button className="button primary full" disabled={busy} type="submit">
            {busy ? "正在创建…" : "创建作品，进入工作台"}
            <ArrowRight size={17} />
          </button>
          <small className="muted">
            创建不会调用模型。进入工作台后，由你决定何时生成。
          </small>
        </form>
      </Modal>
      <Modal
        open={!!deleteTarget}
        title="删除这部作品？"
        onClose={() => setDeleteTarget(null)}
      >
        <div className="modal-body">
          <p>
            将删除「{deleteTarget?.title}
            」的项目记录。此操作不可撤销，建议先导出项目备份。
          </p>
          <div className="modal-actions">
            <button
              className="button secondary"
              onClick={() => setDeleteTarget(null)}
            >
              保留作品
            </button>
            <button
              className="button danger"
              onClick={async () => {
                if (!deleteTarget) return;
                try {
                  await api.remove(deleteTarget.id);
                  setProjects((v) => v.filter((p) => p.id !== deleteTarget.id));
                  setDeleteTarget(null);
                } catch (e) {
                  setError(messageOf(e));
                  setDeleteTarget(null);
                }
              }}
            >
              删除作品
            </button>
          </div>
        </div>
      </Modal>
    </Shell>
  );
}
