<!-- SillySpec v3.28.3 — 由 sillyspec init 生成，可自由编辑；重跑 init 同版本不更新 -->
# Agent 指引

## 项目说明
本项目使用 **SillySpec** 管理变更，采用文档驱动开发。SillySpec 是给 Agent 调用的 CLI 流程控制器，不是给人类直接使用的产品，也不是处理业务逻辑的工具——你（Agent）通过 CLI 告诉它"我在哪"，它告诉你"下一步做什么"；你执行步骤，它校验产出、推进状态，人类只在关键决策点介入审批。要考虑多 agent 同时操作代码，代码随时可能变化。所有变更以稳定、可用、可维护为目标，按生产级标准处理。

## 核心规则
1. **禁止绕过本文件规则和 SillySpec 流程**。所有变更走 sillyspec 流程，不裸改裸提交。
2. **改代码前必须先说明依据**——依据的文档路径（design.md / 模块文档 / file-lifecycle.md）或现有代码依据，无依据不改。
3. **新功能 / 大改动走完整流程**：`brainstorm → plan → execute → verify → archive`。
4. **小修复 / 小调整走 quick**（= 无需要落盘的设计决策的改动，选道判据见第 6 条）：`sillyspec run quick`。
5. **执行顺序**：文档 → 读代码 → 写测试 → 写实现 → 跑测试 → 验收 → 更新文档。
6. **判规模选档**：看本次改动有无需要落盘的设计决策——有（新能力 / 行为契约变更 / 跨模块取舍 / 多阶段推进）走完整流程，无（范围明确的局部修补）走 `quick`。文件数不是选道判据，只作出口绊线——改动大或跨模块时 quick 收尾门禁会自动加查（分级提示补文件注记 / 测试增量 / 模块文档认领）。
7. **代码先行不补流程（倒推 B 模式）**：代码若已先写好，**不回头补 brainstorm/plan 装样子**——用 `quick --done` 收尾 + 补 quicklog 条目，把已落盘改动如实登记进进度库。
8. **实证核验再 `--done`**：触及 `src`/`test` 的改动，CLI 会在 `quick --done` 时**亲自实测** `.sillyspec/local.yaml` 的 `commands.test` / `commands.lint`（门禁：实测失败阻断 --done 回 pending；纯 doc/配置与未配置命令自动跳过；倒推 B 模式按 --files 声明边界兜底判定）。agent 侧预跑**可选**——想省「--done 被拦→修复→重跑」一轮时才预跑；纯 doc/配置改动无需跑。以落盘文件与测试结果为准，不信口头"已完成"。
9. **中途停下不靠额外命令存进度**——进度已由上一次 `--done` 自动落盘；恢复时用 `sillyspec progress show` 查看进度，再用 `sillyspec run <stage>` 续跑，不直接 commit 半成品。
10. **实现完成后对照文档验收**（design.md / 模块文档），并检查是否影响已有测试。
11. **非测试逻辑本身有误时，禁止改测试来"通过"**——修逻辑，不修测试。
12. **git hook 拦截提交时禁止跳过**（如 `.husky/pre-push`），修复问题后再提交。
13. **代码必须兼容 Windows / Linux / macOS**（路径 / 换行 / 并发都要顾）。
14. **任务记录隔离**：永不重置 / reset / 清零已存在的 change；多个活跃 change 各自 `--change <名>` 隔离不重叠；quick 同一 QUICKLOG 按 ql-ID 条目追加，不冲突。
15. **quicklog 结构化落盘**：末步 `--done` 用四参数 `--req/--cause/--solution/--result`（CLI 合成结构化 output 并自动提取标题/四段分行）；文件括注用 `--file-notes "path::注 || path2"`。骨架由 CLI 接管，`--done` 后按需核对即可，勿手拼模板。
16. **代码可能随时在修改**（多 agent 并行），Edit 前重跑 + 查最新态；破坏性 git op 前先备份。
17. **不奉承用户**，禁止"你说得对"类话术，直接给结论、依据、方案。
18. **禁止目录级 git add / git add -A**（多会话共享仓）：.sillyspec/ 等目录里有并行会话的进行中文件与已提交文档，目录级暂存会夹带他者改动甚至误删已提交文件（2026-09-10 实证）。提交一律用显式 pathspec，且 **add 与 commit 用同一份清单**：`git commit -m "..." -- 文件1 文件2`——带 pathspec 的 commit 只提交这些路径，他侧已 staged 的条目既不被带走、也原样留给对方；裸 `git commit` 提交的是整个共享暂存区，他会话 add 过的文件会被一并扫入（2026-09-17 实证：add 带 pathspec 但 commit 裸跑，并行会话 5 个 staged 文件被带入）。核对暂存面固定用 `git diff --cached --name-only` 全量读取，禁用 `git status | grep -v` 过滤式核对（过滤正是致盲原因）；核对与提交分开两条命令执行，不得链在同一命令里（链行没有拦截点）。`.husky/pre-commit` 的 commit-guard 会警告超声明面的 staged 文件（只警告不阻断，见 src/commit-guard.js）。
19. **会话启动先立身份**：agent 会话启动时 `export SILLYSPEC_SESSION_ID=<唯一标识>`（如 agent 名+任务名）——多会话并行时 change 所有权判定（apply / cleanup / assess 自动 apply / 归档对他会话活跃变更的接管拒绝）依赖此标识；缺省降级为 `anon@<主机名>` 机器级标识（只拦他机，同机并行不设防）。部分 harness 的 Bash 工具 shell 状态不持久（env 随命令丢失），此时接管类命令每条显式带 flag 回退：`sillyspec worktree apply <change> --session <唯一标识>`（`--session` 优先级高于 env）。
