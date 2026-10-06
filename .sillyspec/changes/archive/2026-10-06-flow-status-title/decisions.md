---
author: flow-machine-draft
created_at: 2026-10-06T11:14:39.613Z
---
# 决策记录（Decisions）— 2026-10-06-flow-status-title

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：JSON 消费方对新增字段的兼容性——单对象加字段对 JSON.parse 消费方是非破坏性变更，风险低；人类渲染变更可能影响既有文本匹配测试（test/flow-status-json.test.mjs ③ 人类路径回归已覆盖关键行，本变更加 fixture 断言钉住新旧两态）。放弃的方案：① 在 flow-state.yaml 里冗余存 title（写两处状态有漂移风险，DB 已是权威源）；② status 输出全量改由 DB 驱动（超出本变更范围，且 flow-state/盘面事实才是 status 主源）。
