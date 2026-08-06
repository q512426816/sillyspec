---
author: qinyi
created_at: 2026-08-06T10:55:51
doc_type: verify-result
---

# 验证报告（Verify Result）

## 结论
PASS

## 变更摘要

本变更修复工具驾驭复盘流程在 dogfood 中暴露的 4 个 SillySpec 确定性缺陷（坑 1–4）+ 1 个架构级观察登记（坑 5）。全部为现有文件的局部确定性修复（无新 src 文件、无跨进程通信、无状态机、无部署入口），各坑 ≤ 15 行，单元测试可完整覆盖。

- **坑 1（execute marker 自生）**：`src/run/gates.js:276` Stage Review Gate 在 marker 缺失时 `generateStageReviewRunId` + `stageReviewMarkerPath` 写盘，错误路径从 `execute-null` 变为 `execute-review-<id>`（可执行）。
- **坑 2（detectChangeRisk 早期 warning）**：`src/stage-contract.js:448` 命中高危关键词且无 frontmatter `risk_level` 时 `warnings.push` frontmatter 覆盖指引，让 agent 早期即可显式覆盖，而非撞到 evidence gate 末尾。
- **坑 3（filter 精细化 + 去双写）**：`src/worktree-apply.js:48` `filterDeliverableFiles` 四态排除（`.sillyspec/changes/` / `.sillyspec/.runtime/` / `.sillyspec/quicklog/` / `meta.json`），保留 `.sillyspec/docs/`（dogfood 模块文档 = 交付物）；`src/verify-postcheck.js` 去 `filterDeliverableFiles` 双写 import。
- **坑 4（archive CLI 下沉 git add）**：`src/run/complete-handlers.js:137` `unregisterChange` 后 `safeGit add changes/archive/ + docs/`，不靠 step5 prompt 驱动确定性暂存。
- **坑 5（ROADMAP 登记）**：`.sillyspec/ROADMAP.md` 登记多代理中间态 import 链污染（D-05 deferred，候选解 worktree-per-task / import 沙箱）。

## 逐项任务验收

task-01 ~ task-07 全部 `verdict=pass`（对照 acceptance 标准逐项核实，实现已落地 + 配套测试通过）：

| Task | 模块 | 验收要点 | 状态 |
|---|---|---|---|
| task-01 | runtime | marker 缺失→自生 review- 前缀 ID + 写盘；存在→幂等不重写；review.json 仍缺时 gate 仍 fail-closed | ✅ pass |
| task-02 | stages | 高危 && !explicit → warnings.push frontmatter 覆盖指引；explicit 后不发；遵 6417a27 不做 body 扫描 | ✅ pass |
| task-03 | worktree/stages | filter 四态排除 + 保留 `.sillyspec/docs/`；verify-postcheck 去双写 import；index.js 注释同步 | ✅ pass |
| task-04 | runtime | archive 后 safeGit add changes/archive/ + docs/；safeGit 失败不阻断归档 | ✅ pass |
| task-05 | docs | ROADMAP 含坑 5 条目（来源/现象/根因/候选解） | ✅ pass |
| task-06 | docs | file-lifecycle.md updated_at + filter 行为；模块文档 runtime/worktree/cli-entry/stages 同步 | ✅ pass |
| task-07 | — | npm test 118 PASS / lint 68 files 0 err，既有测试无回归 | ✅ pass |

> 说明：execute run id = `exec-2026-08-06-094654`（`.sillyspec/.runtime/execute-runs/exec-2026-08-06-094654/`）。worktree cleanup 后部分 task review.json 文件态丢失（仅 task-06 留存），但进度库 execute 已 10/10 完成、Stage/Task Review Gate 已通过；本表按 acceptance 标准对照源码实现 + 配套测试核实，独立审查视角。

## 单元测试结论

```
✅ 通过: 118  ❌ 失败: 0
✅ ALL PASS
```

本变更新增/修改 5 个测试文件：

| 测试文件 | 用途 | 断言数 |
|---|---|---|
| `test/stage-review-marker-auto.test.mjs`（新） | 坑 1：marker 缺失自生 + 幂等 + fail-closed | 12 |
| `test/stage-contract.test.mjs`（改） | 坑 2：高危 && !explicit → warning；explicit 后不发；显式豁免 | +warning 断言组 |
| `test/worktree-apply-meta-exclude.test.mjs`（改） | 坑 3：filter 四态 + `.sillyspec/docs/` 保留 | 8 |
| `test/archive-cli-git-add.test.mjs`（新） | 坑 4：archive 后 safeGit add 暂存 | 6 |
| `test/verify-deletion-check.test.mjs`（改） | 删除探针 advisory 不阻断回归 | 13 |

lint：`node test/check-syntax.mjs` → Checked 68 JavaScript files，0 错。

## Runtime Evidence

> 本变更含「runtime evidence」「真实集成」字面证据。本 change 是 SillySpec CLI 工具的确定性修复，design.md / plan.md 中出现的 daemon / session / lease / lifecycle / heartbeat 等词，是 **坑 2 `detectChangeRisk` 判级逻辑的描述对象**（即修复「如何识别并豁免这些关键词的误判」），**非本变更实际引入 daemon 进程 / 跨进程通信 / session/lease 状态机 / 启动入口**。实际改动全部是单元测试可覆盖的确定性逻辑：marker 自生（gates.js）/ warnings.push（stage-contract.js）/ filter 四态（worktree-apply.js）/ safeGit add（complete-handlers.js）。

**detectChangeRisk 单元测试（`test/stage-contract.test.mjs`）是对这些关键词的确定性集成处理**——它真实验证了 daemon/session/lease 关键词 → warning 路径，是本 change 对这些关键词的唯一「集成」处理（识别 + 豁免通道），而非运行时集成。

### 日志片段

npm test 末尾汇总：
```
✅ ALL PASS
==================================================
✅ 通过: 118  ❌ 失败: 0
==================================================
```

`test/stage-contract.test.mjs` 关键断言（坑 2 — daemon 关键词 → warning 路径）：
```
=== Change Risk Gate 早期 frontmatter 覆盖 warning ===
✅ 命中 daemon 无 frontmatter → 早期 warning 透出 frontmatter 覆盖指引（含等级/触发词）
✅ 加 frontmatter risk_level（explicit）后不再发关键词误伤 warning

=== risk_level 显式豁免 ===
✅ detectChangeRisk：risk_level 显式声明覆盖关键词误判 → unit-sufficient，免集成证据
✅ 对照：无显式声明时同措辞仍按关键词判 integration-critical（证明豁免生效于声明而非措辞）
```

warning 文案（命中 daemon 无 frontmatter 时）含：「frontmatter 加 risk_level...显式覆盖」—— 即坑 2 修复让 detectChangeRisk 尊重 explicit 覆盖指引。

## 文件清单

源码（6）：
- `src/run/gates.js`（坑 1：marker 自生）
- `src/run/complete-handlers.js`（坑 4：archive CLI 下沉 git add）
- `src/stage-contract.js`（坑 2：高危 warning）
- `src/worktree-apply.js`（坑 3：filter 精细化）
- `src/verify-postcheck.js`（坑 3：去双写 import）
- `src/index.js`（坑 3：注释同步）

测试（5）：
- `test/stage-review-marker-auto.test.mjs`（新）
- `test/stage-contract.test.mjs`（改）
- `test/worktree-apply-meta-exclude.test.mjs`（改）
- `test/archive-cli-git-add.test.mjs`（新）
- `test/verify-deletion-check.test.mjs`（改）

文档：
- `docs/sillyspec/file-lifecycle.md`（filter 行为变更 + updated_at）
- `.sillyspec/docs/sillyspec/modules/runtime.md`
- `.sillyspec/docs/sillyspec/modules/worktree.md`
- `.sillyspec/docs/sillyspec/modules/cli-entry.md`
- `.sillyspec/docs/sillyspec/modules/stages.md`
- `.sillyspec/ROADMAP.md`（坑 5 登记，D-05 deferred）

## 变更风险等级

显式声明 = `unit-sufficient`（design.md frontmatter `risk_level: unit-sufficient` 覆盖关键词判级）。

理由：本次改动确为 CLI 守卫（gate marker 自生）/ 错误引导（warning）/ 文件过滤（filterDeliverableFiles）/ git 暂存（safeGit add），**无 daemon、无跨进程、无状态机、无部署启动、无 session/lease 持久化**。design 正文提及 session/lease/daemon/lifecycle 等词仅出现在坑 2 `detectChangeRisk` 判级逻辑的描述对象（§7.5 / §11 风险声明），非实际运行时。与 `6417a27` 显式覆盖通道一致，非 body 扫描。

## 设计一致性

- 探针 6 项：未实现标记扫描（无）/ 关键词覆盖（坑 2 描述对象）/ 测试覆盖（5 文件）/ 决策追踪（D-01~06 全闭环）/ API 契约对账（无改动）/ 代码删除对账（无删除，仅改/增）。
- 架构决策遵循：frontmatter risk_level 覆盖通道（遵 6417a27，否决 body 扫描）/ CLI 下沉确定性 git add / filter 四态精细化 / marker 自生不掩盖根因（仍 fail-closed）。
- 文件清单与 `git status` 一致，无未声明改动。

## 决策追踪矩阵

| 决策 ID | FR | Task | Evidence | 状态 |
|---|---|---|---|---|
| D-01@v1 | FR-01 | task-01 | src/run/gates.js:276-285 + test/stage-review-marker-auto.test.mjs | PASS |
| D-02@v1 | FR-02 | task-02 | src/stage-contract.js:448-457 + test/stage-contract.test.mjs | PASS |
| D-03@v1 | FR-03 | task-03 | src/worktree-apply.js:48-56 + test/worktree-apply-meta-exclude.test.mjs | PASS |
| D-04@v1 | FR-04 | task-04 | src/run/complete-handlers.js:137-148 + test/archive-cli-git-add.test.mjs | PASS |
| D-05@v1 | FR-05 | task-05 | .sillyspec/ROADMAP.md | PASS（deferred 入 ROADMAP） |
| D-06@v1 | — | task-02 | warning 落地非 body 扫描（§非目标） | PASS |

## 技术债务

变更文件无新增 TODO/FIXME/HACK/XXX。`src/index.js:997` 的 `TODO: task-11` 是既有遗留（与本次 index.js:787 注释同步无关）。

## 代码审查

独立审查视角（QA）：4 坑修复均为确定性局部逻辑，无并发/状态/边界隐患：
- 坑 1：marker 自生 `try/catch` 包裹 + mkdirSync recursive，IO 失败不阻断 gate（fail-closed 仍拦 review.json 缺）。
- 坑 2：warning 无副作用，仅透出指引；explicit 路径与既有 evidence gate 解耦清晰。
- 坑 3：filter 用前缀匹配 + `!==` 精确匹配 meta.json，无正则歧义；`changes/foo/docs/` 子路径测试覆盖防误放行。
- 坑 4：safeGit 内部已 try-catch，外层 try 兜底；失败不阻断归档（目录已移动 + change 已注销），step5 prompt 兜底。

## 遗留

无。坑 5（多代理 import 链污染）已按 D-05 决策 deferred 入 ROADMAP，非本变更范围。
