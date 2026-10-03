import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import {
  workRecordInputSchema,
  workRecordSchema,
  type Project,
  type ProjectInput,
  type Job,
  type JobKind,
  type WorkRecord,
  type WorkRecordInput,
} from "../schema";
export const dataDir = path.resolve(
  /* turbopackIgnore: true */ process.env.DATA_DIR || "./data",
);
fs.mkdirSync(dataDir, { recursive: true });
const db = new DatabaseSync(path.join(dataDir, "studio.sqlite"));
db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS projects(id TEXT PRIMARY KEY,data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,project_id TEXT NOT NULL,kind TEXT NOT NULL,status TEXT NOT NULL,progress INTEGER NOT NULL DEFAULT 0,message TEXT NOT NULL,error TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,payload TEXT NOT NULL,idempotency TEXT NOT NULL UNIQUE);
CREATE UNIQUE INDEX IF NOT EXISTS one_active_job ON jobs(project_id) WHERE status IN ('queued','running');
CREATE TABLE IF NOT EXISTS work_records(id TEXT PRIMARY KEY,data TEXT NOT NULL,create_input TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS work_record_versions(record_id TEXT NOT NULL,revision INTEGER NOT NULL,data TEXT NOT NULL,PRIMARY KEY(record_id,revision));
CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);`);
export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export function getProject(id: string): Project {
  const row = db.prepare("SELECT data FROM projects WHERE id=?").get(id) as
    { data: string } | undefined;
  if (!row) throw new AppError(404, "NOT_FOUND", "这个项目不存在或已被删除");
  return JSON.parse(row.data);
}
export function listProjects(): Project[] {
  return (
    db.prepare("SELECT data FROM projects ORDER BY rowid DESC").all() as {
      data: string;
    }[]
  ).map((r) => JSON.parse(r.data));
}
export function createProject(
  input: ProjectInput,
  source: Project["scriptSource"] = "manual",
): Project {
  const now = new Date().toISOString();
  const p: Project = {
    ...input,
    id: randomUUID(),
    revision: 0,
    createdAt: now,
    updatedAt: now,
    scriptSource: source,
    render: null,
  };
  db.prepare("INSERT INTO projects VALUES(?,?)").run(p.id, JSON.stringify(p));
  return p;
}
function writeProject(p: Project) {
  db.prepare("UPDATE projects SET data=? WHERE id=?").run(
    JSON.stringify(p),
    p.id,
  );
  return p;
}
export function changeProject(
  id: string,
  fn: (p: Project) => Project,
  expectedRevision?: number,
  allowBusy = false,
) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const p = getProject(id);
    if (expectedRevision !== undefined && p.revision !== expectedRevision)
      throw new AppError(
        409,
        "REVISION_CONFLICT",
        "项目已在其他页面更新，请重新加载后编辑",
      );
    if (!allowBusy && getActiveJob(id))
      throw new AppError(
        409,
        "PROJECT_BUSY",
        "任务执行中，请完成或取消后再编辑",
      );
    const next = fn(p);
    next.revision = p.revision + 1;
    next.updatedAt = new Date().toISOString();
    writeProject(next);
    db.exec("COMMIT");
    return next;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
export function deleteProject(id: string) {
  db.exec("BEGIN IMMEDIATE");
  try {
    getProject(id);
    if (getActiveJob(id))
      throw new AppError(409, "PROJECT_BUSY", "请先取消正在执行的任务");
    db.prepare("DELETE FROM projects WHERE id=?").run(id);
    db.prepare("DELETE FROM jobs WHERE project_id=?").run(id);
    for (const row of workRecordRows()) {
      const record = workRecordSchema.parse(JSON.parse(row.data));
      if (record.projectId !== id) continue;
      writeWorkRecordVersion(record);
      record.projectId = null;
      record.projectRevision = null;
      record.projectFingerprint = null;
      record.stale = false;
      record.revision += 1;
      record.updatedAt = new Date().toISOString();
      writeWorkRecord(record);
      writeWorkRecordVersion(record);
    }
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
type JobRow = {
  id: string;
  project_id: string;
  kind: JobKind;
  status: Job["status"];
  progress: number;
  message: string;
  error: string | null;
  created_at: string;
  updated_at: string;
  payload: string;
};
const mapJob = (r: JobRow): Job => ({
  id: r.id,
  projectId: r.project_id,
  kind: r.kind,
  status: r.status,
  progress: r.progress,
  message: r.message,
  error: r.error,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});
export function getJob(id: string) {
  const r = db.prepare("SELECT * FROM jobs WHERE id=?").get(id) as
    JobRow | undefined;
  if (!r) throw new AppError(404, "NOT_FOUND", "任务不存在");
  return mapJob(r);
}
export function getActiveJob(id: string) {
  const r = db
    .prepare(
      "SELECT * FROM jobs WHERE project_id=? AND status IN ('queued','running') LIMIT 1",
    )
    .get(id) as JobRow | undefined;
  return r ? mapJob(r) : null;
}
export function latestJob(id: string) {
  const r = db
    .prepare(
      "SELECT * FROM jobs WHERE project_id=? ORDER BY rowid DESC LIMIT 1",
    )
    .get(id) as JobRow | undefined;
  return r ? mapJob(r) : null;
}
export function enqueue(id: string, kind: JobKind, key: string) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const existing = db
      .prepare("SELECT * FROM jobs WHERE idempotency=?")
      .get(key) as JobRow | undefined;
    if (existing) {
      if (existing.project_id !== id || existing.kind !== kind)
        throw new AppError(409, "KEY_REUSED", "请求标识已被其他操作使用");
      db.exec("COMMIT");
      return mapJob(existing);
    }
    const p = getProject(id);
    const active = getActiveJob(id);
    if (active) throw new AppError(409, "PROJECT_BUSY", "此项目已有任务执行中");
    const now = new Date().toISOString();
    const job: Job = {
      id: randomUUID(),
      projectId: id,
      kind,
      status: "queued",
      progress: 0,
      message: "已加入队列",
      error: null,
      createdAt: now,
      updatedAt: now,
    };
    db.prepare("INSERT INTO jobs VALUES(?,?,?,?,?,?,?,?,?,?,?)").run(
      job.id,
      id,
      kind,
      job.status,
      0,
      job.message,
      null,
      now,
      now,
      JSON.stringify(p),
      key,
    );
    db.exec("COMMIT");
    return job;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
export function claimJob() {
  db.exec("BEGIN IMMEDIATE");
  try {
    const r = db
      .prepare(
        "SELECT * FROM jobs WHERE status='queued' ORDER BY rowid LIMIT 1",
      )
      .get() as JobRow | undefined;
    if (!r) {
      db.exec("COMMIT");
      return null;
    }
    db.prepare(
      "UPDATE jobs SET status='running',message='开始处理',updated_at=? WHERE id=?",
    ).run(new Date().toISOString(), r.id);
    db.exec("COMMIT");
    return { job: getJob(r.id), project: JSON.parse(r.payload) as Project };
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
export function updateJob(
  id: string,
  values: Partial<Pick<Job, "status" | "progress" | "message" | "error">>,
) {
  const current = getJob(id);
  if (current.status === "cancelled") return current;
  const v = { ...current, ...values };
  db.prepare(
    "UPDATE jobs SET status=?,progress=?,message=?,error=?,updated_at=? WHERE id=? AND status IN ('queued','running')",
  ).run(v.status, v.progress, v.message, v.error, new Date().toISOString(), id);
  return getJob(id);
}
export function cancelJob(id: string) {
  const j = getJob(id);
  if (["queued", "running"].includes(j.status))
    db.prepare(
      "UPDATE jobs SET status='cancelled',message='已取消；已完成的素材会保留',updated_at=? WHERE id=? AND status IN ('queued','running')",
    ).run(new Date().toISOString(), id);
  return getJob(id);
}
export function findJobByKey(projectId: string, kind: JobKind, key: string) {
  const row = db.prepare("SELECT * FROM jobs WHERE idempotency=?").get(key) as
    JobRow | undefined;
  if (!row) return null;
  if (row.project_id !== projectId || row.kind !== kind)
    throw new AppError(409, "KEY_REUSED", "请求标识已被其他操作使用");
  return mapJob(row);
}
// Commit only while the originating task still owns the project. Cancellation and
// this transaction serialize through SQLite, so late provider results cannot overwrite edits.
export function applyJobProject(
  jobId: string,
  fn: (p: Project) => Project,
  finishMessage?: string,
) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const job = getJob(jobId);
    if (job.status !== "running")
      throw new AppError(409, "JOB_STOPPED", "任务已停止");
    const p = getProject(job.projectId);
    const next = fn(p);
    next.revision = p.revision + 1;
    next.updatedAt = new Date().toISOString();
    writeProject(next);
    if (finishMessage)
      updateJob(jobId, {
        status: "succeeded",
        progress: 100,
        message: finishMessage,
      });
    db.exec("COMMIT");
    return next;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
export function recoverJobs() {
  db.prepare(
    "UPDATE jobs SET status='failed',error='服务已重启，任务中断。已有素材保留，请按需重试。',message='任务中断',updated_at=? WHERE status='running'",
  ).run(new Date().toISOString());
}
export function heartbeat() {
  db.prepare(
    "INSERT INTO meta VALUES('heartbeat',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
  ).run(String(Date.now()));
}
export function workerReady() {
  const row = db
    .prepare("SELECT value FROM meta WHERE key='heartbeat'")
    .get() as { value: string } | undefined;
  return !!row && Date.now() - Number(row.value) < 12000;
}

type WorkRecordRow = { id: string; data: string; create_input: string };
function workRecordRows() {
  return db
    .prepare(
      "SELECT * FROM work_records ORDER BY json_extract(data,'$.updatedAt') DESC,rowid DESC",
    )
    .all() as WorkRecordRow[];
}
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
function legacyProjectFingerprint(project: Project): string {
  const { title, idea, style, ratio, characters, shots } = project;
  return createHash("sha256")
    .update(canonicalJson({ title, idea, style, ratio, characters, shots }))
    .digest("hex");
}
export function projectFingerprint(project: Project): string {
  const { title, idea, style, ratio, characters } = project;
  const shots = project.shots.map((shot) => ({
    ...shot,
    continuity: shot.continuity ?? null,
  }));
  return createHash("sha256")
    .update(canonicalJson({ title, idea, style, ratio, characters, shots }))
    .digest("hex");
}
function recordRow(id: string) {
  const row = db.prepare("SELECT * FROM work_records WHERE id=?").get(id) as
    WorkRecordRow | undefined;
  if (!row)
    throw new AppError(404, "NOT_FOUND", "这条实践记录不存在或已被删除");
  return row;
}
function readWorkRecord(row: WorkRecordRow): WorkRecord {
  const record = workRecordSchema.parse(JSON.parse(row.data));
  record.stale = false;
  if (record.projectId && record.projectFingerprint) {
    const project = getProject(record.projectId);
    const fingerprint = projectFingerprint(project);
    // Older reviews were hashed before continuity cards existed. Accept that
    // hash only while every shot still has no continuity card.
    const matchesLegacy =
      project.shots.every((shot) => shot.continuity === undefined) &&
      record.projectFingerprint === legacyProjectFingerprint(project);
    record.stale = record.projectFingerprint !== fingerprint && !matchesLegacy;
  }
  return record;
}
export function listWorkRecords(): WorkRecord[] {
  return workRecordRows().map(readWorkRecord);
}
export function getWorkRecord(id: string): WorkRecord {
  return readWorkRecord(recordRow(id));
}
function projectSnapshot(projectId: string | null) {
  if (!projectId) return { projectRevision: null, projectFingerprint: null };
  const project = getProject(projectId);
  return {
    projectRevision: project.revision,
    projectFingerprint: projectFingerprint(project),
  };
}
function writeWorkRecord(record: WorkRecord) {
  db.prepare("UPDATE work_records SET data=? WHERE id=?").run(
    JSON.stringify(record),
    record.id,
  );
}
function writeWorkRecordVersion(record: WorkRecord) {
  db.prepare(
    "INSERT INTO work_record_versions(record_id,revision,data) VALUES(?,?,?) ON CONFLICT(record_id,revision) DO NOTHING",
  ).run(record.id, record.revision, JSON.stringify(record));
}
export function workRecordHistory(id: string): WorkRecord[] {
  const current = workRecordSchema.parse(JSON.parse(recordRow(id).data));
  const rows = db
    .prepare(
      "SELECT data FROM work_record_versions WHERE record_id=? ORDER BY revision DESC",
    )
    .all(id) as { data: string }[];
  return rows.length
    ? rows.map((row) => workRecordSchema.parse(JSON.parse(row.data)))
    : [current];
}
export function createWorkRecord(
  id: string,
  rawInput: WorkRecordInput,
): { record: WorkRecord; created: boolean } {
  const input = workRecordInputSchema.parse(rawInput);
  const normalized = canonicalJson(input);
  db.exec("BEGIN IMMEDIATE");
  try {
    const existing = db
      .prepare("SELECT * FROM work_records WHERE id=?")
      .get(id) as WorkRecordRow | undefined;
    if (existing) {
      const originalInput = workRecordInputSchema.parse(
        JSON.parse(existing.create_input),
      );
      if (canonicalJson(originalInput) !== normalized) {
        throw new AppError(
          409,
          "KEY_REUSED",
          "记录标识已用于另一条内容，请重新创建记录",
        );
      }
      const record = readWorkRecord(existing);
      db.exec("COMMIT");
      return { record, created: false };
    }
    const now = new Date().toISOString();
    const record: WorkRecord = {
      ...input,
      id,
      revision: 0,
      createdAt: now,
      updatedAt: now,
      ...projectSnapshot(input.projectId),
      stale: false,
    };
    db.prepare(
      "INSERT INTO work_records(id,data,create_input) VALUES(?,?,?)",
    ).run(id, JSON.stringify(record), normalized);
    writeWorkRecordVersion(record);
    db.exec("COMMIT");
    return { record, created: true };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
export function changeWorkRecord(
  id: string,
  rawInput: WorkRecordInput,
  expectedRevision: number,
  reconfirmProjectRevision?: number,
): WorkRecord {
  const input = workRecordInputSchema.parse(rawInput);
  db.exec("BEGIN IMMEDIATE");
  try {
    const current = getWorkRecord(id);
    if (current.revision !== expectedRevision) {
      throw new AppError(
        409,
        "REVISION_CONFLICT",
        "记录已在其他页面更新，请重新加载后编辑",
      );
    }
    writeWorkRecordVersion(
      workRecordSchema.parse(JSON.parse(recordRow(id).data)),
    );
    if (reconfirmProjectRevision !== undefined) {
      if (!input.projectId) {
        throw new AppError(
          400,
          "INVALID_RECONFIRM",
          "请先关联项目，再确认复核的项目版本",
        );
      }
      const project = getProject(input.projectId);
      if (project.revision !== reconfirmProjectRevision) {
        throw new AppError(
          409,
          "PROJECT_REVISION_CONFLICT",
          "项目已再次改变，请重新查看并复核当前版本",
        );
      }
    }
    const snapshot =
      input.projectId !== current.projectId ||
      reconfirmProjectRevision !== undefined
        ? projectSnapshot(input.projectId)
        : {
            projectRevision: current.projectRevision,
            projectFingerprint: current.projectFingerprint,
          };
    const record: WorkRecord = {
      ...current,
      ...input,
      revision: current.revision + 1,
      updatedAt: new Date().toISOString(),
      ...snapshot,
    };
    writeWorkRecord(record);
    const saved = getWorkRecord(id);
    writeWorkRecord(saved);
    writeWorkRecordVersion(saved);
    db.exec("COMMIT");
    return saved;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
export function deleteWorkRecord(id: string, expectedRevision?: number) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const current = workRecordSchema.parse(JSON.parse(recordRow(id).data));
    if (
      expectedRevision !== undefined &&
      current.revision !== expectedRevision
    ) {
      throw new AppError(
        409,
        "REVISION_CONFLICT",
        "记录已更新，不能删除旧版本，请重新加载后确认",
      );
    }
    db.prepare("DELETE FROM work_record_versions WHERE record_id=?").run(id);
    db.prepare("DELETE FROM work_records WHERE id=?").run(id);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
