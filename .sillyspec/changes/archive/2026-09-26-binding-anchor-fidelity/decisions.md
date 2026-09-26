---
author: flow-machine-draft
created_at: 2026-09-26T08:11:38.133Z
---
# 决策记录（Decisions）— 2026-09-26-binding-anchor-fidelity

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：- 最大风险＝锚点后缀漏进文件面消费（残差实测会拿不存在路径去跑、watcher 归属匹配失联、rot 覆盖误判 skip）——已 grep 全量枚举 `.tests` 消费点逐一适配，新测试对每个消费点各钉一条回归。 - 次风险＝裸名解析误绑（basename 在仓内多处出现）——仅唯一命中才解析，零命中/多命中原样保留，dangling 校验自然暴露。 - 死路：用例锚做独立字段（cases:）——test-trace schema、FR 机器子块、md 解析三处格式连动且存量数据双形态并存，复杂度不成比例，弃。 - 死路：回写历史归档 test-trace 补锚——归档是冻结审计面不回写；新变更提取即生效，旧数据维持文件级（诚实），弃。
