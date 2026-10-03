# 漫序工作台：开源机制调研与本轮采用决策

核查日期：2026-10-03，Asia/Shanghai。以下是仓库、默认分支提交、许可证、官方文档及代表性源码的现场核查结果；提交日期不代表功能经过本项目联调，也不代表质量领先。本轮没有运行这些上游项目、复制上游源码、下载模型权重或新增 GPU 依赖。

## 1. 先明确沉淀的对象

用户提供的实习描述涉及快看漫画 AI 产品探索团队的产品拆解、创作者需求研究、模型评测与 Prompt、脚本和视频 Skill、人工确认、局部返工、交付检查以及周度分享。漫序适合承接这些方法，形成个人可持续使用的 AIGC 产品与创作工作台。

这里有两个必须分开的事实层：

- **经历与方法来源**：2026.03—2026.05 实习期间的工作内容来自用户提供的描述。尚未导入的原始任务、公司内部材料和量化成绩不能由当前平台补造。
- **软件实现**：现有漫序是实习方向之后的个人开源实现，已有本机剧本、角色、分镜、素材、配音、合成及任务持久化能力。不能写成快看漫画内部已经部署、投入生产或取得业务收益的系统。

产品的核心闭环应是：研究问题与证据 → 任务与样例 → 验收标准 → 原始输出与评分 → Bad Case → 修改与复测 → 可分享的方法记录。创作流水线是其中一条实践场景，而非全部定位。

## 2. 候选项目与实时核查

日期列为核查时默认分支最新提交时间，已转换为 Asia/Shanghai。没有以 Star 数排名。

| 项目 | 已核实许可与状态 | 默认分支提交快照 | 与漫序的对应点 | 本轮决策 |
| --- | --- | --- | --- | --- |
| [promptfoo](https://github.com/promptfoo/promptfoo) | MIT；未归档 | [a16d12b](https://github.com/promptfoo/promptfoo/commit/a16d12bf6f7a4bd6d169bb533c786dd9f0925e6a)，2026-10-03 03:31 | 固定测试集、Prompt/模型对照、规则和模型评分 | 采用评测记录结构；不安装运行时 |
| [LangGraph.js](https://github.com/langchain-ai/langgraphjs) | MIT；未归档 | [c6eeb26](https://github.com/langchain-ai/langgraphjs/commit/c6eeb26b4f7faf2a85495622a54319ff9cc468e6)，2026-10-03 03:35 | 持久化检查点、人工暂停、按任务恢复 | 采用确认与恢复原则；沿用自己的 SQLite/worker |
| [MoneyPrinterTurbo](https://github.com/harry0703/MoneyPrinterTurbo) | MIT；未归档 | [9db984c](https://github.com/harry0703/MoneyPrinterTurbo/commit/9db984c8befdcadccc3ee4b2a355e16e1595e0fa)，2026-10-02 18:28 | 文案、素材、配音、字幕、合成分阶段组织 | 延续已有流水线参考；加强阶段检查与局部返工 |
| [Toonflow 官方仓库](https://github.com/HBAI-Ltd/Toonflow-app) | 当前快照 MIT；未归档；旧版本许可不同 | [f37b772](https://github.com/HBAI-Ltd/Toonflow-app/commit/f37b7728f3cedfe6d7d64109a1aba47afafd1da8)，2026-10-02 00:27 | 角色/场景/分镜产物关系、连续性审阅、最小修改建议 | 采用连续性检查与审阅粒度；不引入其 Agent/画布/平台 |
| [ComfyUI](https://github.com/Comfy-Org/ComfyUI) | GPL-3.0；未归档 | [2472a20](https://github.com/Comfy-Org/ComfyUI/commit/2472a20bd291451acc303917059ab14dfc380478)，2026-10-03 02:50 | 可重放生成工作流、请求 ID、执行历史及产物 | 作为后续图片服务适配候选；本轮不接入 |
| [OpenCut](https://github.com/OpenCut-app/OpenCut) / [classic](https://github.com/OpenCut-app/opencut-classic) | 两者 MIT；新版未归档但正在重写；classic 已归档 | 新版 [e668010](https://github.com/OpenCut-app/OpenCut/commit/e668010778568641babef2cc40be4703ae6916d6)，2026-09-24 16:58；classic [cf5e79e](https://github.com/OpenCut-app/opencut-classic/commit/cf5e79e919144200294fb9fed22a222592a0aeea)，2026-05-18 00:07 | 时间轴的选中对象操作、命令撤销、素材与导出边界 | 保留交互参考；不把重写中的编辑器嵌入现有系统 |

MIT 状态分别核对了 [promptfoo LICENSE](https://github.com/promptfoo/promptfoo/blob/a16d12bf6f7a4bd6d169bb533c786dd9f0925e6a/LICENSE)、[LangGraph.js LICENSE](https://github.com/langchain-ai/langgraphjs/blob/c6eeb26b4f7faf2a85495622a54319ff9cc468e6/LICENSE)、[MoneyPrinterTurbo LICENSE](https://github.com/harry0703/MoneyPrinterTurbo/blob/9db984c8befdcadccc3ee4b2a355e16e1595e0fa/LICENSE)、[Toonflow LICENSE](https://github.com/HBAI-Ltd/Toonflow-app/blob/f37b7728f3cedfe6d7d64109a1aba47afafd1da8/LICENSE)、[OpenCut LICENSE](https://github.com/OpenCut-app/OpenCut/blob/e668010778568641babef2cc40be4703ae6916d6/LICENSE)；ComfyUI 核对了 [GPL 许可](https://github.com/Comfy-Org/ComfyUI/blob/2472a20bd291451acc303917059ab14dfc380478/LICENSE)。这些是本次快照信息；后续真正引入代码、插件、权重和素材时仍需逐项记录其来源与许可，不能只用主仓库许可证代替依赖声明。

## 3. 本轮选择的四项机制

### 3.1 promptfoo：从“给模型打分”变成可复测的任务矩阵

上游把 Prompt、模型提供商、输入样例和 assertion 分开定义。代表配置同时包含规则检查、延迟/费用阈值与模型辅助 rubric；官方文档区分确定性验证与模型评分。[代表性对照配置](https://github.com/promptfoo/promptfoo/blob/a16d12bf6f7a4bd6d169bb533c786dd9f0925e6a/examples/compare-claude-vs-gpt/promptfooconfig.yaml)，[官方评分文档](https://www.promptfoo.dev/docs/configuration/expected-outputs/)。

**漫序的适配决策：** 每个评测记录关联任务、样例、Prompt/约束版本、模型名称、验收标准、原始输出、实际用量、人工判断和结论。把“格式合法”“完整交付”“人物行为符合设定”“人工修改负担”分成不同检查项；一次评分不能替代全部维度。

**实现范围：** 本轮采用这些实体与对照方式，用现有数据库保存和导出记录；没有接入 promptfoo CLI，没有自动批量跑模型，也没有默认调用另一个模型充当裁判。人工录入成绩应标明记录来源；没有真实输出的配置仍是计划，不能计入已测结果。

### 3.2 LangGraph.js：人工确认应有状态与恢复语义

官方 interrupt 机制要求持久化检查点与稳定的任务标识；恢复可能重放节点，因此暂停之前的外部副作用需要幂等。上游也提供 SQLite 检查点实现。[人工介入文档](https://docs.langchain.com/oss/javascript/langgraph/interrupts)，[SQLite 检查点源码说明](https://github.com/langchain-ai/langgraphjs/blob/c6eeb26b4f7faf2a85495622a54319ff9cc468e6/libs/checkpoint-sqlite/README.md)。

**漫序的适配决策：** 脚本确认、分镜审阅、媒体交付检查应保存对象、对象版本、检查项、审阅意见和处理状态。局部返工记录应关联原问题和复测，刷新页面不会消失，改完也不能无记录地自动变成通过。

**实现范围：** 借鉴持久化人工确认与稳定 ID 原则，保持现有 SQLite 和独立 worker。新增审阅记录不等同于已经实现 LangGraph 的全图回放，也不应宣称已自动阻断所有未确认阶段。需要按实际代码与验证记录分别描述“人工记录”“自动门禁”和“暂停恢复”。

### 3.3 MoneyPrinterTurbo：分阶段产物使问题可以定位

代表性任务服务将脚本、素材、语音、字幕和视频处理拆成函数，并更新任务状态与阶段进度。这与漫序已有创作流程接近，现有第三方声明已经记录此前的参考范围。[任务服务源码](https://github.com/harry0703/MoneyPrinterTurbo/blob/9db984c8befdcadccc3ee4b2a355e16e1595e0fa/app/services/task.py)，[本项目现有声明](../THIRD_PARTY_NOTICES.md)。

**漫序的适配决策：** Bad Case 明确归属脚本、角色、分镜、图片、音频、字幕或合成阶段；关联作品和具体镜头。记录原问题、修改变量、重做范围及复测结果，帮助区分生成异常和后处理异常。

**实现范围：** 保留现有独立实现，不迁移上游 Python 服务。局部返工应操作具体镜头；如果本轮只是人工记录了建议，应叫“返工记录”，不能写成已自动重跑或已减少模型费用。节省多少需要实际调用和审阅计时对照。

### 3.4 Toonflow：将连续性变成可指出依据的审阅

官方当前快照包含连续性知识和专门的分镜审阅说明：检查角色状态、空间、动作和音画衔接；问题需要定位镜头并给出小范围修改建议；未见实际媒体只能审阅文字方案。[连续性检查资料](https://github.com/HBAI-Ltd/Toonflow-app/blob/f37b7728f3cedfe6d7d64109a1aba47afafd1da8/packages/teams/storyboardTeam/knowledge/continuity.md)，[分镜审阅角色](https://github.com/HBAI-Ltd/Toonflow-app/blob/f37b7728f3cedfe6d7d64109a1aba47afafd1da8/packages/teams/storyboardTeam/members/reviewer.md)。

**漫序的适配决策：** 把“人物违背设定”“前后镜头不连续”“动作与时长不自洽”“旁白/字幕/画面不对应”纳入质量问题标签；用依据、影响和复测组成记录，链接角色档案与镜头产物。供用户和研发讨论同一条具体问题，而不是只写一个整体质量分数。

**实现范围：** 本轮采用人工审阅标准，独立编写工作台内容，不复制其提示词。未接入视觉模型、身份锁定、参考图链或自动重生成；角色文本一致也不能当作画面身份一致的验证。

**版本辨别：** 搜索曾命中 [usherwong/toonflow 旧 fork](https://github.com/usherwong/toonflow)。其 2026-05 快照是 Apache-2.0 加附加商业条款，不能仅凭 GitHub 的 Apache 标签判断。官方新版已核实 MIT，并在 [README 许可段](https://github.com/HBAI-Ltd/Toonflow-app/blob/f37b7728f3cedfe6d7d64109a1aba47afafd1da8/README.md) 明确旧版本许可不追溯。本报告使用官方新快照。

## 4. 暂缓接入的选项及理由

### ComfyUI：保留可重放的生成请求契约

官方 API 示例通过请求 ID 提交工作流、监听执行结束，并按执行历史读取产物；这适合将来记录 seed、模型、工作流版本和镜头变体。[API 示例](https://github.com/Comfy-Org/ComfyUI/blob/2472a20bd291451acc303917059ab14dfc380478/script_examples/websockets_api_example.py)。

本轮优先建立任务、样例、审阅和复测闭环。接入 ComfyUI 会额外引入 Python/PyTorch、模型与节点维护、硬件适配和工作流兼容测试；不同权重及扩展许可还需要分别核查。本轮不安装它，不声称已具有参考图角色锁定或免费无限生成。未来也应作为独立服务适配，先核实接口和能力，不能把接口存在当成供应商联调成功。[官方环境说明](https://github.com/Comfy-Org/ComfyUI/blob/2472a20bd291451acc303917059ab14dfc380478/README.md)。

### OpenCut：参考对象级编辑，不承担完整剪辑器迁移

classic 的删除命令保存修改前时间轴状态，并只删除选中的元素；体现了对象级修改和撤销粒度。[删除命令](https://github.com/OpenCut-app/opencut-classic/blob/cf5e79e919144200294fb9fed22a222592a0aeea/apps/web/src/commands/timeline/element/delete-elements.ts)。可用于后续设计漫序的多镜头选中、修改范围预览与恢复。

当前 [新版 README](https://github.com/OpenCut-app/OpenCut/blob/e668010778568641babef2cc40be4703ae6916d6/README.md) 明确正在重写，并指向旧版本供当前使用；classic 已归档。把专业编辑器整套嵌入会扩大媒体执行、存储与交互成本。本轮不以新版规划中的插件、MCP 或 headless 能力作为已可用接口，也不新增完整多轨剪辑器。

### 额外筛选项：Storyboarder 暂不进入可复制代码候选

[Storyboarder](https://github.com/wonderunit/storyboarder) 的分镜预演与快速人工修改体验相关，但 GitHub API 未返回标准仓库许可证；`package.json` 指向 `build/license_en.txt`，仓库还有持续的许可澄清讨论。最新默认分支提交是 [8b81a25](https://github.com/wonderunit/storyboarder/commit/8b81a25c71d5f7ca46e8d5b8e3d4f7b3968f95c2)，2022-07-01 01:42。本轮不把它称为可直接复制的 MIT/Apache 项目，不复制代码或素材。[包许可字段](https://github.com/wonderunit/storyboarder/blob/8b81a25c71d5f7ca46e8d5b8e3d4f7b3968f95c2/package.json)，[上游许可讨论](https://github.com/wonderunit/storyboarder/issues/2639)。这是筛选结果，并非对其全部版权状态作法律判断。

## 5. 对漫序的落地清单与可检查证据

本轮选定的方向是自主实现四类记录，实际完成项以 [验证记录](验证记录.md) 和 [当前进度](当前进度.md) 为准：

| 方法沉淀 | 应保存的最小信息 | 能证明什么 | 不能直接证明什么 |
| --- | --- | --- | --- |
| 产品研究 | 问题、来源、观察、推断、需求、优先级理由 | 某项需求有可追溯的提出过程 | 整体业务收益、公司采用 |
| 模型评测 | 同任务输入、模型、Prompt 版本、标准、输出、评分者、调用来源 | 特定条件和样本上的对照结果 | 大样本模型排名、普遍提升 |
| Bad Case 与局部返工 | 作品/镜头/阶段、原问题、依据、修改范围、复测 | 一条问题如何被定位和处理 | 自动视觉检查或自动重跑已经接入 |
| 方法/Skill 沉淀 | 用途、输入输出、检查项、版本、复验记录、仓库链接 | 方法可以被重复使用和审查 | 六项 Skill 已全部找到并验证 |

用户描述中的“六项独立开源 Skill”需要逐项对应真实仓库/文件和复验记录。本轮已逐项找到六个公开仓库，详见 [实习资产梳理](INTERNSHIP_ASSET_MAP.md)；仓库可访问不代表每项 Skill 都已在漫序运行验证，不能用新写的模板冒充实习原始交付。

评测分母应保留失败、未评分及未完成记录，不能只展示成功样本。复测必须固定样例与标准，或说明发生了哪些变化；随机生成和不同供应商设置可能影响结论。人工评分最好记录评分依据，未来再增加盲评或第二评分者；模型裁判本身也可能产生偏差和额外调用。

成本记录区分实际调用次数、Token/媒体用量、供应商账单金额和人工审阅时间。没有供应商计费回执时，金额留空并说明来源，不使用开源宣传页的案例费用或推测单价代替本项目真实支出。上游工具免费不代表模型、GPU、存储与人工维护免费。

## 6. 来源、许可与原创范围

- 本次调研读了六个开源候选的 README/许可证/代表性源码，以及一个许可证不明确的筛选项；活动信息来自 GitHub REST `GET /repos/{owner}/{repo}`、`GET /repos/{owner}/{repo}/commits/{default_branch}`，不是搜索摘要中的 Star 或缓存日期。
- 借鉴的是评测实体、审阅粒度、持久化确认和阶段产物设计；上述“漫序适配决策”是本项目判断，不是上游功能实测结论。
- 本轮不复制上游代码、提示词全文、界面图或素材，没有引入上游运行时。新增页面、数据模型与规则由漫序独立实现。
- MoneyPrinterTurbo 的此前参考已记录在 [THIRD_PARTY_NOTICES](../THIRD_PARTY_NOTICES.md)，不因本次调研覆盖或删除原有来源。若后续改变为复制代码或打包第三方组件，需要另行补足对应版本、路径和许可文本。
- 本报告不含公司私有资料、不含模型凭证，不宣称本机可运行等于公网部署、角色描述约束等于一致性保证、示例记录等于真实业务量。
