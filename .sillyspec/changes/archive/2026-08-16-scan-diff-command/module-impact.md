---
author: qinyi
created_at: 2026-08-16T21:13:00+08:00
updated_at: 2026-08-16T21:13:00+08:00
---

# 模块影响分析（Module Impact）— scan diff 增量刷新命令

> plan 首版 + execute 实际结果（2026-08-16 实现完成）。

## 实际变更结果（execute 后更新）

| 模块 | 影响类型 | 涉及文件 | 说明 |
|---|---|---|---|
| runtime（scan 命令面） | 新增/修改 | src/scan-diff.js（新增）、src/run/command.js（--diff flag） | computeScanDiff 纯函数（四分类/归模块/isAncestor 守卫）+ runScanDiff IO；command.js scan 参数表补 --diff |
| cli-entry | 修改 | src/index.js | case 'scan' 拦截 diff 子命令（跳过 triggerPullActiveChange） |
| 测试体系 | 新增 | test/scan-diff.test.mjs | 12 用例（四分类/rename/unmapped/守卫/无漂移/--report/CLI/mock） |
| 文档体系 | 修改 | docs/prompt/scan.md（未动，scan diff 非阶段步骤）、file-lifecycle.md、design-d7-scan-lifecycle.md（D-7 落地标注）、.claude/skills/sillyspec-scan/SKILL.md（--diff 说明） | scan diff 命令说明 + D-7 剩余项落地 |

## unmapped

- 无源码文件不在模块（scan-diff.js 已实现，module-map 补录归 runtime 卡——见下）

## module-map paths 补录

`_module-map.yaml` runtime 模块 paths 追加 `src/scan-diff.js`（scan diff 命令归属 runtime 命令面）。

## 连带验证（实测）

- test/scan-diff.test.mjs 12/12 绿（worktree，含 mock 注入）
- QA 独立审查 PASS（10 项核对 + 4 复用接口签名核实）
- npm test 全量 + docs check 主仓对账在 apply 后执行（verify 阶段）
