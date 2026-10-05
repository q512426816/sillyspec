---
author: flow-machine-draft
created_at: 2026-10-05T17:53:17.320Z
---
# 决策记录（Decisions）— 2026-10-06-litest-p1-fixes

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：① cursor 收窄漏报——若未来代码引入非 db.cursor() 形态的真游标（如 cursor.execute 独立出现），RE 不命中。权衡：该形态必先有 conn.cursor() 创建点（Python DB-API 惯例），`.cursor(` 已锚定；next_cursor 覆盖主流分页协议。漏报面远小于原误报面（本仓每个提及 cursor harness 的 patch 都误触发）。② 行号锚会随源码演进再漂移——这是 doc-ref-check 机制的设计预期（漂移即红），test:core 纳入后漂移在日常工作流被拦，不再是沉积债。 试过放弃：cursor 收窄为「赋值/字段形态 `\bcursor\b\s*[=:]`」——grep 实证本仓 docs-check.js/quicklog.js/init.js 有 8+ 处循环变量 `cursor =` 命中，误伤面仍大，放弃；归档聚合用 `--name-only`——实现期测试即暴露 rename 折叠丢源侧路径（部分提交语义下源文件不会被删），改 `--name-status`。
