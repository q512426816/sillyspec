---
author: qinyi
created_at: 2026-08-15 22:40:00
updated_at: 2026-08-15 22:40:00
change: 2026-08-15-docs-signals-o12
scale: medium
risk_level: low
---

# 设计文档：欠账信号从有到准（O-1 归属升级 + O-2 建议行号内联 + F-1 flag 白名单）

## 自审（Self-Review）

章节齐全；FR 三组（O-1/O-2/F-1）与文件清单对齐；Grill 待跑；scale=medium。

## 1. 目标

落地设计稿 design-docs-signals-integration.md 的推荐裁决：文档债信号从"有没有"升级为"欠在哪、改哪行"，并治 F-1 暴露的 flag 解析模式缺陷。

## 2. 接口设计

### 2.1 O-1：quick docSyncHint 归属升级（src/run/shared.js）

`auditQuickCompletion` 的 docSyncHint 分支：改了源码无文档时，调 `matchFilesToModules`（src/docs-debt.js 纯函数）+ `loadModuleContextIndex`（prompt.js 已有）归属：

```
docSyncHint: { touchedSource, docFiles, modules: [{ id, doc }] }  // Grill gap-1：只归属不对账（D-001），behind/never 不在 quick 场景算
```

- specBase 由调用方透传（Grill gap-5）：handleQuickStageCompletion 已有 specBase/platformOpts 上下文，auditQuickCompletion 加可选参数 specBase——平台模式 resolveSpecDir(cwd) 恒 miss specRoot 会静默丢信号；读不到 map/解析空降级现文案（modules 省略），不报错
- behind/neverCommitted 计算复用 computeDocsDebt？**否**——quick 场景调 computeDocsDebt（含 git log 对账）成本高且审计已花 git 调用；**只做归属（纯函数）**，behind 不算（quick 提示"欠在哪"足够，"欠多久"是 execute Wave 的事）——轻量边界
- printQuickAuditReview 渲染：modules 非空时追加一行"涉及模块：runtime · stages"
- import 机制（Grill gap-6）：shared.js 静态互引 prompt.js 成 ESM 环（prompt.js:24 已 import shared）——用动态 import('./prompt.js') 或直用 parseModuleMapSimple 读 map（后者，少一层依赖）

### 2.2 O-2：[docs-debt] 块内联建议行号（src/docs-debt.js）

computeDocsDebt 的 facts 渲染层（debtEntries 循环）：每欠账模块对其卡片跑 `runDocsCheck({ projectRoot: docGitRoot, docs: [docGitPath] })`——守卫条件 `docGitPath && docGitRoot` 同时成立才跑（Grill gap-3：原 ||projectRoot 回退不可达且语义错，仓外本就 null 跳过），invalid 非零内联：

```
  - runtime：源码 3 commit 未同步卡（卡停 a1b2c3d）
    卡内失效引用 2 处：`src/db.js:17`→建议 L23 · `...`
    涉及文件：src/db.js
```

- 护栏：仅 debtEntries（behind>0/never 的模块）；每模块上限 3 条（省 prompt）；runDocsCheck 异常整行降级跳过
- suggest 行号：runDocsCheck 的 invalid[].suggest（2525a5e）非空时显示

### 2.3 F-1：docs check flag 白名单（src/index.js）

docs check 分支解析循环改：

```js
const BARE_FLAGS = ['--suggest'];       // 无值 flag：剔除并置位
const PAIRED_FLAGS = ['--paths'];       // 成对 flag：现有逻辑
// 未知 --xxx → 报错 exit 2（防再次静默落入文档路径）
```

`--suggest` 置位后**门控 💡 渲染**（index.js:606-607 的候选行号行改为 flag 开关，Grill gap-2 方案 b：suggest 计算无条件但显示按 flag——不传时不打 💡 行，省输出噪声）。

## 3. 决策记录

- **D-001 O-1 只归属不对账**：quick 审计轻量边界——matchFilesToModules 纯函数零 git；behind 是 execute Wave 的职责（[docs-debt] 已做）。
- **D-002 O-2 每模块上限 3 条 + 仅欠账模块**：advisory 注入不膨胀 prompt。
- **D-003 F-1 治模式**：白名单 + 未知 flag 报错，不是再打一个补丁。
- **D-004 O-2 卡片校验锚 docGitRoot**：与 behind 对账同锚（specBase 仓根），平台模式仓外跳过内联。

## 4. 风险登记（Risk）

| 风险 | 概率 | 缓解 |
|---|---|---|
| quick 审计多一次 map 读（IO） | 低 | specBase 下单文件读，existsSync 守卫 |
| O-2 每模块一次 runDocsCheck（卡片内引用数 × 候选解析） | 低 | 仅欠账模块 + 单文档 + 失败降级 |
| F-1 未知 flag 报错误伤现有用法（--json 全局已吞不达分支） | 低 | 白名单含 --json 防御位；npm test 全量回归 |

## 5. 文件变更清单

| 操作 | 文件 | 说明 |
|---|---|---|
| 修改 | src/run/shared.js | docSyncHint 归属（matchFilesToModules + parseModuleMapSimple 直读） |
| 修改 | src/run/complete-handlers.js | auditQuickCompletion 调用点透传 specBase（plan 审查 P1） |
| 修改 | src/run/quick-audit.js | printQuickAuditReview 渲染 modules 行 |
| 修改 | src/docs-debt.js | facts 渲染内联卡片失效引用 + 建议行号 |
| 修改 | src/index.js | docs check 分支 flag 白名单 + --suggest 接线 |
| 修改 | test/audit-quick-completion.test.mjs | D-8 场景升级断言（modules 字段） |
| 修改 | test/docs-debt.test.mjs | O-2 内联场景 |
| 修改 | test/docs-check-cli.test.mjs（新增） | F-1 flag 场景（CLI 子进程实测：--suggest 识别/未知 flag exit 2/💡 门控） |
| 修改 | docs/sillyspec/platform-interface-map.md | 本变更 +24 行连带漂移修正（docs check 自检，Reverse Sync） |
| 修改 | docs/sillyspec/file-lifecycle.md | quick/execute 行为说明同步 |

## 6. 生命周期契约（lifecycle contract）

| 文件 | 生命周期事件 |
|---|---|
| docSyncHint 结构 | 字段追加（modules 可选）——旧读者（printQuickAuditReview）同变更内升级，无外部消费者 |
| docs check CLI | flag 白名单化——未知 flag 从静默误判变显式 exit 2（行为收紧） |

## 7. 验收标准

- FR-001 quick 改源码无文档 + map 存在 → hint 含 modules 模块行（实测/单测）
- FR-002 map 缺失/解析空 → hint 降级现文案（零回归）
- FR-003 [docs-debt] fixture：欠账模块卡内含失效引用 → 块内出现"卡内失效引用…建议 Lxx"
- FR-004 `docs check --suggest` 实测生效（flag 被识别，建议行号渲染）
- FR-005 未知 flag `--foo` → exit 2 报错
- FR-006 npm test 全量绿 + lint + docs check 全仓绿
