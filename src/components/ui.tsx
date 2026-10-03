"use client";
import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Clapperboard,
  LayoutDashboard,
  Images,
  BookOpen,
  Settings2,
  ArrowUpRight,
  ChevronRight,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Film,
  FlaskConical,
  ScanSearch,
  ShieldCheck,
  Library,
  MessagesSquare,
} from "lucide-react";
import { useState, Suspense } from "react";
export function Brand() {
  return (
    <Link href="/" className="brand">
      <span className="brand-mark">
        <Clapperboard size={24} />
      </span>
      <span>
        <strong>
          漫序<span className="brand-dot">.</span>
        </strong>
        <small>FRAMEFLOW</small>
      </span>
    </Link>
  );
}
function SidebarNav() {
  const path = usePathname();
  const query = useSearchParams();
  const view = query.get("view") || "overview";
  return (
    <nav aria-label="主导航">
      {[
        { id: "overview", name: "实践总览", icon: LayoutDashboard },
        { id: "research", name: "研究与需求", icon: ScanSearch },
        { id: "evaluation", name: "模型评测", icon: FlaskConical },
        { id: "studio", name: "漫剧创作", icon: Clapperboard },
        { id: "quality", name: "质量与复测", icon: ShieldCheck },
        { id: "sharing", name: "知识分享", icon: MessagesSquare },
        { id: "methods", name: "方法与 Skill", icon: Library },
      ].map((item) => (
        <Link
          className={`nav-item ${(view === item.id && path === "/") || (item.id === "studio" && path.startsWith("/project/")) ? "active" : ""}`}
          href={item.id === "overview" ? "/" : `/?view=${item.id}`}
          key={item.id}
        >
          <item.icon size={19} />
          {item.name}
          {item.id === "overview" && <span className="nav-dot" />}
        </Link>
      ))}
      <div className="nav-divider" />
      <span className="nav-label">工具与资源</span>
      <Link className={`nav-item ${view === "assets" ? "active" : ""}`} href="/?view=assets"><Images size={19} />素材库</Link>
      <Link className={`nav-item ${view === "guide" ? "active" : ""}`} href="/?view=guide"><BookOpen size={19} />使用指南</Link>
      <Link
        className={`nav-item ${view === "settings" ? "active" : ""}`}
        href="/?view=settings"
      >
        <Settings2 size={19} />
        模型与连接
      </Link>
    </nav>
  );
}
export function Shell({
  children,
  crumb = "创作工作台",
  action,
}: {
  children: ReactNode;
  crumb?: string;
  action?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        跳到主要内容
      </a>
      {open && (
        <button
          className="sidebar-scrim"
          aria-label="关闭导航"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={`sidebar ${open ? "is-open" : ""}`} onClick={(e)=>{if((e.target as HTMLElement).closest("a"))setOpen(false);}}>
        <div className="sidebar-top">
          <Brand />
          <button
            className="icon-button mobile-only"
            aria-label="收起导航"
            onClick={() => setOpen(false)}
          >
            <PanelLeftClose size={20} />
          </button>
        </div>
        <div className="workspace-switch">
          <span className="workspace-avatar">Y</span>
          <div>
            <b>我的实践空间</b>
            <small>AIGC 产品与创作</small>
          </div>
          <ChevronRight size={14} />
        </div>
        <span className="nav-label">工作台</span>
        <Suspense>
          <SidebarNav />
        </Suspense>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <Film size={22} />
            <p>
              从问题出发，
              <br />
              让每次实践有据可循。
            </p>
            <Link href="/?view=methods">
              六项方法资产 <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="profile">
            <div className="avatar">Y</div>
            <div>
              <b>Yiheng 的工作室</b>
              <small>个人沉淀 · 本机保存</small>
            </div>
            <span className="online-dot" />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-only"
              aria-label="展开导航"
              onClick={() => setOpen(true)}
            >
              <PanelLeftOpen size={21} />
            </button>
            <span>个人工作空间</span>
            <ChevronRight size={14} />
            <b>{crumb}</b>
          </div>
          <div className="topbar-right">
            <span className="local-status">
              <span className="online-dot" />
              本地工作区
            </span>
            {action}
            <div className="avatar small">Y</div>
          </div>
        </header>
        <main id="main">{children}</main>
        <footer className="app-footer">
          <span>漫序 FRAMEFLOW</span>
          <span>研究有证据，创作有检查，迭代有记录。</span>
        </footer>
      </div>
    </div>
  );
}
export function Modal({
  open,
  title,
  onClose,
  children,
  wide = false,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog?.open) dialog?.showModal();
    else if (!open && dialog?.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "modal-wide" : ""}`}
      onCancel={(e)=>{e.preventDefault();onClose();}}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-header">
        <h2>{title}</h2>
        <button aria-label="关闭弹窗" className="icon-button" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function ErrorBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss?: () => void;
}) {
  return (
    <div className="error-banner" role="alert">
      <span>{message}</span>
      {onDismiss && (
        <button
          className="icon-button"
          aria-label="关闭提示"
          onClick={onDismiss}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
export function formatDuration(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.round(seconds) % 60).padStart(2, "0")}`;
}
export function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "操作失败，请重试";
}
