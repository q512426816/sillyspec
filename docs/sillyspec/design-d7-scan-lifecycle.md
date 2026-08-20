---
author: qinyi
created_at: 2026-08-15 15:55:00
updated_at: 2026-08-16T22:40:00+08:00
status: design-draft（供裁决，未实现）
---

> **落地记录（2026-08-16，change 2026-08-16-scan-diff-command）**：本设计稿方案 A（漂移检测信号）已先行落地为 `src/scan-staleness.js`（2026-08-15，ql-20260815-013，判定语义后经 ql-20260816-009-fb44 修正）；"剩余项：scan 增量刷新 CLI 化（算漂移文件清单注入）"已落地为 `sillyspec scan diff` 命令（`src/scan-diff.js`，git diff → module-map v2 paths 归模块 → A/D/M/R 四分类清单，agent 按清单定点补，`--report` 可落盘 diff-report.md）。方案 C（双轨合并）仍暂不做。

# D-7 设计稿：scan 文档生命周期——从"一次性生成"到"漂移感知"

> 来源：doc-consistency-debt.md D-7。用户裁决：先出设计再决定是否实现。
> 本文不改代码，只给出方案空间、成本与推荐，供用户裁决。

## 一、问题重述

```
scan（一次性）──▶ scan/ARCHITECTURE.md 等 7 文档 ──▶ 被 brainstorm 读（作输入）
                        │                                    │
                        │  代码持续演进（434 commit / 2 个月）   │
                        ▼                                    ▼
                  文档冻结在 06-24                      读到的是过期架构
                        │
                        └── 唯一护栏 worktree-guard 只防「scan 覆盖手工编辑」
                            不防「手工改动使 scan 过期」——方向反了
```

sillyhub 实证：前端 72% 源文件无文档登记、`_module-map.yaml` 停在 07-27、scan 文档冻结 06-24，期间 400+ commit。brainstorm 读过期文档 → design 基于错误假设 → 错误层层放大。

**双轨问题**：scan 产物（`scan/*.md` + `_module-map.yaml` 结构化索引）与手工模块卡（`modules/*.md`）是两套真相源——scan 只在重跑时更新 map，archive 只更新卡片和 map 条目、不动 scan 文档。两者各有读者（scan→brainstorm/plan 上下文，卡片→execute 模块定位），合并成本高且各有价值。

## 二、方案空间

### 方案 A：漂移检测信号（推荐——最小可行）

**不做自动刷新，只做过期检测 + 显性化信号。**

机制：scan 文档 frontmatter 已有 `source_commit`（覆盖保护 hook 在用，`worktree-guard.js:200`）。新增一个轻量探针（doctor 或 scan-profile preflight 内），比对：

```
scan 文档 source_commit  vs  当前 HEAD（或 scan 文档涉及路径的最新 commit）
├── 一致/落后 < N commit        → 新鲜，不打扰
├── 落后 ≥ N commit 或 M 天      → ⚠️ warn「scan 文档落后 X commit，建议 sillyspec run scan --standard」
└── 涉及路径有 rename/删除       → ⚠️ warn「结构可能漂移」
```

落点（两选一，可都做）：
1. **brainstorm step1（加载项目上下文）**：读到 scan 文档时 CLI 注入一行 staleness 提示——agent 在生成 design 前知道"我读的架构描述可能过期"，至少不再盲信。
2. **doctor**：全量健康检查项。

- 规模：小（1-2 文件，纯读 git + frontmatter 比对）
- 风险：低（纯 advisory，不阻断任何流程）
- 收益上限：把"静默过期"变成"显性过期"，agent 可选择先跑 `scan --quick/standard` 刷新或带风险继续

### 方案 B：archive 钩子提示增量刷新（prompt 级）

archive 的 sync-module-docs step 已在更新 `_module-map.yaml`；在同一步 prompt 里加一条：**若本变更触及了 scan 文档描述的结构（新增/删除目录、入口、模块），提示顺带刷新对应 scan 文档段落**（不是整份重生成——覆盖保护 hook 防的就是整份覆盖，段落级手工更新不冲突）。

- 规模：小（改 archive.js prompt 一处 + _extract 重跑）
- 风险：低（prompt 级 = persuasion，但配合方案 A 的信号有闭环）
- 局限：依赖 agent 自觉，属于 D-1 修掉的那类"劝说"——单独做价值有限，作为 A 的补充

### 方案 C：双轨合并（大工程，暂不推荐）

把 scan 文档与模块卡统一为"模块卡为主、scan 文档只留 ARCHITECTURE/CONVENTIONS 两份全局文档"。模块级事实（paths/entrypoints/契约）全部收敛到 `_module-map.yaml` + 卡片。

- 规模：大（动 scan 产物契约、brainstorm/plan 读文档路径、7 份文档模板、存量项目迁移）
- 收益：单一真相源，根治双轨
- 风险：sillyhub 等存量项目的 scan 文档格式全变，迁移成本高；且 scan 7 文档各有读者，砍掉有信息损失
- 裁决建议：**暂不做**，等 A 落地后观察漂移信号频率再评估

### 方案 D：自动定期重扫（不推荐）

cron/timer 式自动 `scan --quick`。与多 agent 并发冲突（重扫期间文档半新半旧）、与覆盖保护 hook 冲突（手工编辑会被 force 覆盖或反复弹确认）、定位上 SillySpec 是流程控制器不是守护进程。**排除。**

## 三、推荐组合与成本

| 组合 | 内容 | 规模 | 走哪条流程 |
|---|---|---|---|
| **推荐：A + B** | 漂移检测信号（brainstorm 注入 + doctor 检查）+ archive 段落级刷新提示 | 小（2-3 文件） | 一个 quick 或 mini 完整流程 |
| 仅 A | 漂移检测 | 小（1-2 文件） | quick |
| C | 双轨合并 | 大 | 完整流程（brainstorm→…→archive），需单独排期 |

## 四、方案 A 细节（若裁决通过）

- 检测口径：`git rev-list --count <source_commit>..HEAD -- <scan 文档登记的模块路径>`；map 里登记的是 glob 时退化为全仓 count（宁可误报不漏报，advisory 性质允许噪声）
- 阈值：落后 ≥ 50 commit 或 ≥ 14 天 → warn（可经 local.yaml 配置覆盖）
- 注入点：brainstorm step1 prompt 渲染时 CLI 追加一行（类似现有模块上下文注入 `src/run/prompt.js:30 loadModuleContextIndex` 先例）
- 文档同步：file-lifecycle.md scan/brainstorm 行 + SKILL（若涉及）
- 测试：source_commit 缺失（老文档）→ 跳过不误报；阈值内 → 静默；超阈值 → warn 文案

## 五、待裁决问题

1. 方案组合选哪个（推荐 A+B）？
2. 方案 A 的阈值默认值（50 commit / 14 天）是否合适？
3. 落地排期：本 session 顺手做（若选 A/B），还是排进下一个完整流程变更？
