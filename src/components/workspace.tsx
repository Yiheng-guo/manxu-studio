"use client";
import { useSearchParams } from "next/navigation";
import { Dashboard } from "./dashboard";
import { publicDemo } from "@/lib/public-mode";
import { Editor } from "./editor";
import Workbench from "./workbench";

export default function Workspace() {
  const query=useSearchParams();
  const view = query.get("view") || "overview";
  if(publicDemo&&view==="editor"&&query.get("id"))return <Editor key={query.get("id")} id={query.get("id")!}/>;
  return ["studio", "assets", "guide", "settings"].includes(view)
    ? <Dashboard />
    : <Workbench key={view} view={view} />;
}
