# 参考来源与第三方声明

## 2026-10-03：v2 机制参考与个人方法资产

本轮新增实践工作台参考公开项目的任务对照、持久化确认、阶段产物、连续性审阅和局部修改原则。新页面、数据契约、SQLite 记录/历史、人工镜头卡与媒体问题定位由漫序独立实现，**没有复制这些上游的源码、提示词全文、界面图或素材，没有引入其运行时或模型权重**。

| 上游 | 本次阅读快照与许可 | 参考范围 |
|---|---|---|
| [promptfoo](https://github.com/promptfoo/promptfoo) | `a16d12bf6f7a4bd6d169bb533c786dd9f0925e6a`，MIT | 样例、模型/Prompt 版本、assertion、原始结果和未知指标分开 |
| [LangGraph.js](https://github.com/langchain-ai/langgraphjs) | `c6eeb26b4f7faf2a85495622a54319ff9cc468e6`，MIT | 持久化人工确认、稳定 ID、恢复与副作用幂等的原则；实际沿用自有 SQLite/worker |
| [Toonflow 官方新版](https://github.com/HBAI-Ltd/Toonflow-app) | `f37b7728f3cedfe6d7d64109a1aba47afafd1da8`，本快照 MIT | 角色、道具、空间、动作及音画连续性的问题定位与小范围修订；不沿用旧版本许可标签 |
| [MoneyPrinterTurbo](https://github.com/harry0703/MoneyPrinterTurbo) | 本轮阅读 `9db984c8befdcadccc3ee4b2a355e16e1595e0fa`，MIT；此前课程来源另列下文 | 继续参考脚本、素材、语音、字幕和合成阶段划分 |

许可原文、官方文档和具体参考路径见 [本轮开源调研](docs/OPEN_SOURCE_RESEARCH_2026-10-03.md)。上表记录阅读的版本与许可，并非声明项目包含了上游代码，也不是运行这些项目后的质量评测。

ComfyUI、OpenCut/classic 和 Storyboarder 属于本轮筛选或后续候选，未纳入运行时、代码或媒体资产。ComfyUI 为 GPL-3.0，权重与插件另有许可；OpenCut 存在重写/归档版本差别；Storyboarder 许可未明确。未来如引入任何代码、组件、权重或素材，需逐项补充来源、版本、适用许可与相应声明，不能以本轮方法借鉴代替代码分发义务。

### 六项作者公开方法

工作台展示以下方法及仓库链接，不自动安装、触发或执行它们：

- [model-eval-workflow](https://github.com/Yiheng-guo/model-eval-workflow)
- [ai-product-teardown](https://github.com/Yiheng-guo/ai-product-teardown)
- [aigc-script-development](https://github.com/Yiheng-guo/aigc-script-development)
- [aigc-storyboard-planning](https://github.com/Yiheng-guo/aigc-storyboard-planning)
- [aigc-media-badcase-review](https://github.com/Yiheng-guo/aigc-media-badcase-review)
- [aigc-video-delivery](https://github.com/Yiheng-guo/aigc-video-delivery)

各仓库包含作者改编、自研工具或上游方法来源，授权范围以其自身许可及第三方声明为准；不能把六项都表述为无上游的原创模型系统。实习经历来源于用户自述，开源工具与合成正反例是后续个人整理，不能冒充企业内部原始交付。详细输入输出、来源和未测边界见 [资产映射](docs/INTERNSHIP_ASSET_MAP.md)。

### 早餐短剧外部实践

[《下次做给我吃》公开复盘](https://github.com/Yiheng-guo/ai-short-drama-production-playbook) 作为方法参考；用户明确它在另一个平台完成，平台未由用户指名，**不是漫序产出**。六集、403 秒、124 笔视频生成和 11,460 积分不构成本平台运行统计。

本轮没有把该仓库的渲染源码、角色参考、源视频、原始流水或大体积图像复制进漫序。公开目录未提供独立 LICENSE，不能仅因作者相同就对公开访客宣称该仓库全部内容可按 MIT 再分发。Pillow 动态文字修复为方法叙述，并未获得公开可运行的对应实现。详细核查见 [早餐实践映射](docs/BREAKFAST_PRACTICE_MAP.md)。

## 2026-09-22：课程来源与继续适用的依赖声明

以下保留原课程声明，本轮机制调研不覆盖原有来源、许可与素材记录。

## MoneyPrinterTurbo

- 上游：https://github.com/harry0703/MoneyPrinterTurbo
- 作者许可署名：Copyright (c) 2024 Harry
- 用户提供的 ZIP 中标记提交：`3d5f4e421927d61f3eac729cf4b711ac0b69d688`
- 许可：MIT，原文保留于 `docs/licenses/MoneyPrinterTurbo-MIT.txt`。
- 参考范围：阅读 `app/services/task.py` 的脚本、素材、语音、字幕、视频分阶段组织方式及媒体处理相关结构。用于工作流设计参考。
- 本仓库不包含其应用源码、推广广告、第三方 Key、模型配置或原有素材。React 工作台、Node API/worker、SQLite 状态逻辑和渲染适配均为本项目独立实现。

## 主要依赖

Next.js、React、Tailwind CSS、Lucide、Zod、Sharp、Playwright 等遵循各自包中的许可证。项目源码采用 MIT，不改变依赖的许可。

`@ffmpeg-installer/ffmpeg` 安装器使用 LGPL-2.1，平台 FFmpeg 二进制按其构建选项适用 LGPL/GPL 条款，详见 https://ffmpeg.org/legal.html 与对应 npm 平台包。仓库不直接分发 FFmpeg 二进制，安装时从 npm 获取，也支持自行指定 `FFMPEG_PATH`。

字体使用本机系统字体与开源字体回退；不打包商业字体。macOS 语音调用系统能力，不重新分发系统语音资源。

## 原创示例与 AI 辅助

本项目开发使用 AI 编程辅助。示例剧本与视觉提示词为本项目创作；三张 PNG 通过内置 imagegen 工具生成。生成方法、提示词和使用位置记录于 `docs/素材来源.md`。不宣称 AI 图像具有人类独创作品的排他性权利，也不包含已知第三方角色或商标。
