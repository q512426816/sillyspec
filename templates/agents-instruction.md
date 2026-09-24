# Agent 指引

## 项目说明
本项目使用 **SillySpec** 管理变更，采用文档驱动开发。SillySpec 是给 Agent 调用的 CLI 流程控制器，不是给人类直接使用的产品，也不是处理业务逻辑的工具——你（Agent）通过 CLI 告诉它"我在哪"，它告诉你"下一步做什么"；你执行步骤，它校验产出、推进状态，人类只在关键决策点介入审批。要考虑多 agent 同时操作代码，代码随时可能变化。所有变更以稳定、可用、可维护为目标，按生产级标准处理。

## 核心规则
1. **禁止绕过本文件规则和 SillySpec 流程**。所有变更走 sillyspec 流程，不裸改裸提交。
2. **改代码前必须先说明依据**——依据的文档路径（design.md / 模块文档 / file-lifecycle.md）或现有代码依据，无依据不改。
3. **需求已含决策的常规变更走轻量变更（默认快道）**：`sillyspec flow start --change <名> --input "<含『成功标准：』条目的需求>"` → 直接干活（改代码写测试，治理工件 CLI 机器起草）→ `sillyspec flow done --change <名>`。全程 2 次协议调用：机器起草 proposal/requirements（每条 FR 带测试绑定槽）/design 四节槽，收口带实测门、测试绑定提升、patch 留档；需求不清晰时 CLI 会拦下给两选一。
4. **需求不明确先头脑风暴预段**：`sillyspec run brainstorm --change <名>`（人机交互探索需求、出 design/决策/原型）→ 完成后 `sillyspec flow start --change <名>`，头脑风暴产物自动收编续跑轻量变更（不重复起草；design 以头脑风暴版为准）。
5. **大改动 / 跨模块 / 需要计划编排的复杂变更走完整流程**：`brainstorm → plan → execute → verify → archive`。**轻量→完整转道是用户决策**：须征得用户同意并带 `--upgrade-thick`（同意门留痕，无 flag 拒跑）；轻量变更实测失败自动升厚档位语义兜底归档校验。选道不看技术关键词——风险面由收口评审按证据（承诺词/diff 原语/盲维作答）判定。
6. **quick 为存量过渡通道**（退役中——新工作不再用）：仅用于收尾进行中的 quick 会话；新的小修复一律走轻量变更（规则 3）。
7. **执行顺序**：文档 → 读代码 → 写测试 → 写实现 → 跑测试 → 验收 → 更新文档。
8. **判规模选道**：需求明确、无跨模块取舍 → 轻量变更（规则 3）；需求不明 → 头脑风暴预段后转轻量变更（规则 4）；**需要 Wave 计划编排 / 多阶段治理 / 设计期人机对抗的大变更** → 完整流程（规则 5）；微小修补 → quick（规则 6，过渡）。选道看流程形态需求，不看技术关键词——风险面由收口评审按证据判定。
9. **代码先行不补流程（倒推 B 模式）**：代码若已先写好，**不回头补 brainstorm/plan 装样子**——用轻量变更收尾：`sillyspec flow start --change <名> --input "<已做改动的描述＋成功标准>"` → `sillyspec flow done`（实测门+测试绑定+patch 留档一步收口，改动如实登记为变更级归档）；存量 quick 会话仍可 `quick --done` 收尾。
10. **实证核验再 `--done`**：触及 `src`/`test` 的改动，CLI 会在 `quick --done` 时**亲自实测** `.sillyspec/local.yaml` 的 `commands.test` / `commands.lint`（门禁：实测失败阻断 --done 回 pending；纯 doc/配置与未配置命令自动跳过；倒推 B 模式按 --files 声明边界兜底判定）。agent 侧预跑**可选**——想省「--done 被拦→修复→重跑」一轮时才预跑；纯 doc/配置改动无需跑。以落盘文件与测试结果为准，不信口头"已完成"。
11. **中途停下不靠额外命令存进度**——进度已由上一次 `--done` 自动落盘；恢复时用 `sillyspec progress show` 查看进度，再用 `sillyspec run <stage>` 续跑，不直接 commit 半成品。
12. **实现完成后对照文档验收**（design.md / 模块文档），并检查是否影响已有测试。
13. **非测试逻辑本身有误时，禁止改测试来"通过"**——修逻辑，不修测试。
14. **git hook 拦截提交时禁止跳过**（如 `.husky/pre-push`），修复问题后再提交。
15. **代码必须兼容 Windows / Linux / macOS**（路径 / 换行 / 并发都要顾）。
16. **任务记录隔离**：永不重置 / reset / 清零已存在的 change；多个活跃 change 各自 `--change <名>` 隔离不重叠；quick 同一 QUICKLOG 按 ql-ID 条目追加，不冲突。
17. **quicklog 结构化落盘**（存量通道——新工作不再产生 quicklog 条目，轻量变更以变更级归档取代；仅收尾存量 quick 会话时适用）：末步 `--done` 用四参数 `--req/--cause/--solution/--result`（CLI 合成结构化 output 并自动提取标题/四段分行）；文件括注用 `--file-notes "path::注 || path2"`。骨架由 CLI 接管，`--done` 后按需核对即可，勿手拼模板。
18. **代码可能随时在修改**（多 agent 并行），Edit 前重跑 + 查最新态；破坏性 git op 前先备份。
19. **不奉承用户**，禁止"你说得对"类话术，直接给结论、依据、方案。
20. **禁止目录级 git add / git add -A**（多会话共享仓）：.sillyspec/ 等目录里有并行会话的进行中文件与已提交文档，目录级暂存会夹带他者改动甚至误删已提交文件（2026-09-10 实证）。提交一律用显式 pathspec（git add -- 文件1 文件2），提交前 git status 核对暂存面只含本会话文件。
