---
author: qinyi
created_at: 2026-08-06T09:19:19
---

# 需求规格（Requirements）— sillyspec 自工具坑确定性修复

## 角色

| 角色 | 说明 |
|---|---|
| SillySpec CLI | 4 坑修复的执行主体（gates / stage-contract / worktree-apply / verify-postcheck / complete-handlers） |
| Agent（dogfood） | 4 坑的直接受益者（不再手动补 marker / git show / git add） |

## FR-01 execute 批量完成 stage review marker 自动生成（D-01）

`src/run/gates.js:276` stage review gate，`tier=independent` 且 marker（`current-stage-review-run-id-execute-<change>`）缺失时，`generateStageReviewRunId()` + 写 marker（`stageReviewMarkerPath`）+ mkdir runtimeRoot。让 gate 失败时错误路径从 `execute-null` 变 `execute-review-<id>`（确定可执行）。marker 已存在不动（幂等）。

**验收**：execute 批量完成（detectExecuteBatchFinish 推进）撞 stage review gate 缺 review.json 时，错误信息含 `execute-review-<review-前缀 id>` 而非 `execute-null`；marker 文件落盘且内容为 `review-` 前缀格式（generateStageReviewRunId:236）。

## FR-02 detectChangeRisk 早期 warning 引导（D-02，遵 6417a27）

`src/stage-contract.js:448` 附近（detectChangeRisk 调用后、evidence gate 前），`level ∈ {integration-critical, deployment-critical}` 且 `!explicit` 时，`warnings.push` 一条**无条件** frontmatter 覆盖指引（不依赖 conclusion/evidence）。**不改 detectChangeRisk 返回值、不改判级逻辑、不改 frontmatter 优先级**（`6417a27` 已就位）。

**验收**：design.md 含 session/lease/daemon 等关键词但无 frontmatter risk_level 时，`validateVerifyResult` 返回 warnings 含"关键词判级...可在 design.md frontmatter 加 risk_level...显式覆盖"；加 frontmatter risk_level 后（explicit）不发该 warning；FAIL 结论也透出（不依赖 conclusion）。

## FR-03 worktree apply 精细化 filter 保留模块文档（D-03）

`src/worktree-apply.js:48-50` `filterDeliverableFiles` 改精细化：保留 `.sillyspec/docs/`（交付物），仅排 `.sillyspec/changes/` + `.sillyspec/.runtime/` + `.sillyspec/quicklog/` + `meta.json`。`src/verify-postcheck.js:798-799` 内联副本改 import `filterDeliverableFiles` 去双写（Grill X-010 核实无环依赖）。`src/index.js:787` 注释同步。

**验收**：worktree apply 后 `.sillyspec/docs/sillyspec/modules/*.md` 改动 apply 回主仓；`.sillyspec/changes/<wt-change>/`、`.sillyspec/.runtime/`、`.sillyspec/quicklog/` 仍排除；`test/worktree-apply-meta-exclude.test.mjs` 覆盖 docs/保留 + changes/+.runtime/+quicklog/排除四态。

## FR-04 archive CLI 下沉 git add（D-04）

`src/run/complete-handlers.js:137` archiveChangeDirectory `unregisterChange` 后，CLI 下沉 `safeGit(cwd, ['add','--','.sillyspec/changes/archive/'])` + `safeGit(cwd, ['add','--','.sillyspec/docs/'])`（POSIX 路径跨平台）。step5 prompt git add 保留作幂等兜底。

**验收**：archive 归档后 `git status` 显示 `.sillyspec/changes/archive/<destName>/` + `.sillyspec/docs/` 已暂存（不需手动补 add）；safeGit 失败不阻断归档（目录已移动 + 注销）。

## FR-05 坑5 入 ROADMAP（D-05）

`.sillyspec/ROADMAP.md` 登记坑5（多代理并行中间态 import 链污染：单点 SyntaxError 全局连坐，需 worktree-per-task 或 import 沙箱）。本 change 不修。

**验收**：ROADMAP.md 含坑5 条目（架构级延后，标注根因 + 候选解 + 来源复盘）。

## D-xxx@vN 覆盖矩阵

| 决策 | 覆盖需求 | 状态 |
|---|---|---|
| D-01@v1 | FR-01（坑1 gate marker 自生） | accepted |
| D-02@v1 | FR-02（坑2 早期 warning，遵 6417a27，Grill B-002 修正） | accepted |
| D-03@v1 | FR-03（坑3 filter 精细化） | accepted |
| D-04@v1 | FR-04（坑4 CLI 下沉 git add） | accepted |
| D-05@v1 | FR-05（坑5 入 ROADMAP） | deferred |
| D-06@v1 | §非目标（遵 6417a27 不做 body 扫描，防复读） | accepted |

无未覆盖决策，无剩余风险（design §10 R-01~R-06 均有缓解）。
