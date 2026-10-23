---
author: flow-machine-draft
created_at: 2026-10-23T13:44:46.909Z
---
# 决策记录（Decisions）— 2026-10-23-push-review-debt

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：- 最大风险：签名检测依赖 `git log %G?`，在无 GPG 环境对所有提交返回 N——告警天然静默，不会误报（测试锚钉「全无签名零误报」）。 - 死路 1：给签名告警造真实 GPG 签名提交做集成测试——临时仓拉起 GPG 环境在 Windows CI 上脆且慢，放弃；改用纯函数解析锚 + 真仓「零误报」负断言。 - 死路 2：pushBranch 用捕获 pipe 再转发 stderr——hook 输出变成事后整段打印，丢失实时性；inherit 才满足「报错一次给全」，--json 场景保留 pipe。 - 死路 3：编辑已归档的 2026-10-23-push-squash 冻结件来改绑定短语——sha256 锚定件不可改，绑定对齐在本变更 requirements 里以真实测试名重写。
