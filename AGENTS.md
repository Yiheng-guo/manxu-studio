<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 漫序协作约定

本项目是本地单用户课程作品，当前开发范围见 docs/PRD.md。
- 所有修改通过 TypeScript strict、lint、测试和生产构建。
- 任务与产物以 SQLite 为事实来源，不把示例素材描述为实时生成。
- 密钥只放在 .env.local，禁止提交 data/、凭证和用户私有文件。
- 新增接口集中维护 schema.ts 和 api.ts；worker 任务需可取消、可恢复、幂等。
- 公开展示素材必须有明确来源；保留 THIRD_PARTY_NOTICES.md。
- 每次交付同步 README、docs/验证记录.md 与 docs/当前进度.md。
