# Claude Code 指引

# SillySpec工具定位
1. 是给Agent调用的CLI工具，非人类直接使用
2. 管理Agent工作流的CLI工具，非业务工具

## 文件生命周期文档同步
每次修改 `src/stages/` 下的阶段定义（prompt、步骤、输出文件名等）或 `src/run.js`、`src/progress.js` 等影响文件生命周期的代码后，**必须同步更新** `docs/sillyspec/file-lifecycle.md`，确保文档与代码一致。

### 触发更新的典型改动
- 新增/删除/重命名阶段步骤
- 修改步骤 prompt 中的输出文件名（如 verify-result.md）
- 修改阶段间的流转逻辑（如 archive 归档方式）
- 新增/删除运行时文件类型（如 gate-status.json）
- 修改 ProgressManager 的数据存储方式（如 SQLite 表结构变更）

### 更新检查清单
- [ ] 文件名引用一致（prompt 输出的文件名 == validateFileLocations 期望的文件名）
- [ ] 阶段步骤描述与 `src/stages/*.js` 一致
- [ ] 归档/清理流程描述与实际代码逻辑一致
- [ ] 数据库 Schema 描述与 `src/db.js` 一致
- [ ] 更新文档头部 `updated_at` 时间戳

## 提示词文档同步（docs/prompt/）
`docs/prompt/` 收录各阶段 CLI→Agent 的**逐步提示词原文**（人类可读 md 参考）。详见 `docs/prompt/README.md`。

### 数据源关系（重要 — 避免双写漂移）
- **唯一数据源 = `src/stages/*.js`**（`definition.steps[].prompt`，CLI 运行时读这里）+ `src/run/prompt.js`（注入框架：persona / 铁律 / 占位符替换 / 完成后执行命令模板）。
- `docs/prompt/*.md` 是源码的**机械提取人类可读镜像**，由 `node docs/prompt/_extract.mjs` 一键再生（源码 → `_extracted.json` → md）。提取脚本对静态阶段直接读 `definition.steps`，对动态阶段（plan/execute）用示例输入跑 `buildPlanSteps`/`buildExecuteSteps` 得到真实 prompt。
- **禁止手改 md 里的 prompt 原文**（下次提取会被覆盖，且与源码不一致）。要改提示词，改源码后重跑脚本。

### 触发同步的改动
- 修改 `src/stages/*.js`：`definition.steps[].prompt`、步骤名、步骤增删/重排、wait 配置、`_globalGuardrails`、title/description
- 修改 `src/run/prompt.js`：persona / 铁律 / 占位符替换 / 完成后执行命令模板
- 修改 `stage-review.js` / `review-tier.js` / `knowledge-match.js`：影响 `{REVIEW_JSON_CONTRACT}` / `{REVIEW_TIER}` / `{KNOWLEDGE_HIT_REPORT}` 等动态块

### 同步步骤
1. 改源码
2. 运行 `node docs/prompt/_extract.mjs`（刷新 `docs/prompt/_extracted.json`）
3. 按变动同步对应 `docs/prompt/<stage>.md`（prompt 正文以 `_extracted.json` 为准逐字替换）+ 必要时更新 `docs/prompt/README.md`（占位符总表 / persona 表 / CLI 注入框架）
