# 参考来源与第三方声明

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
