import { Suspense } from "react";
import Workspace from "@/components/workspace";
export default function Page() {
  return (
    <Suspense
      fallback={<div className="page-loading">正在打开创作工作台…</div>}
    >
      <Workspace />
    </Suspense>
  );
}
