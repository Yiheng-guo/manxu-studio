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
  const view = query.get("view") || "studio";
  return (
    <nav aria-label="主导航">
      {[
        { id: "studio", name: "创作工作台", icon: LayoutDashboard },
        { id: "assets", name: "灵感素材库", icon: Images },
        { id: "guide", name: "创作指南", icon: BookOpen },
      ].map((item) => (
        <Link
          className={`nav-item ${view === item.id && path === "/" ? "active" : ""}`}
          href={item.id === "studio" ? "/" : `/?view=${item.id}`}
          key={item.id}
        >
          <item.icon size={19} />
          {item.name}
          {item.id === "studio" && <span className="nav-dot" />}
        </Link>
      ))}
      <div className="nav-divider" />
      <span className="nav-label">工作空间</span>
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
      <aside className={`sidebar ${open ? "is-open" : ""}`}>
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
            <b>我的创作空间</b>
            <small>个人工作室</small>
          </div>
          <ChevronRight size={14} />
        </div>
        <span className="nav-label">开始创作</span>
        <Suspense>
          <SidebarNav />
        </Suspense>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <Film size={22} />
            <p>
              每个故事，
              <br />
              都值得被看见。
            </p>
            <Link href="/?view=guide">
              从第一镜开始 <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="profile">
            <div className="avatar">Y</div>
            <div>
              <b>Yiheng 的工作室</b>
              <small>本地创作 · 自由表达</small>
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
          <span>故事由你定义，灵感在此成帧。</span>
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
      onCancel={onClose}
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
