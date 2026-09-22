import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  projectInputSchema,
  generatedScriptSchema,
  parseModelJson,
  srtTime,
  imageUrlSchema,
} from "../src/lib/schema";
import { demoInput } from "../src/lib/demo";
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "manxu-test-"));
const db = await import("../src/lib/server/db");
test("project survives a database read; revision prevents overwriting concurrent edits", () => {
  const p = db.createProject(demoInput, "demo");
  assert.equal(db.getProject(p.id).title, p.title);
  const updated = db.changeProject(
    p.id,
    (x) => ({ ...x, title: "新的名字" }),
    0,
  );
  assert.equal(updated.revision, 1);
  assert.throws(
    () => db.changeProject(p.id, (x) => ({ ...x, title: "过期修改" }), 0),
    /其他页面/,
  );
  assert.equal(db.getProject(p.id).title, "新的名字");
});
test("repeated submissions return one task; project tasks are mutually exclusive", () => {
  const p = db.createProject(demoInput);
  const key = randomUUID();
  const a = db.enqueue(p.id, "render", key);
  const b = db.enqueue(p.id, "render", key);
  assert.equal(a.id, b.id);
  assert.throws(() => db.enqueue(p.id, "script", randomUUID()), /已有任务/);
  assert.throws(() => db.changeProject(p.id, (x) => x, 0), /任务执行中/);
  db.cancelJob(a.id);
  assert.equal(db.getJob(a.id).status, "cancelled");
  db.updateJob(a.id, { status: "succeeded" });
  assert.equal(db.getJob(a.id).status, "cancelled");
  assert.doesNotThrow(() => db.changeProject(p.id, (x) => x, 0));
});
test("idempotency keys cannot leak a task from another project", () => {
  const a = db.createProject(demoInput),
    b = db.createProject(demoInput);
  const key = randomUUID();
  db.enqueue(a.id, "script", key);
  assert.throws(() => db.enqueue(b.id, "script", key), /其他操作/);
});
test("restart marks interrupted running jobs as failed and preserves the project", () => {
  const p = db.createProject(demoInput);
  const j = db.enqueue(p.id, "render", randomUUID());
  db.updateJob(j.id, { status: "running", progress: 42 });
  db.recoverJobs();
  assert.equal(db.getJob(j.id).status, "failed");
  assert.equal(db.getProject(p.id).shots.length, 4);
});
test("project validation rejects unsafe URLs, unreasonable durations, and excess shots", () => {
  assert.equal(
    imageUrlSchema.safeParse("https://evil.example/pic.png").success,
    false,
  );
  assert.equal(
    imageUrlSchema.safeParse("/api/assets/../../etc/passwd").success,
    false,
  );
  assert.equal(imageUrlSchema.safeParse("/demo/station.png").success, true);
  assert.equal(
    projectInputSchema.safeParse({
      ...demoInput,
      shots: [{ ...demoInput.shots[0], duration: -1 }],
    }).success,
    false,
  );
  assert.equal(
    projectInputSchema.safeParse({
      ...demoInput,
      shots: Array(13).fill(demoInput.shots[0]),
    }).success,
    false,
  );
});
test("structured AI output is parsed and validated instead of trusted", () => {
  assert.deepEqual(parseModelJson('```json\n{"ok":true}\n```'), { ok: true });
  assert.deepEqual(parseModelJson('Here is the result: {"ok":true}'), {
    ok: true,
  });
  assert.throws(() => parseModelJson("not JSON"));
  assert.equal(
    generatedScriptSchema.safeParse({ title: "假结果", shots: [] }).success,
    false,
  );
});
test("SRT timing supports minute rollover and exact millisecond rounding", () => {
  assert.equal(srtTime(0), "00:00:00,000");
  assert.equal(srtTime(61.25), "00:01:01,250");
  assert.equal(srtTime(59.9998), "00:01:00,000");
});
test("cancelled task cannot overwrite a newer manual edit", () => {
  const p = db.createProject(demoInput);
  const job = db.enqueue(p.id, "script", randomUUID());
  db.updateJob(job.id, { status: "running" });
  db.cancelJob(job.id);
  db.changeProject(p.id, (x) => ({ ...x, title: "保留我的编辑" }), 0);
  assert.throws(
    () =>
      db.applyJobProject(job.id, (x) => ({ ...x, title: "迟到的 AI 结果" })),
    /任务已停止/,
  );
  assert.equal(db.getProject(p.id).title, "保留我的编辑");
});
test("task completion and artifact commit are atomic and cannot be cancelled afterwards", () => {
  const p = db.createProject(demoInput);
  const key = randomUUID();
  const job = db.enqueue(p.id, "script", key);
  db.updateJob(job.id, { status: "running" });
  db.applyJobProject(job.id, (x) => ({ ...x, title: "已完成" }), "完成");
  assert.equal(db.getJob(job.id).status, "succeeded");
  db.cancelJob(job.id);
  assert.equal(db.getJob(job.id).status, "succeeded");
  assert.equal(db.findJobByKey(p.id, "script", key)?.id, job.id);
});
