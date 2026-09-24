---
author: qinyi
created_at: 2026-08-16T21:13:00+08:00
updated_at: 2026-08-16T21:13:00+08:00
---

# 模块影响分析（Module Impact）— scan diff 增量刷新命令

> plan 首版生成（以 design 文件清单 + plan 任务为输入）。execute/verify 按实际变更更新，archive 终审。

## 影响矩阵

| 模块 | 影响类型 | 涉及文件 | 说明 |
|---|---|---|---|
| runtime（scan 命令面） | 新增/修改 | src/scan-diff.js（新增）、src/run/command.js（scan --diff flag） | scan diff 漂移清单计算命令 + scan 参数扩展 |
| cli-entry | 修改 | src/index.js | case 'scan' 子命令拦截（diff 分支，跳过 pull） |
| 测试体系 | 新增 | test/scan-diff.test.mjs | 四分类/归模块/rename/守卫/CLI 集成 |
| 文档体系 | 修改 | docs/prompt/scan.md、file-lifecycle.md、design-d7-scan-lifecycle.md | scan diff 子命令说明 + D-7 剩余项落地标注 |

## unmapped

- 无源码文件不在模块（scan-diff.js 归 runtime 卡需补录——task-01 实现后更新 module-map paths）

## 连带验证

- npm test：新增 scan-diff 单测；既有 210 无回归
- docs check：docs/prompt/scan.md 改动注意 file:line 引用有效性
- D-7 落地标注：design-d7-scan-lifecycle.md 的"增量刷新 CLI 化"剩余项 → 已落地
