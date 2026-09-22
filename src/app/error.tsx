"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="page-loading">
      <h1>页面暂时没有打开</h1>
      <p>已保存的作品仍在。请重试，或返回工作台。</p>
      <button className="button primary" onClick={reset}>
        重新加载
      </button>
      <Link href="/">返回工作台</Link>
    </main>
  );
}
