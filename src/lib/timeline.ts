import type { Project } from "./schema";

export function projectTimeline(project: Project) {
  if (project.render?.timeline?.length) {
    return { source: "render" as const, entries: project.render.timeline };
  }
  let cursor = 0;
  const entries = project.shots.map((shot) => {
    const entry = { shotId: shot.id, start: cursor, end: cursor + shot.duration };
    cursor = entry.end;
    return entry;
  });
  return { source: "plan" as const, entries };
}
export function shotAtTime(entries: { shotId: string; start: number; end: number }[], seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  return entries.find((entry) => seconds >= entry.start && seconds < entry.end) || null;
}
export function encodedDuration(stderr: string) {
  const match = stderr.match(/Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!match) throw new Error("无法读取合成镜头时长");
  const duration = Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
  if (!Number.isFinite(duration) || duration <= 0) throw new Error("合成镜头时长无效");
  return duration;
}
