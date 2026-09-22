import { Suspense } from "react";
import { Dashboard } from "@/components/dashboard";
export default function Page() {
  return (
    <Suspense
      fallback={<div className="page-loading">正在打开创作工作台…</div>}
    >
      <Dashboard />
    </Suspense>
  );
}
