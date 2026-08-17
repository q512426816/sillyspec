# Claude Code 指引

# 定期解决这些问题
 此目录下的 C:\Users\qinyi\IdeaProjects\multi-agent-platform\docs\sillyspec 文件（排除 finished 目录下的）
 若已解决则将对于的文件 移动到 C:\Users\qinyi\IdeaProjects\multi-agent-platform\docs\sillyspec\finished 目录下

## 项目说明
本项目（SillySpec）使用 **SillySpec** 自身管理（dogfood），采用文档驱动开发。SillySpec 是给 Agent 调用的 CLI 流程控制器，不是给人类直接使用的产品，也不是处理业务逻辑的工具——你（Agent）通过 CLI 告诉它"我在哪"，它告诉你"下一步做什么"；你执行步骤，它校验产出、推进状态，人类只在关键决策点介入审批。要考虑多 agent 同时操作代码，代码随时可能变化。所有变更以稳定、可用、可维护为目标，按生产级标准处理。

## 核心规则
1. **禁止绕过本文件规则和 SillySpec 流程**。维护 sillyspec 自身也走 sillyspec 流程，不裸改裸提交。
2. **改代码前必须先说明依据**——依据的文档路径（design.md / 模块文档 / file-lifecycle.md）或现有代码依据，无依据不改。
3. **新功能 / 大改动走完整流程**：`brainstorm → plan → execute → verify → archive`。
4. **小修复 / 小调整走 quick**：`sillyspec run quick`。
5. **执行顺序**：文档 → 读代码 → 写测试 → 写实现 → 跑测试 → 验收 → 更新文档。
6. **判规模选档**：≤3 文件、范围明确走 `quick`；多阶段 / 架构级走完整流程。
7. **代码先行不补流程（倒推 B 模式）**：代码若已先写好，**不回头补 brainstorm/plan 装样子**——用 `quick --done` 收尾 + 补 quicklog 条目，把已落盘改动如实登记进进度库。
8. **实证核验再 `--done`**：`quick --done` 前先 `npm test` + `npm run lint`，以落盘文件与测试结果为准，不信口头"已完成"。
9. **中途停下不靠额外命令存进度**——进度已由上一次 `--done` 自动落盘；恢复时用 `sillyspec progress show` 查看进度，再用 `sillyspec run <stage>` 续跑，不直接 commit 半成品。
10. **实现完成后对照文档验收**（design.md / 模块文档），并检查是否影响已有测试。
11. **非测试逻辑本身有误时，禁止改测试来"通过"**——修逻辑，不修测试。
12. **hook 拦截提交时禁止跳过**（`.husky/pre-push`），修复问题后再提交。
13. **代码必须兼容 Windows / Linux / macOS**（路径 / 换行 / 并发都要顾）。
14. **CLI 一律在主仓库根跑，永不 `cd` worktree**（会写分裂进度库）；读用绝对路径或 `git -C`。
15. **任务记录隔离**：永不重置 / reset / 清零已存在的 change；多个活跃 change 各自 `--change <名>` 隔离不重叠；quick 同一 QUICKLOG 按 ql-ID 条目追加，不冲突。
16. **quicklog 手动精修**：CLI 只写骨架，`--done` 后手动补语义化标题 / 文件多行带括注 / 结果四段。
17. **代码可能随时在修改**（多 agent 并行），Edit 前重跑 + 查最新态；破坏性 git op 前先备份。
18. **发现 SillySpec 自身缺陷或改进点**，记录到 `docs/`（troubleshooting.md / ROADMAP / quicklog），处理好后归档。
19. **改动触及 `src/stages/*` 或文件生命周期代码**，按下方「文件生命周期文档同步」「提示词文档同步」同步文档与 `.claude/skills/`。
20. **不奉承用户**，禁止"你说得对"类话术，直接给结论、依据、方案。

## 项目状态
- 已发布 npm（当前 3.26.9）；`.sillyspec/` 进度库、测试 fixture、quicklog 可重置，不要求历史兼容。
- 文档 / 提示词 / 错误信息默认中文，必要专业术语除外。

## 文件生命周期文档同步
每次修改 `src/stages/` 下的阶段定义（prompt、步骤、输出文件名等）或 `src/run.js`、`src/progress.js` 等影响文件生命周期的代码后，**必须同步更新** `docs/sillyspec/file-lifecycle.md`，确保文档与代码一致。
修改后，如涉及到对应的 SillySpec SKILLS，要同步更新 `.claude/skills/`。

### 触发更新的典型改动
- 新增 / 删除 / 重命名阶段步骤
- 修改步骤 prompt 中的输出文件名（如 verify-result.md）
- 修改阶段间的流转逻辑（如 archive 归档方式）
- 新增 / 删除运行时文件类型（如 gate-status.json）
- 修改 ProgressManager 的数据存储方式（如 SQLite 表结构变更）

### 更新检查清单
- [ ] 文件名引用一致（prompt 输出的文件名 == validateFileLocations 期望的文件名）
- [ ] 阶段步骤描述与 `src/stages/*.js` 一致
- [ ] 归档 / 清理流程描述与实际代码逻辑一致
- [ ] 数据库 Schema 描述与 `src/db.js` 一致
- [ ] 更新文档头部 `updated_at` 时间戳

## 提示词文档同步（docs/prompt/）
`docs/prompt/` 收录各阶段 CLI→Agent 的**逐步提示词原文**（人类可读 md 参考）。详见 `docs/prompt/README.md`。

### 数据源关系（重要 — 避免双写漂移）
- **唯一数据源 = `src/stages/*.js`**（`definition.steps[].prompt`，CLI 运行时读这里）+ `src/run/prompt.js`（注入框架：persona / 铁律 / 占位符替换 / 完成后执行命令模板）。
- `docs/prompt/*.md` 是源码的**机械提取人类可读镜像**，由 `node docs/prompt/_extract.mjs` 一键再生（源码 → `_extracted.json` → md）。提取脚本对静态阶段直接读 `definition.steps`，对动态阶段（plan / execute）用示例输入跑 `buildPlanSteps` / `buildExecuteSteps` 得到真实 prompt。
- **禁止手改 md 里的 prompt 原文**（下次提取会被覆盖，且与源码不一致）。要改提示词，改源码后重跑脚本。

### 触发同步的改动
- 修改 `src/stages/*.js`：`definition.steps[].prompt`、步骤名、步骤增删 / 重排、wait 配置、`_globalGuardrails`、title/description
- 修改 `src/run/prompt.js`：persona / 铁律 / 占位符替换 / 完成后执行命令模板
- 修改 `stage-review.js` / `review-tier.js` / `knowledge-match.js`：影响 `{REVIEW_JSON_CONTRACT}` / `{REVIEW_TIER}` / `{KNOWLEDGE_HIT_REPORT}` 等动态块

### 同步步骤
1. 改源码
2. 运行 `node docs/prompt/_extract.mjs`（刷新 `docs/prompt/_extracted.json`）
3. 按变动同步对应 `docs/prompt/<stage>.md`（prompt 正文以 `_extracted.json` 为准逐字替换）+ 必要时更新 `docs/prompt/README.md`（占位符总表 / persona 表 / CLI 注入框架）

## 完成汇报格式
每次执行完成后，最终回复必须以固定短语开头：
`爸爸~爸爸~[YYYY-MM-DD HH:mm:ss]：`
要求：使用本地时间，格式示例 `2026-08-02 15:08:36`，不得改写或省略。随后按以下结构汇报：
- 改了什么
- 依据是什么
- 影响哪些模块
- 跑了哪些测试
- 是否需要同步文档
- 是否还有风险或遗留问题
- 如有建议的下一步，把对应新 session 提示词写下
- 如本次用到 sillyspec 工具，总结工具使用效果与驾驭能力（正面 / 负面都可，用于持续改进）
