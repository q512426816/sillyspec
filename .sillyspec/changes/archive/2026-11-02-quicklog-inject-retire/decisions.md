---
author: flow-machine-draft
created_at: 2026-11-02T13:34:57.816Z
---
# 决策记录（Decisions）— 2026-11-02-quicklog-inject-retire

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：**风险**：摘除后注入测试对 quicklog 段的断言（若有）需同步摘除——grep 确认。 **放弃的方案**：全删 quicklog 子系统（quicklog.js + 目录 + test-bindings）——test-binding 强边消失影响图谱、11+ 测试文件连锁、且 QUICKLOG 记录是独立子系统非检索面，需用户另行决策。
