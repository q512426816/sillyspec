---
author: qinyi
created_at: 2026-09-14T11:19:35+08:00
---

# SillySpec 真实能力亮点全景（推广与介绍基准稿）

> 定位：对外推广与介绍的能力基准稿。README / SKILL / 演讲 / 文章的对外叙事以本文件为准。
> 维护纪律：①只写代码实证过的能力（每项附模块锚点），不写愿景；②新能力落地时同步本文件；③数字一律带 as-of 日期；④引用源码只写模块路径不写行号（防 docs-check 锚点漂移）。
> 依据：2026-09-14 对全仓 125 个源码模块的逐块盘点 + prompt-control-debt / round-trip-economics 两份工程文档 + 坑史（ql-ID 编号体系）交叉核验。

## 0. 一句话定位（电梯稿，按受众选一）

**给工程负责人 / VPE：**
SillySpec 是多 agent 仓库的变更账本 + 确定性验收层。当多个 AI agent 并行改同一个仓库时，它负责隔离、归属、竞态协调、验收防谎报和跨会话恢复——这些是模型能力永远覆盖不到的：模型再聪明，也看不到另一个进程此刻在盘上写了什么。

**给 AI 编程工具重度用户：**
别的 skill 教 AI 守规矩，SillySpec 让 AI 撒谎也过不了门禁——测试是 CLI 亲自跑的，进度是 SQLite 记的，中断了随时续跑，多个 agent 并行也不串线。

**技术一句话：**
一个约 68K 行的流程状态机 CLI：spec 驱动的阶段流转 + 实测验收门禁 + 多写者并发控制 + 跨仓 worktree 隔离。模型无关、harness 无关、仓库内自包含。

## 1. 与同类工具的本质区别

Superpowers / OpenSpec / SpecKit 的纪律以 markdown 文本存在，活在模型的注意力里；SillySpec 的纪律以进程、磁盘和服务器存在，活在外部状态里。这决定了两者在模型能力上涨时的不同命运。

| 维度 | 文本纪律类（Superpowers / OpenSpec / SpecKit） | SillySpec |
|---|---|---|
| 纪律存在形式 | prompt 文本，靠模型读了照做 | 进程 + SQLite + 文件锁 + 服务器，fail-closed |
| 验收 | 靠模型自觉与自报 | CLI 亲自执行 test/lint 对账，自报与实测不符即阻断 |
| 多 agent 并行 | 无原生支持 | 会话/变更/worktree 三级隔离 + 竞态硬门 + 平台乐观锁 |
| 断点恢复 | 无（会话上下文即全部） | SQLite 权威进度库 + quicklog 追加式账本，跨会话跨天续跑 |
| 防伪造 | 无 | docHash 重算比对、git 证据交叉对账、实测时间线 |
| 模型变强时 | 价值单调递减（文本被内化） | prompt 层持续收缩（有债单管理），门禁层不贬值 |
| 工具锁定 | 依赖特定 harness 的 skill 机制 | 7 种 harness 适配，状态在仓库内，换工具不丢 |

一句话：**文本纪律是概率约束，SillySpec 是确定性事件。** 前者随模型智商通胀，后者不会——确定性门禁的失效条件不是模型变聪明，而是平台原生接管（见 §4 质疑回应）。

## 2. 四层能力地图

### 第一层：护城河（外部状态，模型能力不可替代）

#### 1.1 多 agent 并发控制

不是一把锁把 agent 串行化，是三层机制，每层对应真实踩过的事故：

- **隔离（让冲突尽量不发生）**：每个变更一个目录 + 一行 DB；quick 会话独立会话目录 + 独立 DB 行；execute 在独立 git worktree 工作，收尾三方合并，变更文件必须 ⊆ design 清单 ∪ task allowed_paths，越界硬拦。git 提交纪律：显式 pathspec、禁目录级 add。
- **归属（分清这是谁改的）**：quick 启动声明文件边界，收尾审计把窗口 diff 切成「归属文件」（窗口∩声明）与「未声明文件」（落审计行可追溯）；`--done` 前并发写预检把脏文件分类「本变更关联 vs 他者」并告警。
- **竞态硬门 + 分布式协调（撞上了怎么办）**：ql-ID 分配走文件锁（O_EXCL + 原子抢陈锁）并查他者会话 guard 预留，盘上同 ID 条目 ≥2 时 fail-closed 硬拦；7 天僵尸预留不钉号、空壳会话带年龄缓冲探测、幽灵 worktree 自动归档；平台同步走乐观锁（base_ts）+ 身份头 + 服务器权威钟，push 409 / pull 冲突双路径做血统归属判定（本人自回声不落冲突文件，他者更新才是真冲突）。

模块锚点：`src/run/shared.js`、`src/quicklog.js`、`src/run/concurrent-detect.js`、`src/sync.js`、`src/worktree.js`。
难抄点：每个机制都从事故里长出来（commit message 里的坑编号可查），竞品要抄得先把同类坑全踩一遍。

#### 1.2 实测验收 + 防伪造链

- **CLI 亲测**：verify / quick 收尾时 CLI 用 execSync 亲自执行项目配置的 test / lint 命令，与 agent 自报结果对账——自报 PASS 实测 fail 直接阻断，回滚完成状态。
- **隔离快照**：quick 门禁跑在 HEAD+overlay 隔离快照里，并行会话留在工作区的脏文件不污染本会话门禁结果。
- **防伪造链**：review.json 的 docHash 由 CLI 重算 sha256 比对；task review 的 base..head git 提交证据与实际 diff 交叉对账；测试结果落实测时间线（status / exitCode / 失败清单）。

模块锚点：`src/verify-postcheck.js`、`src/run/quick-audit.js`、`src/run/gate-snapshot.js`、`src/task-review.js`、`src/stage-review.js`。
一句话：**agent 说的不算，CLI 亲自跑过的才算。** 这是概率分布与确定性事件的区别。

#### 1.3 持久账本 + 断点恢复

- SQLite 单一进度权威源：stage/step 粒度状态、wait 等待态与人类审批答复全部落库。
- quicklog 追加式结构化台账：每条快速任务四字段（需求/根因/方案/结果）+ 文件括注 + ql-ID 检索。
- 跨会话跨天断点续跑：进度由上一次收尾自动落盘，恢复即查即续；5 小时 API 配额中断也能从已勾选任务继续。
- 对比 harness 自带记忆：有损压缩 + 单厂商锁定；SillySpec 是无损、可移植、可审计的事实源。

模块锚点：`src/progress.js`、`src/db.js`、`src/quicklog.js`。

#### 1.4 跨仓变更管理

- task 卡可声明 `repo:` 字段，跨仓任务不再直写对方仓的主工作副本。
- 跨仓同构 worktree 隔离：base 锚跨仓 HEAD 快照；用户在途改动进 dirty baseline 不算交付 diff、apply 不覆盖；依赖按跨仓自身项目类型嗅探（实测过 maven 主仓 + nodejs 前端仓组合）。
- 封掉三类事故面：并行混流无法区分归属、无 base 锚、误伤用户未提交文件。

模块锚点：`src/worktree-cross.js`、`src/run/multi-repo-context.js`。
稀缺度：单仓多 agent 协调工具已少，跨仓变更隔离管理目前没有已知同类。

### 第二层：确定性对账（机械核验，零模型轮次）

- **范围对账（scope-audit）**：「计划改动 × 实际改动」机械对账，planned / unplanned / untouched 三态 + 行数三档，execute / verify / archive / quick 四处收尾注入——"这次变更偷偷改了计划之外的东西"会被告警。
- **API 契约矩阵（contract-matrix）**：plan 阶段识别 task 间 provider / consumer 关系；execute 阶段后端 task 完成后自动提取 endpoint 工件、前端 task 开工时注入上游契约；verify 阶段做前后端 API parity 对账。接口漂移从"跑联调才发现"变成机器对账。
- **文档一致性棘轮（docs-check）**：校验文档里源码引用的真实性（文件存在 + 内容窗口断言），HEAD 模式校验被推的树而非脏工作区，失败数只许降不许升；配套锚点自动重锚。
- **noAI 下沉 / 轮次经济学**：机械轮次（手写机器要读的格式、复述机器已有的数据）下沉成 CLI 代码——诊断折叠、归档三重核对代算、四件套骨架预生成、上下文注入替代 cat。判断层散文永远留给 agent。模型越强可下沉越多，成本结构与模型能力同向。
- **IR 事实层**：verify 事实五段结构、证据分类核验、cannot_verify 硬门、target_files 三源对账（git diff / status / pathspec）；阶段契约声明式清单同一份源既渲染进 prompt 预览又供引擎事后核验（persuasion 与 enforcement 单源）。

模块锚点：`src/scope-audit.js`、`src/contract-matrix.js`、`src/endpoint-extractor.js`、`src/docs-check.js`、`src/stage-contract-spec.js`。

### 第三层：协作与流程特性

- **规范驱动 + 阶段状态机**：scan → brainstorm → plan → execute → verify → archive，每阶段入口契约、产物文件名、门禁校验强制流转，不能跳步。
- **子代理并行 + Wave 拓扑**：plan 按 depends_on 自动拓扑排序，同 Wave 任务并行执行。
- **独立审查体系**：Design Grill 设计审查、stage review / task review 分层审查、review tier 分级，provenance 盖章（谁写的、何时写的）。
- **人类审批持久化**：wait 等待态与审批答复落库，关键决策点人类介入，答复跨会话不丢。
- **跨机派发**：execute 子代理可派到 SillyHub MCP 远端 worker 池，可用性探测自动选后端，逐 worker 回退本机——并行度从单机扩展到跨机。
- **棕地入库（scan）**：给已有代码仓生成七份架构文档 + 模块映射的 onboarding 路径（多数同类工具是绿地假设）。
- **知识飞轮**：模块级知识库按需注入、成功变更蒸馏为可复用模板（export）、决策版本化（D-xxx@vN 带 supersedes 链）。
- **可配置工作流**：`.sillyspec/workflows/*.yaml` 自定义流程 + 产物 post_check + 按角色定位失败生成重试指引。

模块锚点：`src/stages/`、`src/dispatch/`、`src/workflow.js`、`src/knowledge.js`、`src/modules.js`。

### 第四层：自我运维与 UX

- **doctor 自诊自愈**：13 维诊断（指针健康 / 孤儿目录 / DB 一致性 / worktree 状态等）+ 幽灵 worktree / 僵尸会话自动归档——死会话不永久阻塞活会话。
- **摩擦计数（friction-tally）**：门禁回滚 / 实测失败 / 审查打回三类摩擦事件结构化计数（隐私红线：不落提示词原文），收尾非零提示补 postmortem——工具量化自己的摩擦喂改进循环。
- **测试策略分档**：full / module / skip / evidence-auto 四档 + known_failures 台账 + flaky 失败文件串行复跑治理。
- **dashboard**：本地 Web 进度面板（独立子包）。
- **机器接口**：gate / derive / progress 输出机器可读 JSON 信封 + MCP server，供 harness 与外部工具程序化消费。
- **eval 框架**：任务级对照评测（dry / pilot 两模式），支撑"上量 vs 不上量"的能力 claims 用数据说话。

模块锚点：`src/doctor-diagnostics.js`、`src/friction-tally.js`、`packages/dashboard/`、`src/machine-interface.js`、`eval/`。

## 3. 数据面板（as of 2026-09-14，v3.28.8）

| 指标 | 数值 |
|---|---|
| 源码规模 | 67,975 行（125 个 JS 模块） |
| 测试 | 463 个测试文件，826 个 test() 用例、3,357 处断言，全量回归通过 |
| 代码构成 | 验证门禁 ~33% / 流程编排与 prompt ~29% / 多 agent 协调 ~10-18% / 持久化 ~10% |
| 工程履历 | 78 个归档变更（含完整设计文档与验收记录） |
| harness 适配 | Claude Code / Cursor / Codex / OpenCode / OpenClaw / Gemini / ZCode 等 7 种 |
| 平台 | Node.js ≥ 22.13（内置 node:sqlite，零编译安装），Linux / macOS / Windows |
| 依赖 | 7 个运行时依赖，纯客户端（无自带服务器进程） |

## 4. 常见质疑与标准回应

**Q1：「模型够强了（GPT-5.6 / Fable 5 时代），流程纪律类工具会被卸载潮淘汰。」**
对文本纪律成立（prompt 里的规矩会被模型内化），对确定性门禁不成立。模型输出是概率分布，门禁是确定性事件——概率右移不消灭"自报 PASS 实测 fail"，更消灭不了多进程竞态。SillySpec 自己用债单管理 prompt 层收缩（enforced 的删复述、persuasion-only 的补硬门），模型变强只加速这笔债偿还，方向一致。

**Q2：「harness 自带记忆、会派子 agent，会吸收这些功能。」**
记忆：厂商自带是有损压缩 + 单厂商锁定，SQLite 账本无损可移植。子 agent 派发：恰恰是需求放大器——派发越多，多写者协调越刚需。SillySpec 的并发坑史全部发生在"多 agent 并行"出现之后，这是被趋势喂养的能力，不是被趋势淘汰的能力。真正的失效条件是 harness 原生提供跨会话互斥 + 进度状态机 + 实测验收门禁，目前无一家做到，且厂商缺乏跨工具兼容动机。

**Q3：「重流程烧 token，几百万 token 写完文档还没干活。」**
批评对象是不分档的一刀切流程。SillySpec 的流程重量随任务规模缩放：小改动走 quick（≤3 文件档）、代码先行有倒推收尾模式、门禁分级在建设中；noAI 下沉让机械轮次零 token。轮次经济学是持续在做的工程（见 round-trip-economics 文档），成本结构与模型能力同向优化。

**Q4：「Superpowers 都被批量卸载了。」**
被卸载的是文本纪律那半。变更账本、竞态硬门、实测验收、跨仓隔离没有等价替代品——这半不在卸载潮的射程里。

## 5. 诚实边界（推广时主动说清，不夸大）

- **TDD 措辞**：实际是"测试先行约定（task 卡 verify 字段）+ 末端 CLI 实测门禁"，不是逐步顺序硬证。介绍时用前者，不用"TDD 强制"。
- **语义判断的归属**：权衡、理由、风险、需求澄清永远留给 agent 与人类。CLI 不替人想清楚要做什么——这句话对任何工具都成立，包括本工具。
- **quick 的定位**：轻量逃生通道，不校验 design 一致性（边界声明里明确写了）；跨模块联动该走完整流程。
- **单人单会话场景**：护城河层价值打折——核心场景是多 agent / 多会话 / 多机并行。单用户轻量使用时，主要价值收敛为实测门禁与断点恢复。
- **平台功能**：SillyHub 对接（文档同步 / 团队审批 / 跨机派发）是可选增强，本地独立使用功能完整。

## 6. 叙事纪律（对外写作时的措辞规范）

1. 说"确定性 / 实测 / fail-closed"，不吹"智能 / 自动理解"——本工具的价值恰在不依赖智能。
2. 每个亮点能落到模块路径；讲不清实现细节的能力不写。
3. 数字带 as-of 日期，过期重查。
4. 不贬竞品功能：文本纪律在模糊需求、低纪律用户场景仍有效；对比只讲纪律存在形式（注意力 vs 外部状态）的差异。
5. 场景优先：先讲多 agent 并行仓库的具体痛点（撞车 / 误归属 / 谎报 / 失忆），再引出机制——反过来讲会变成功能清单背诵。

## 7. 互指

- 工程原则与债单：`docs/sillyspec/prompt-control-debt.md`（enforcement vs persuasion）
- 轮次经济学：`docs/sillyspec/round-trip-economics-2026-09-08.md`
- IR 事实层方案：`docs/sillyspec/archify-ir-stage-proposal-2026-09-05.md`
- 平台同步契约：`docs/sillyspec/sillyhub-progress-sync-contract.md`
