import { test, expect } from "@playwright/test";
let projectId = "";
test("create, edit, save, refresh, preview, and export a project backup", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "把脑海里的故事，变成漫剧。" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "打开示例，开始创作" }).click();
  await expect(page).toHaveURL(/\/project\//);
  projectId = page.url().split("/").pop()!;
  await expect(
    page.getByRole("heading", { name: "开往明天的末班车", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("镜头标题", { exact: true })
    .fill("自动化验收：暮色站台");
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(page.getByText("所有修改已保存")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("镜头标题", { exact: true })).toHaveValue(
    "自动化验收：暮色站台",
  );
  await page.getByRole("button", { name: "分镜预演", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "播放", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "暂停", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("tab", { name: /配音成片/ }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出项目 JSON" }).click();
  expect((await download).suggestedFilename()).toContain(".json");
});
test("responsive layouts do not overflow at all required widths", async ({
  page,
}) => {
  for (const width of [390, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const url of ["/", `/project/${projectId}`]) {
      await page.goto(url);
      await expect(page.locator(".topbar")).toBeVisible();
      await expect(page.locator(".page-loading")).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth + 1,
        ),
        `${url} @ ${width}`,
      ).toBe(true);
    }
  }
});
test("server validates uploads, missing images, and stale edits", async ({
  request,
}) => {
  const r = await request.post("/api/projects", {
    data: {
      title: "E2E 临时项目",
      idea: "一只猫找到家",
      style: "电影日漫",
      ratio: "16:9",
      characters: [],
      shots: [],
    },
  });
  const p = await r.json();
  const render = await request.post(`/api/projects/${p.id}/jobs`, {
    headers: { "Idempotency-Key": crypto.randomUUID() },
    data: { kind: "render" },
  });
  expect(render.status()).toBe(400);
  expect((await render.json()).error.code).toBe("MISSING_IMAGES");
  const update = await request.patch(`/api/projects/${p.id}`, {
    data: { ...p, title: "已更新" },
  });
  expect(update.ok()).toBe(true);
  const stale = await request.patch(`/api/projects/${p.id}`, { data: p });
  expect(stale.status()).toBe(409);
  const cross = await request.post("/api/projects", {
    headers: { Origin: "https://untrusted.example" },
    data: { template: "demo" },
  });
  expect(cross.status()).toBe(403);
  await request.delete(`/api/projects/${p.id}`);
});
test.afterAll(async ({ request }) => {
  if (projectId) await request.delete(`/api/projects/${projectId}`);
});
test("image upload validates content and a real render provides playable ranged media", async ({
  request,
  page,
}) => {
  const fs = await import("node:fs/promises");
  const created = await (
    await request.post("/api/projects", { data: { template: "demo" } })
  ).json();
  try {
    const bad = await request.post(`/api/projects/${created.id}/images`, {
      multipart: {
        shotId: created.shots[0].id,
        revision: String(created.revision),
        file: {
          name: "fake.png",
          mimeType: "image/png",
          buffer: Buffer.from("<script>bad</script>"),
        },
      },
    });
    expect(bad.status()).toBe(400);
    const uploaded = await request.post(`/api/projects/${created.id}/images`, {
      multipart: {
        shotId: created.shots[0].id,
        revision: String(created.revision),
        file: {
          name: "scene.png",
          mimeType: "image/png",
          buffer: await fs.readFile("public/demo/station.png"),
        },
      },
    });
    expect(uploaded.ok()).toBe(true);
    const p = await uploaded.json();
    expect(p.shots[0].imageSource).toBe("upload");
    const saved = await request.patch(`/api/projects/${p.id}`, {
      data: { ...p, shots: [{ ...p.shots[0], narration: "", duration: 2 }] },
    });
    expect(saved.ok()).toBe(true);
    const key = crypto.randomUUID();
    const job = await (
      await request.post(`/api/projects/${p.id}/jobs`, {
        headers: { "Idempotency-Key": key },
        data: { kind: "render" },
      })
    ).json();
    await expect
      .poll(
        async () =>
          (await (await request.get(`/api/jobs/${job.id}`)).json()).status,
        { timeout: 30000 },
      )
      .toBe("succeeded");
    const result = await (await request.get(`/api/projects/${p.id}`)).json();
    expect(result.project.render.hasAudio).toBe(false);
    const range = await request.get(result.project.render.videoUrl, {
      headers: { Range: "bytes=0-99" },
    });
    expect(range.status()).toBe(206);
    expect((await range.body()).length).toBe(100);
    const invalidRange = await request.get(result.project.render.videoUrl, {
      headers: { Range: "bytes=999999999-" },
    });
    expect(invalidRange.status()).toBe(416);
    const replay = await (
      await request.post(`/api/projects/${p.id}/jobs`, {
        headers: { "Idempotency-Key": key },
        data: { kind: "render" },
      })
    ).json();
    expect(replay.id).toBe(job.id);
    await page.goto(`/project/${p.id}`);
    await page.getByRole("tab", { name: /配音成片/ }).click();
    await expect
      .poll(() =>
        page
          .getByLabel("漫剧成片播放器")
          .evaluate((el: HTMLVideoElement) => el.readyState),
      )
      .toBeGreaterThanOrEqual(2);
    const errors = await page
      .getByLabel("漫剧成片播放器")
      .evaluate((el: HTMLVideoElement) => el.error?.message || null);
    expect(errors).toBeNull();
  } finally {
    await request.delete(`/api/projects/${created.id}`);
  }
});
test("cancelled render remains cancelled and releases the project for editing", async ({
  request,
}) => {
  const p = await (
    await request.post("/api/projects", { data: { template: "demo" } })
  ).json();
  try {
    const job = await (
      await request.post(`/api/projects/${p.id}/jobs`, {
        headers: { "Idempotency-Key": crypto.randomUUID() },
        data: { kind: "render" },
      })
    ).json();
    const cancelled = await (
      await request.post(`/api/jobs/${job.id}/cancel`)
    ).json();
    expect(cancelled.status).toBe("cancelled");
    const edit = await request.patch(`/api/projects/${p.id}`, {
      data: { ...p, title: "取消后保留的手动编辑" },
    });
    expect(edit.ok()).toBe(true);
    const latest = await (await request.get(`/api/projects/${p.id}`)).json();
    expect(latest.project.title).toBe("取消后保留的手动编辑");
    expect(latest.job.status).toBe("cancelled");
  } finally {
    await request.delete(`/api/projects/${p.id}`);
  }
});
