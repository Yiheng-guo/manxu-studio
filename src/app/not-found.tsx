import Link from "next/link";
export default function NotFound() {
  return (
    <main className="page-loading">
      <h1>这一页还没有故事</h1>
      <Link className="button primary" href="/">
        返回创作工作台
      </Link>
    </main>
  );
}
