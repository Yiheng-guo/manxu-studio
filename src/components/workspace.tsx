"use client";
import { useSearchParams } from "next/navigation";
import { Dashboard } from "./dashboard";
import Workbench from "./workbench";

export default function Workspace() {
  const view = useSearchParams().get("view") || "overview";
  return ["studio", "assets", "guide", "settings"].includes(view)
    ? <Dashboard />
    : <Workbench key={view} view={view} />;
}
