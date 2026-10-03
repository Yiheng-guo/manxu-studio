import { test, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { workRecordInputSchema, type WorkRecordInput } from "../src/lib/schema";
import { demoInput } from "../src/lib/demo";

const directory = fs.mkdtempSync(path.join(os.tmpdir(), "manxu-exports-test-"));
process.env.DATA_DIR = directory;
const db = await import("../src/lib/server/db");
const archiveRoute = await import("../src/app/api/records/export/route");
const recordRoute = await import("../src/app/api/records/[id]/export/route");
after(() => fs.rmSync(directory, { recursive: true, force: true }));

function input(overrides: Partial<WorkRecordInput> = {}): WorkRecordInput {
  return workRecordInputSchema.parse({
    kind: "research",
    title: "测试档案 · 局部修改入口",
    status: "draft",
    origin: "personal",
    ...overrides,
  });
}

function localRequest(pathname: string) {
  return new Request(`http://localhost:3210${pathname}`, {
    headers: { host: "localhost:3210" },
  });
}

test("the workspace JSON attachment preserves unknown measurements, origins, source evidence, and creative project data", async () => {
  const project = db.createProject(demoInput, "demo");
  const evaluation = db.createWorkRecord(
    randomUUID(),
    input({
      kind: "evaluation",
      title: "测试数据 · 脚本完整性交付",
      status: "closed",
      projectId: project.id,
      expected: "按输入返回四个非空分镜",
      observed:
        "测试原始输出：仅有三个分镜；自动化测试样本，不是模型实测业绩。",
      evaluation: {
        caseId: "EXPORT-CASE-01",
        model: "fixture-model",
        promptVersion: "fixture-v1",
        completion: "fail",
        score: null,
        factualErrors: null,
        interventions: 0,
        latencyMs: null,
        tokens: null,
        cost: null,
        currency: "CNY",
        costSource: "",
      },
      evidence: [
        {
          label: "公开证据链接",
          url: "https://example.org/research/evidence",
          note: "测试来源说明，未声称已访问来源",
        },
      ],
    }),
  ).record;
  const publicRecord = db.createWorkRecord(
    randomUUID(),
    input({ title: "公开资料的测试记录", origin: "public" }),
  ).record;
  const example = db.createWorkRecord(
    randomUUID(),
    input({ title: "教学示例的测试记录", origin: "example" }),
  ).record;

  const response = await archiveRoute.GET(localRequest("/api/records/export"));
  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") || "",
    /^application\/json/,
  );
  assert.match(
    response.headers.get("content-disposition") || "",
    /^attachment;.*\.json/,
  );
  assert.equal(response.headers.get("cache-control"), "no-store");
  const archive = await response.json();
  const exported = archive.records.find(
    (record: { id: string }) => record.id === evaluation.id,
  );
  assert.equal(exported.observed, evaluation.observed);
  assert.equal(exported.evaluation.cost, null);
  assert.equal(exported.evaluation.tokens, null);
  assert.equal(exported.evaluation.factualErrors, null);
  assert.equal(exported.evaluation.interventions, 0);
  assert.equal(exported.evaluation.promptVersion, "fixture-v1");
  assert.equal(
    exported.evidence[0].url,
    "https://example.org/research/evidence",
  );
  assert.equal(exported.evidence[0].note, "测试来源说明，未声称已访问来源");
  assert.equal(
    archive.records.find(
      (record: { id: string }) => record.id === publicRecord.id,
    ).origin,
    "public",
  );
  assert.equal(
    archive.records.find((record: { id: string }) => record.id === example.id)
      .origin,
    "example",
  );
  assert.equal(exported.origin, "personal");
  const exportedProject = archive.projects.find(
    (entry: { id: string }) => entry.id === project.id,
  );
  assert.equal(exportedProject.shots.length, project.shots.length);
  assert.equal(exportedProject.shots[0].imageSource, "demo");
  assert.ok(!Number.isNaN(Date.parse(archive.exportedAt)));
});

test("the Markdown attachment includes the current observation, explicit unknown costs, evidence, and an outdated project warning", async () => {
  const project = db.createProject(demoInput);
  const source = input({
    kind: "evaluation",
    title: "测试数据 · 人物行为检查",
    status: "closed",
    projectId: project.id,
    expected: "人物行为遵循输入设定",
    observed: "首版输出：角色在没有铺垫时改变决定。",
    evaluation: {
      caseId: "EXPORT-CASE-02",
      model: "fixture-model",
      promptVersion: "fixture-v1",
      completion: "fail",
      score: null,
      factualErrors: null,
      interventions: 0,
      latencyMs: null,
      tokens: null,
      cost: null,
      currency: "USD",
      costSource: "",
    },
    evidence: [
      {
        label: "源输出",
        url: "https://example.org/output/raw",
        note: "保留输出与问题定位；这是测试数据。",
      },
    ],
  });
  const record = db.createWorkRecord(randomUUID(), source).record;
  db.changeWorkRecord(
    record.id,
    { ...source, observed: "复测输出：补全因果，但角色动机仍待人工核对。" },
    0,
  );
  db.changeProject(
    project.id,
    (current) => ({ ...current, title: "测试中已更新的作品" }),
    0,
  );

  const response = await recordRoute.GET(
    localRequest(`/api/records/${record.id}/export`),
    { params: Promise.resolve({ id: record.id }) },
  );
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") || "", /^text\/markdown/);
  assert.match(
    response.headers.get("content-disposition") || "",
    /^attachment;.*\.md/,
  );
  assert.equal(response.headers.get("cache-control"), "no-store");
  const markdown = await response.text();
  assert.ok(markdown.includes("复测输出：补全因果，但角色动机仍待人工核对。"));
  assert.ok(!markdown.includes("首版输出：角色在没有铺垫时改变决定。"));
  assert.ok(markdown.includes("现金费用：未知"));
  assert.ok(markdown.includes("Tokens：未知"));
  assert.ok(markdown.includes("人工干预：0"));
  assert.ok(markdown.includes("个人记录"));
  assert.ok(markdown.includes("https://example.org/output/raw"));
  assert.ok(markdown.includes("保留输出与问题定位；这是测试数据。"));
  assert.ok(markdown.includes("测试中已更新的作品"));
  assert.ok(markdown.includes("需复核"));
});

test("the history JSON attachment retains past outputs, sources, and linked snapshots after deleting the creative project", async () => {
  const project = db.createProject(demoInput);
  const source = input({
    kind: "review",
    title: "测试历史 · 道具连续性",
    status: "closed",
    projectId: project.id,
    observed: "第 1 次观察：相邻镜头中的车票消失。",
    evidence: [
      {
        label: "第 1 版画面",
        url: "https://example.org/frames/v1",
        note: "首轮来源说明",
      },
    ],
  });
  const record = db.createWorkRecord(randomUUID(), source).record;
  db.changeWorkRecord(
    record.id,
    {
      ...source,
      observed: "第 2 次观察：局部修复，但相邻镜头尚未检查。",
      evidence: [
        {
          label: "第 2 版画面",
          url: "https://example.org/frames/v2",
          note: "局部复测来源说明",
        },
      ],
    },
    0,
  );
  db.changeWorkRecord(
    record.id,
    { ...source, observed: "第 3 次观察：全片检查失败，角色服装仍有跳变。" },
    1,
  );
  db.deleteProject(project.id);

  const response = await recordRoute.GET(
    localRequest(`/api/records/${record.id}/export?format=history`),
    { params: Promise.resolve({ id: record.id }) },
  );
  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") || "",
    /^application\/json/,
  );
  assert.match(
    response.headers.get("content-disposition") || "",
    /^attachment;.*history.*\.json/,
  );
  assert.equal(response.headers.get("cache-control"), "no-store");
  const history = await response.json();
  assert.deepEqual(
    history.map((entry: { revision: number }) => entry.revision),
    [3, 2, 1, 0],
  );
  assert.equal(history[0].projectId, null);
  assert.equal(history[3].projectId, project.id);
  assert.equal(history[3].observed, "第 1 次观察：相邻镜头中的车票消失。");
  assert.equal(
    history[2].observed,
    "第 2 次观察：局部修复，但相邻镜头尚未检查。",
  );
  assert.equal(
    history[1].observed,
    "第 3 次观察：全片检查失败，角色服装仍有跳变。",
  );
  assert.equal(history[3].evidence[0].url, "https://example.org/frames/v1");
  assert.equal(history[2].evidence[0].note, "局部复测来源说明");
  assert.equal(history[1].status, "closed");
  assert.ok(
    history.every((entry: { origin: string }) => entry.origin === "personal"),
  );
});

test("exports reject remote and cross-origin requests and return structured errors for missing records", async () => {
  const remote = new Request("http://outside.example/api/records/export", {
    headers: { host: "outside.example" },
  });
  assert.equal((await archiveRoute.GET(remote)).status, 403);
  const crossOrigin = new Request("http://localhost:3210/api/records/export", {
    headers: { host: "localhost:3210", origin: "https://outside.example" },
  });
  assert.equal((await archiveRoute.GET(crossOrigin)).status, 403);
  const id = randomUUID();
  const forbidden = await recordRoute.GET(
    new Request(`http://outside.example/api/records/${id}/export`, {
      headers: { host: "outside.example" },
    }),
    { params: Promise.resolve({ id }) },
  );
  assert.equal(forbidden.status, 403);
  const missing = await recordRoute.GET(
    localRequest(`/api/records/${id}/export`),
    { params: Promise.resolve({ id }) },
  );
  assert.equal(missing.status, 404);
  assert.equal((await missing.json()).error.code, "NOT_FOUND");
  const invalid = await recordRoute.GET(
    localRequest("/api/records/invalid-id/export"),
    { params: Promise.resolve({ id: "invalid-id" }) },
  );
  assert.equal(invalid.status, 400);
});
