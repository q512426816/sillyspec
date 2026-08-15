---
author: qinyi
created_at: 2026-08-15 23:05:00
change: 2026-08-15-docs-signals-o12
---

# 需求（Requirements）

- FR-001 quick 改源码无文档 + map 存在 → docSyncHint.modules 非空（含 id/doc）
- FR-002 map 缺失/解析空 → hint 降级现文案零回归
- FR-003 [docs-debt] fixture 欠账模块卡内失效引用 → 块内"卡内失效引用…建议 Lxx"
- FR-004 docs check --suggest 识别 + 💡 行按 flag 门控
- FR-005 未知 flag → exit 2
- FR-006 npm test 全量绿 + lint + docs check 全仓绿

## 决策覆盖

D-001@v1 只归属 → FR-001/002；D-002@v1 上限3条 → FR-003；D-003@v1 白名单 → FR-004/005；D-004@v1 同锚 → FR-003
