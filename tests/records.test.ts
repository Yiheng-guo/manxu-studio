import { test, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import {
  workRecordInputSchema,
  workRecordSchema,
  workRecordMediaSchema,
  projectSchema,
  shotContinuitySchema,
  type WorkRecordInput,
} from "../src/lib/schema";
import { demoInput } from "../src/lib/demo";

const directory = fs.mkdtempSync(path.join(os.tmpdir(), "manxu-records-test-"));
process.env.DATA_DIR = directory;
const db = await import("../src/lib/server/db");
after(() => fs.rmSync(directory, { recursive: true, force: true }));

function input(overrides: Partial<WorkRecordInput> = {}): WorkRecordInput {
  return workRecordInputSchema.parse({
    kind: "research",
    title: "创作者的局部修改需求",
    status: "draft",
    origin: "personal",
    ...overrides,
  });
}

test("records persist in SQLite and can be read after opening a new process", () => {
  const created = db.createWorkRecord(randomUUID(), input());
  assert.equal(created.created, true);
  const stored = db.getWorkRecord(created.record.id);
  assert.deepEqual(stored, created.record);
  assert.equal(
    db.listWorkRecords().some((record) => record.id === stored.id),
    true,
  );
  const code = `const db = await import('./src/lib/server/db.ts'); process.stdout.write(JSON.stringify(db.getWorkRecord(${JSON.stringify(stored.id)})));`;
  const output = execFileSync(
    process.execPath,
    ["--import", "tsx", "--input-type=module", "-e", code],
    {
      cwd: process.cwd(),
      env: { ...process.env, DATA_DIR: directory, NODE_NO_WARNINGS: "1" },
      encoding: "utf8",
    },
  );
  assert.deepEqual(JSON.parse(output), stored);
});

test("idempotent creates return one record, including a retry after a later edit", () => {
  const id = randomUUID();
  const source = input();
  const first = db.createWorkRecord(id, source);
  const repeated = db.createWorkRecord(id, source);
  assert.equal(repeated.created, false);
  assert.deepEqual(repeated.record, first.record);
  const changed = db.changeWorkRecord(
    id,
    { ...source, summary: "新增一条观察" },
    0,
  );
  assert.equal(
    db.createWorkRecord(id, source).record.revision,
    changed.revision,
  );
  assert.throws(
    () => db.createWorkRecord(id, input({ title: "另一条内容" })),
    /另一条内容/,
  );
  assert.throws(
    () => db.createWorkRecord(id, input({ kind: "issue" })),
    /另一条内容/,
  );
});

test("optimistic revisions prevent stale edits from overwriting a newer observation", () => {
  const source = input();
  const record = db.createWorkRecord(randomUUID(), source).record;
  const changed = db.changeWorkRecord(
    record.id,
    { ...source, observed: "交付内容有缺漏" },
    0,
  );
  assert.equal(changed.revision, 1);
  assert.throws(
    () =>
      db.changeWorkRecord(record.id, { ...source, observed: "过期结果" }, 0),
    /其他页面/,
  );
  assert.equal(db.getWorkRecord(record.id).observed, "交付内容有缺漏");
});

test("evidence permits only valid HTTP or HTTPS links and limits array size", () => {
  for (const url of [
    "javascript:alert(1)",
    "file:///etc/passwd",
    "data:text/html,a",
    "not-a-url",
  ]) {
    assert.equal(
      workRecordInputSchema.safeParse(
        input({ evidence: [{ label: "证据", url: "", note: "" }] }),
      ).success,
      true,
    );
    assert.equal(
      workRecordInputSchema.safeParse({
        ...input(),
        evidence: [{ label: "证据", url, note: "" }],
      }).success,
      false,
    );
  }
  assert.equal(
    workRecordInputSchema.safeParse({
      ...input(),
      evidence: [
        {
          label: "来源",
          url: "https://github.com/example/repo",
          note: "公开 README",
        },
      ],
    }).success,
    true,
  );
  assert.equal(
    workRecordInputSchema.safeParse({
      ...input(),
      evidence: Array(13).fill({ label: "", url: "", note: "" }),
    }).success,
    false,
  );
});

test("unknown evaluation measurements remain null, while actual zero remains zero", () => {
  const source = input({
    kind: "evaluation",
    evaluation: {
      caseId: "case-001",
      model: "手动录入模型",
      promptVersion: "v1",
      completion: "unknown",
      score: null,
      factualErrors: null,
      interventions: 0,
      latencyMs: null,
      tokens: null,
      cost: null,
      currency: "CNY",
      costSource: "",
    },
  });
  const record = db.createWorkRecord(randomUUID(), source).record;
  assert.equal(db.getWorkRecord(record.id).evaluation?.cost, null);
  assert.equal(db.getWorkRecord(record.id).evaluation?.tokens, null);
  assert.equal(db.getWorkRecord(record.id).evaluation?.factualErrors, null);
  assert.equal(db.getWorkRecord(record.id).evaluation?.interventions, 0);
  assert.equal(
    workRecordInputSchema.safeParse({
      ...source,
      evaluation: { ...source.evaluation, cost: 0, costSource: "" },
    }).success,
    false,
  );
  assert.equal(
    workRecordInputSchema.safeParse({
      ...source,
      evaluation: {
        ...source.evaluation,
        cost: 0,
        costSource: "供应商免费额度调用记录",
      },
    }).success,
    true,
  );
});

test("closing a record requires observed results; completed evaluation needs a case, model, and pass condition", () => {
  assert.equal(
    workRecordInputSchema.safeParse({ ...input(), status: "closed" }).success,
    false,
  );
  assert.equal(
    workRecordInputSchema.safeParse({
      ...input(),
      status: "closed",
      observed: "   ",
    }).success,
    false,
  );
  const complete = input({
    kind: "evaluation",
    status: "closed",
    expected: "返回完整的四个分镜",
    observed: "仅返回三个，交付不完整",
    evaluation: {
      caseId: "story-001",
      model: "test-model",
      promptVersion: "v1",
      completion: "fail",
      score: 2,
      factualErrors: null,
      interventions: 1,
      latencyMs: 1200,
      tokens: null,
      cost: null,
      currency: "CNY",
      costSource: "",
    },
  });
  assert.equal(workRecordInputSchema.safeParse(complete).success, true);
  for (const patch of [
    { expected: "" },
    { observed: "" },
    { evaluation: { ...complete.evaluation, caseId: "" } },
    { evaluation: { ...complete.evaluation, model: "" } },
    { evaluation: { ...complete.evaluation, completion: "unknown" } },
    { evaluation: null },
  ]) {
    assert.equal(
      workRecordInputSchema.safeParse({ ...complete, ...patch }).success,
      false,
    );
  }
  assert.equal(
    workRecordInputSchema.safeParse({
      ...input(),
      kind: "review",
      status: "closed",
      observed: "检查完成",
    }).success,
    false,
  );
});

test("linked reviews become stale only when creative project contents change", () => {
  const project = db.createProject(demoInput, "demo");
  const source = input({
    kind: "review",
    projectId: project.id,
    status: "closed",
    observed: "人工检查过当前四个分镜",
  });
  const record = db.createWorkRecord(randomUUID(), source).record;
  assert.equal(record.projectRevision, 0);
  assert.equal(record.projectFingerprint, db.projectFingerprint(project));
  db.changeProject(
    project.id,
    (current) => ({
      ...current,
      render: {
        videoUrl: "/api/assets/test/film.mp4",
        srtUrl: "/api/assets/test/film.srt",
        duration: 30,
        hasAudio: true,
        revision: 0,
        createdAt: new Date().toISOString(),
      },
    }),
    0,
  );
  assert.equal(db.getWorkRecord(record.id).stale, false);
  db.changeProject(
    project.id,
    (current) => ({
      ...current,
      shots: current.shots.map((shot, index) =>
        index === 0 ? { ...shot, narration: "新的旁白" } : shot,
      ),
    }),
    1,
  );
  assert.equal(db.getWorkRecord(record.id).stale, true);
  assert.equal(
    db.listWorkRecords().find((entry) => entry.id === record.id)?.stale,
    true,
  );
  const reviewed = db.changeWorkRecord(
    record.id,
    { ...source, observed: "重新检查了新的旁白" },
    0,
    2,
  );
  assert.equal(reviewed.stale, false);
  assert.equal(reviewed.projectRevision, 2);
});

test("fingerprints are stable across object key order and ignore render, revisions, and timestamps", () => {
  const project = db.createProject(demoInput);
  const reordered = JSON.parse(JSON.stringify(project), (_, value: unknown) => {
    if (!value || typeof value !== "object" || Array.isArray(value))
      return value;
    return Object.fromEntries(Object.entries(value).reverse());
  });
  assert.equal(
    db.projectFingerprint(project),
    db.projectFingerprint(reordered),
  );
  assert.equal(
    db.projectFingerprint(project),
    db.projectFingerprint({
      ...project,
      revision: 99,
      updatedAt: "later",
      scriptSource: "ai",
    }),
  );
  assert.notEqual(
    db.projectFingerprint(project),
    db.projectFingerprint({
      ...project,
      characters: project.characters.map((character, index) =>
        index === 0 ? { ...character, description: "换了服装" } : character,
      ),
    }),
  );
});

test("deleting a project preserves linked historical records, detaches them, and prevents old edits", () => {
  const project = db.createProject(demoInput);
  const record = db.createWorkRecord(
    randomUUID(),
    input({
      kind: "review",
      projectId: project.id,
      status: "closed",
      observed: "已完成检查",
    }),
  ).record;
  db.deleteProject(project.id);
  assert.throws(() => db.getProject(project.id), /不存在/);
  const retained = db.getWorkRecord(record.id);
  assert.equal(retained.projectId, null);
  assert.equal(retained.projectRevision, null);
  assert.equal(retained.projectFingerprint, null);
  assert.equal(retained.observed, "已完成检查");
  assert.equal(retained.revision, record.revision + 1);
  assert.equal(workRecordSchema.safeParse(retained).success, true);
  assert.throws(
    () => db.changeWorkRecord(record.id, input(), record.revision),
    /其他页面/,
  );
});

test("record APIs guard reads, preserve idempotent response status, and report write conflicts", async () => {
  const collection = await import("../src/app/api/records/route");
  const item = await import("../src/app/api/records/[id]/route");
  const denied = await collection.GET(
    new Request("http://remote.example/api/records", {
      headers: { host: "remote.example" },
    }),
  );
  assert.equal(denied.status, 403);
  const id = randomUUID();
  const source = input();
  const request = (method: string, data?: unknown) =>
    new Request(`http://localhost:3210/api/records/${id}`, {
      method,
      headers: {
        host: "localhost:3210",
        origin: "http://localhost:3210",
        "content-type": "application/json",
      },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    });
  assert.equal(
    (await collection.POST(request("POST", { ...source, id }))).status,
    201,
  );
  assert.equal(
    (await collection.POST(request("POST", { ...source, id }))).status,
    200,
  );
  const context = { params: Promise.resolve({ id }) };
  const updated = await item.PATCH(
    request("PATCH", { ...source, revision: 0, observed: "观察结果" }),
    context,
  );
  assert.equal(updated.status, 200);
  assert.equal(
    (await item.PATCH(request("PATCH", { ...source, revision: 0 }), context))
      .status,
    409,
  );
  assert.equal((await item.GET(request("GET"), context)).status, 200);
  assert.equal((await item.DELETE(request("DELETE"), context)).status, 400);
  const deleteRequest = new Request(
    `http://localhost:3210/api/records/${id}?revision=1`,
    { method: "DELETE", headers: { host: "localhost:3210" } },
  );
  assert.equal((await item.DELETE(deleteRequest, context)).status, 200);
  assert.equal((await item.GET(request("GET"), context)).status, 404);
});

test("legacy records gain nullable media on read without changing the original idempotency payload", () => {
  const project = db.createProject({
    title: "旧项目",
    idea: "旧版项目",
    style: "电影日漫",
    ratio: "16:9",
    characters: [],
    shots: [
      {
        id: "shot-1",
        title: "旧镜头",
        description: "",
        narration: "",
        imagePrompt: "",
        duration: 2,
        camera: "固定镜头",
        imageUrl: "",
        imageSource: "none",
      },
    ],
  });
  assert.equal(projectSchema.parse(project).shots[0].continuity, undefined);
  const source = input({
    kind: "review",
    status: "closed",
    projectId: project.id,
    observed: "升级前的观察记录",
  });
  const record = db.createWorkRecord(randomUUID(), source).record;
  const legacyRecord = Object.fromEntries(
    Object.entries(record).filter(([key]) => key !== "media"),
  );
  const legacyInput = Object.fromEntries(
    Object.entries(source).filter(([key]) => key !== "media"),
  );
  // Fixture produced by the original hash contract, before continuity existed.
  legacyRecord.projectFingerprint =
    "9857cab8c4991efb93776d9bccecde0b6a250cb42e4680eb4ed056ada8069ce6";
  const originalPayload = JSON.stringify(legacyInput);
  const direct = new DatabaseSync(path.join(directory, "studio.sqlite"));
  try {
    direct
      .prepare("UPDATE work_records SET data=?,create_input=? WHERE id=?")
      .run(JSON.stringify(legacyRecord), originalPayload, record.id);
    direct
      .prepare("DELETE FROM work_record_versions WHERE record_id=?")
      .run(record.id);
    const read = db.getWorkRecord(record.id);
    assert.equal(read.media, null);
    assert.equal(read.stale, false);
    assert.equal(read.observed, source.observed);
    assert.equal(db.createWorkRecord(record.id, source).created, false);
    assert.equal(
      (
        direct
          .prepare("SELECT create_input FROM work_records WHERE id=?")
          .get(record.id) as { create_input: string }
      ).create_input,
      originalPayload,
    );
    db.changeWorkRecord(record.id, { ...source, observed: "升级后的观察" }, 0);
    const versions = db.workRecordHistory(record.id);
    assert.deepEqual(
      versions.map((entry) => entry.revision),
      [1, 0],
    );
    assert.equal(versions[1].observed, "升级前的观察记录");
    assert.equal(versions[1].media, null);
  } finally {
    direct.close();
  }
});

test("media timing accepts unknown endpoints but rejects reversed or negative intervals", () => {
  const defaults = workRecordMediaSchema.parse({});
  assert.equal(defaults.timeStart, null);
  assert.equal(defaults.timeEnd, null);
  assert.equal(
    workRecordMediaSchema.safeParse({ timeStart: 8, timeEnd: null }).success,
    true,
  );
  assert.equal(
    workRecordMediaSchema.safeParse({ timeStart: 8, timeEnd: 9.25 }).success,
    true,
  );
  for (const interval of [
    { timeStart: 8, timeEnd: 8 },
    { timeStart: 8, timeEnd: 7 },
    { timeStart: -1, timeEnd: 2 },
  ]) {
    assert.equal(workRecordMediaSchema.safeParse(interval).success, false);
  }
  assert.equal(
    workRecordInputSchema.safeParse({ ...input(), media: defaults }).success,
    false,
  );
  assert.equal(
    workRecordInputSchema.safeParse({
      ...input({
        kind: "issue",
        status: "closed",
        observed: "仍有双人配音叠音，已归档失败记录",
      }),
      media: {
        ...defaults,
        localCheck: "fail",
        adjacentCheck: "pending",
        fullCheck: "fail",
      },
    }).success,
    true,
  );
});

test("media credits remain unknown until recorded with evidence and never populate cash cost", () => {
  assert.equal(workRecordMediaSchema.parse({}).credits, null);
  assert.equal(workRecordMediaSchema.parse({}).attempts, null);
  for (const credits of [0, 10, 1.5, -1]) {
    assert.equal(
      workRecordMediaSchema.safeParse({ credits, creditsSource: "" }).success,
      false,
    );
  }
  const media = workRecordMediaSchema.parse({
    credits: 0,
    creditsSource: "人工核对的平台积分记录",
    attempts: 0,
  });
  const record = db.createWorkRecord(
    randomUUID(),
    input({ kind: "issue", media }),
  ).record;
  assert.equal(record.media?.credits, 0);
  assert.equal(record.media?.attempts, 0);
  assert.equal(record.evaluation, null);
  assert.equal(
    db.getWorkRecord(record.id).media?.creditsSource,
    "人工核对的平台积分记录",
  );
});

test("editing a continuity card makes linked reviews stale without changing narration", () => {
  const project = db.createProject(demoInput);
  const source = input({
    kind: "review",
    projectId: project.id,
    status: "closed",
    observed: "检查了人物与道具衔接",
  });
  const record = db.createWorkRecord(randomUUID(), source).record;
  const card = shotContinuitySchema.parse({
    characters: "林夏",
    props: "旧车票",
    entryState: "车票握在左手",
    exitState: "放下左手",
    dialogue: "下一站是明天",
  });
  const changed = db.changeProject(
    project.id,
    (current) => ({
      ...current,
      shots: current.shots.map((shot, index) =>
        index === 0 ? { ...shot, continuity: card } : shot,
      ),
    }),
    0,
  );
  assert.equal(changed.shots[0].narration, project.shots[0].narration);
  assert.equal(db.getWorkRecord(record.id).stale, true);
  assert.equal(
    projectSchema.parse(changed).shots[0].continuity?.props,
    "旧车票",
  );
});

test("actual render timelines are optional and must contain valid positive intervals", () => {
  const project = db.createProject(demoInput);
  const render = {
    videoUrl: "/api/assets/test/film.mp4",
    srtUrl: "/api/assets/test/film.srt",
    duration: 30,
    hasAudio: true,
    revision: 0,
    createdAt: "2026-10-03",
  };
  assert.equal(
    projectSchema.parse({ ...project, render }).render?.timeline,
    undefined,
  );
  const valid = projectSchema.parse({
    ...project,
    render: {
      ...render,
      timeline: [
        { shotId: project.shots[0].id, start: 0, end: 8.2 },
        { shotId: project.shots[1].id, start: 8.2, end: 15.6 },
      ],
    },
  });
  assert.equal(valid.render?.timeline?.[0].end, 8.2);
  assert.equal(db.projectFingerprint(valid), db.projectFingerprint(project));
  for (const timeline of [
    [{ shotId: "shot", start: -1, end: 1 }],
    [{ shotId: "shot", start: 2, end: 2 }],
    [{ shotId: "shot", start: 2, end: 1 }],
    Array(13).fill({ shotId: "shot", start: 0, end: 1 }),
  ]) {
    assert.equal(
      projectSchema.safeParse({ ...project, render: { ...render, timeline } })
        .success,
      false,
    );
  }
});

test("ordinary record edits retain stale review evidence; explicit reconfirmation must match the current project version", () => {
  const project = db.createProject(demoInput);
  const source = input({
    kind: "review",
    projectId: project.id,
    status: "closed",
    observed: "初次复核",
  });
  const initial = db.createWorkRecord(randomUUID(), source).record;
  db.changeProject(
    project.id,
    (current) => ({ ...current, title: "改过的项目标题" }),
    0,
  );
  const edited = db.changeWorkRecord(
    initial.id,
    { ...source, title: "只编辑记录标题" },
    0,
  );
  assert.equal(edited.stale, true);
  assert.equal(edited.projectRevision, 0);
  assert.equal(edited.projectFingerprint, initial.projectFingerprint);
  assert.throws(
    () =>
      db.changeWorkRecord(
        initial.id,
        { ...source, observed: "复核了旧页面" },
        1,
        0,
      ),
    /再次改变/,
  );
  assert.equal(db.getWorkRecord(initial.id).revision, 1);
  const confirmed = db.changeWorkRecord(
    initial.id,
    { ...source, observed: "已查看并重新复核当前内容" },
    1,
    1,
  );
  assert.equal(confirmed.stale, false);
  assert.equal(confirmed.projectRevision, 1);
  assert.equal(confirmed.revision, 2);
});

test("version snapshots retain every observed result and can be read after project deletion", async () => {
  const project = db.createProject(demoInput);
  const source = input({
    kind: "review",
    projectId: project.id,
    status: "closed",
    observed: "首次：人物衣服不一致",
  });
  const record = db.createWorkRecord(randomUUID(), source).record;
  db.changeWorkRecord(
    record.id,
    { ...source, observed: "第二次：单镜头已修复，未检查相邻镜头" },
    0,
  );
  db.changeWorkRecord(
    record.id,
    { ...source, observed: "第三次：检查全片后仍有字幕问题" },
    1,
  );
  let history = db.workRecordHistory(record.id);
  assert.deepEqual(
    history.map((entry) => entry.revision),
    [2, 1, 0],
  );
  assert.equal(history[0].observed, "第三次：检查全片后仍有字幕问题");
  assert.equal(history[1].observed, "第二次：单镜头已修复，未检查相邻镜头");
  assert.equal(history[2].observed, "首次：人物衣服不一致");
  db.deleteProject(project.id);
  history = db.workRecordHistory(record.id);
  assert.equal(history[0].projectId, null);
  assert.equal(history[1].projectId, project.id);
  assert.equal(history.length, 4);
  const route = await import("../src/app/api/records/[id]/history/route");
  const response = await route.GET(
    new Request(`http://localhost:3210/api/records/${record.id}/history`, {
      headers: { host: "localhost:3210" },
    }),
    { params: Promise.resolve({ id: record.id }) },
  );
  assert.equal(response.status, 200);
  assert.equal((await response.json()).length, 4);
});

test("stale deletion is rejected and successful deletion removes all stored versions", async () => {
  const source = input();
  const record = db.createWorkRecord(randomUUID(), source).record;
  db.changeWorkRecord(
    record.id,
    { ...source, observed: "已有新的实测输出" },
    0,
  );
  assert.throws(() => db.deleteWorkRecord(record.id, 0), /不能删除旧版本/);
  assert.equal(db.getWorkRecord(record.id).revision, 1);
  const route = await import("../src/app/api/records/[id]/route");
  const context = { params: Promise.resolve({ id: record.id }) };
  const request = (revision: number) =>
    new Request(
      `http://localhost:3210/api/records/${record.id}?revision=${revision}`,
      { method: "DELETE", headers: { host: "localhost:3210" } },
    );
  assert.equal((await route.DELETE(request(0), context)).status, 409);
  assert.equal((await route.DELETE(request(1), context)).status, 200);
  assert.throws(() => db.workRecordHistory(record.id), /不存在/);
  const direct = new DatabaseSync(path.join(directory, "studio.sqlite"));
  try {
    assert.equal(
      (
        direct
          .prepare(
            "SELECT COUNT(*) AS total FROM work_record_versions WHERE record_id=?",
          )
          .get(record.id) as { total: number }
      ).total,
      0,
    );
  } finally {
    direct.close();
  }
});

test("record lists keep their most recently updated entry first after reloading", () => {
  const source = input();
  const older = db.createWorkRecord(randomUUID(), source).record;
  db.createWorkRecord(randomUUID(), { ...source, title: "后创建的记录" });
  const direct = new DatabaseSync(path.join(directory, "studio.sqlite"));
  try {
    direct
      .prepare("UPDATE work_records SET data=? WHERE id=?")
      .run(
        JSON.stringify({ ...older, updatedAt: "2099-01-01T00:00:00.000Z" }),
        older.id,
      );
    assert.equal(db.listWorkRecords()[0].id, older.id);
  } finally {
    direct.close();
  }
});
