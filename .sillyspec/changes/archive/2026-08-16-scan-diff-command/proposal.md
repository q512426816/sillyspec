---
author: qinyi
created_at: 2026-08-16T21:08:00+08:00
updated_at: 2026-08-16T21:08:00+08:00
---

# 提案书（Proposal）

## 动机

scan 文档漂移检测已落地（scan-staleness 提示"该刷新了"），但落后后**怎么补**是空白——全量重扫 token 大且清空手动字段，手工对账依赖 agent 自查。缺"命令算清单 → agent 定点补"的省 token 中间路径。module-map v2（22 模块全 paths）与 docs-debt 的归模块函数已就绪，基础设施到位。

## 关键问题

1. **增量更新机制缺失**：D-7 剩余项"scan 增量刷新 CLI 化"未落地，用户需要命令形式分析漂移（而非全量重扫或手工猜）
2. **漂移判定靠人肉**：新增文件缺文档、删除文件多文档、变更文件过时——无自动化清单，agent 只能全仓自查（token 浪费）
3. **归模块无复用**：docs-debt 已有 `matchFilesToModules` 现成函数，不复用则重写漂移

## 变更范围

`sillyspec scan diff` 独立子命令：CLI 纯算漂移清单（source_commit → git diff → matchFilesToModules 归模块 → A/D/M/R 分类），终端输出 + 可选 `--report` 落盘。新 src/scan-diff.js + index.js 拦截 + command.js flag + 测试 + 文档同步。

## 不在范围内（显式清单）

- 不做自动刷新（agent 按清单人工补）
- 不做自动注入 brainstorm（独立命令优先，注入留后续）
- 不改 scan 阶段主流程定义
- 不升级 module-map schema

## 成功标准（可验证）

- `sillyspec scan diff` 在无漂移时输出"0 漂移"退出 0；有漂移时四分类清单正确
- A/M/D/R 四类映射正确（含 W6 rename 场景的 R 归变更）
- 归模块与 docs-debt 的 matchFilesToModules 结果一致（复用验证）
- `--report` 落盘到 scan 文档同目录；`--base` 非祖先 commit 被守卫拦截
- npm test 全绿（新增 scan-diff 单测）
