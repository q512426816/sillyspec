---
author: qinyi
created_at: 2026-08-15 23:05:00
change: 2026-08-15-docs-signals-o12
---

# 提案（Proposal）

## 问题

四源文档债信号互不引用：quick docSyncHint 只说"改了 N 文件没动文档"不说欠哪个模块；[docs-debt] 块只说"卡落后"不说改哪行；docs check --suggest flag 未被 CLI 识别（F-1，功能主路径不可用）。

## 方案

O-1 quick hint 复用 matchFilesToModules 归属（纯函数）；O-2 [docs-debt] 渲染层内联卡片失效引用 + 建议行号（runDocsCheck 单文档）；F-1 flag 白名单 + 未知 flag exit 2 + 💡 门控。

## 不在范围内

O-3 信号总线 / O-4 verify 汇总（设计稿已裁决暂缓/后置）。
