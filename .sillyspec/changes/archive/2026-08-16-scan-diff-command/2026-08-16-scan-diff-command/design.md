---
author: qinyi
created_at: 2026-08-16T21:04:43+08:00
updated_at: 2026-08-16T21:04:43+08:00
scale: large
risk_level: unit-sufficient
status: draft
---

# Design：scan diff 增量刷新命令（2026-08-16-scan-diff-command）

## 背景与动机

scan 文档漂移检测（scan-staleness，D-7 方案 A）已落地：CLI 提示"文档落后 N commit 该刷新了"。但落后后**怎么补**仍是空白——现状只有全量重扫（`scan --force-rescan`，token 大 + 覆盖保护冲突 + rebuild 清空手动字段）和手工对账（依赖 agent 自查）。缺一个"命令算清单 → agent 定点补"的省 token 中间路径。

基础设施已就绪（2026-08-16-scan-docs-reconcile 对账成果）：
- `_module-map.yaml` 升 schema v2，22 模块全 `paths`（63 条）——漂移文件可精确归模块
- `scan-staleness.js` 导出 `parseSourceCommit`——解析 scan 文档基线
- `docs-debt.js` 导出 `matchFilesToModules`——**现成可复用的归模块纯函数**（含二级卡片内容 + 裸名兜底，docs-debt 已实测），scan diff 直接 import 而非重写

## 设计目标

1. `sillyspec scan diff` 独立子命令：CLI 纯算漂移清单（零 token），agent 跑后按清单定点补
2. 四分类输出：新增（缺文档）/ 删除（多文档）/ 变更+重命名（过时风险）/ 未归模块（unmapped 显式标注），归模块
3. 复用现有机制（safeGit / matchFilesToModules / parseSourceCommit），零新依赖
4. 可选 `--report` 落盘 diff-report.md，供跨 session/后续阶段引用

## 非目标（Non-Goals）

- 不做自动刷新（agent 按清单人工补，不自动改文档）
- 不做自动注入 brainstorm（用户已裁决独立命令优先，注入留后续）
- 不改 scan 阶段主流程（scan diff 是并行旁路，不动 `scan --standard/--deep` 定义）
- 不升级 module-map schema（v2 已够用）

## 方案决策

| 决策 | 选项 | 裁决 | 依据 |
|---|---|---|---|
| 消费方式 | 独立命令 / 自动注入 / 命令+后续注入 | **独立命令**（用户 step3 裁决） | 纯工具零流程侵入，最贴合"命令分析→agent 定点补" |
| 实现方案 | A 最小命令 / B 命令+指引 / C 命令+注入 | **A 最小命令**（用户 step4 裁决） | 复用 docs-debt 同族模式，B 指引可作轻量扩展、C 留后续 |
| 接线入口 | index.js case 'scan' 拦截 / command.js 裸 token | **index.js 拦截（D-001@v1）** | command.js 对裸 token 静默吞（Grill C1 实证），index.js 有 worktree/dispatch 先例 |
| 归模块 | 重写前缀匹配 / 复用 matchFilesToModules | **复用（D-002@v1）** | docs-debt 已导出含裸名兜底的现成函数（Grill D2） |
| rename 处理 | 忽略 / 归变更 | **R/C 归变更（D-003@v1）** | W6 有真实 rename，忽略会漏报（Grill D1） |

## 总体方案

### 命令形态与接线（定死，消除二义）
`sillyspec scan diff [--report] [--base <commit>] [--full]`
- **接线唯一入口 = `src/index.js` `case 'scan'`**：`filteredArgs[1] === 'diff'` 时拦截转发（先例：worktree/dispatch/platform 子命令），**不依赖 command.js 裸 token**（runCommand 对裸 token 静默吞，不能走那条路）
- 默认 base = scan 文档 `source_commit`（platform 快照，读 `.sillyspec/docs/<project>/scan/*.md` frontmatter）；无 source_commit → 提示绿地/旧版并退出
- `--base <commit>` 显式覆盖，**必须过 isAncestor 守卫**（仿 computeScanStaleness:69）：无效 commit → 报错；非祖先 commit → 明确警告（防静默全树 diff 误导）
- `--report` 落盘到 `specBase/docs/<project>/scan/scan-diff-report.md`（与 scan 文档同目录，非 cwd——跨 session 可追）
- `--full` 展开全部条目（缺省按模块聚合计数 + 每模块最多列 5 条，防 400+ commit 刷屏）

### 核心流程（CLI 纯计算，diff 分支跳过 triggerPullActiveChange——纯只读不触发网络）
1. 定位 scan 文档目录 → 读任一份 frontmatter 的 `source_commit`（`parseSourceCommit`）
2. `safeGit(cwd, ['diff', '--name-status', '--find-renames', base..HEAD])` 只算路径，`--find-renames` 使 R/C 归入改名检测
3. **状态分类**：`A` → 缺文档（建议补卡）；`D` → 多文档（建议回收）；`M/R/C` → 变更/重命名（建议核对刷段落）；未匹配模块 → unmapped 显式标注（不臆断归属）
4. 归模块：直接 `import { matchFilesToModules } from './docs-debt.js'`（现成，含裸名兜底），`parseModuleMapSimple` 只负责读 map
5. **默认扫描范围 = map paths 覆盖集**（含 packages/dashboard/、bin/，非 src/-only——否则 dashboard/bin 模块漂移被静默丢弃）
6. 汇总统计输出：

```
scan diff: <base>..HEAD（N commit / D 天）
▶ 新增 12 文件（缺文档 → 建议补卡）:  src/xxx.js → [stages]
▶ 删除 3 文件（多文档 → 建议回收）:  src/stages/propose.js → [已移除]
▶ 变更/重命名 25 文件（待核对 → 建议刷段落）: src/run.js → [runtime]
▶ 未归模块 2 文件（需人工确认归属）:  tools/gen.mjs
```

7. 无漂移 → `scan 文档与源码一致（0 漂移）`，退出码 0

### 模块结构
- 新 `src/scan-diff.js`：
  - `computeScanDiff({ projectRoot, specBase, projectName, base })` 纯函数：读 map、git diff、归模块（matchFilesToModules）、分类 → 结构化结果（可单测，git 依赖注入降级 mock）
  - `runScanDiff(opts)` IO 面：定位 specDir、落盘 report、终端渲染
- `src/index.js` `case 'scan'` 子命令拦截（`filteredArgs[1]==='diff'`）
- `src/run/command.js`：scan 参数表补 `--diff` 布尔 flag（供 `sillyspec run scan --diff` 等价路径），`diff` 裸 token 拦截仍在 index.js

## 文件变更清单

| 文件 | 动作 | 说明 |
|---|---|---|
| src/scan-diff.js | 新增 | computeScanDiff 纯函数 + runScanDiff IO |
| src/index.js | 修改 | case 'scan' 子命令拦截（diff 分支，跳过 pull） |
| src/run/command.js | 修改 | scan 参数表补 --diff flag |
| test/scan-diff.test.mjs | 新增 | 纯函数单测（四分类/归模块/rename/unmapped/无漂移）+ CLI 集成 |

（skill/文档同步见下）

## 兼容策略

- 复用 `parseSourceCommit`（scan-staleness.js）、`matchFilesToModules` + `parseModuleMapSimple`（docs-debt.js / modules.js）、`safeGit`（git-helper.js）——零新依赖
- 纯只读命令：不写进度/产物（`--report` 落盘 scan-diff-report.md 是显式可选项）
- Windows 兼容：safeGit 数组参数不经 shell、路径 POSIX 归一显示
- 多 agent 并发：只读 git + 读 map，无写冲突

## 文档同步

- `docs/prompt/scan.md`（scan 阶段提示词补 scan diff 子命令说明）+ `docs/sillyspec/file-lifecycle.md`（scan 行）+ `docs/sillyspec/design-d7-scan-lifecycle.md`（D-7 剩余项"增量刷新 CLI 化"→ 已落地标注）
- `.claude/skills/`（scan skill 命令清单）

## 风险登记

| 风险 | 等级 | 缓解 |
|---|---|---|
| 归模块误判（双归属 first-match-wins） | 低 | matchFilesToModules 现成兜底；unmapped 显式标注不臆断 |
| base 解析失败（无 source_commit） | 低 | 降级提示"绿地/旧版，用 --base 显式指定" |
| diff 大规模（首跑 400+ commit）或 git 超时 | 中 | safeGit timeout 处理（降级 GIT_TIMEOUT_MS 模式，仿 docs-debt）；缺省聚合计数 + --full 展开防刷屏 |
| 无效/非祖先 base | 低 | isAncestor 守卫（仿 computeScanStaleness:69） |
| 与 scan 主流程互扰 | 低 | 独立旁路，index.js 拦截，diff 分支跳过 triggerPullActiveChange |

## 自审（Self-Review）

- ✅ 需求与裁决一致（独立命令/方案 A/命令设计确认）
- ✅ 复用接口签名实测（parseSourceCommit/matchFilesToModules/parseModuleMapSimple/safeGit 均在源码确认导出）
- ✅ Grill P2 全吸收：接线定死 index.js 拦截、R/C rename 归变更、复用 matchFilesToModules、默认范围=map paths、跳过 pull、report 路径指定、--full 入形态、isAncestor 守卫、timeout 处理
- ✅ 纯只读 + 纯函数可单测，风险低
- ✅ 生命周期契约：不涉及生命周期契约（纯只读命令，无状态流转/事件/契约变更）
