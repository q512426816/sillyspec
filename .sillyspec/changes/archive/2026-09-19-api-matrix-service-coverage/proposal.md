---
author: qinyi
created_at: 2026-09-18 21:56:19
generated_by: sillyspec-fourpiece-init
---
# 提案书（Proposal）

## 动机
verify 阶段接口验证覆盖矩阵门禁的放行硬等式「covered 分子 == 有效分母」对「端点行为由 service 层测试锁定、无端点级用例」的端点偏严：agent 被迫虚标 covered 才能过门（用户实证：dispatch-now 端点，facts 门禁六轮迭代——门禁在逼人说谎）。现有逃逸形态语义均不适配：non-testable 是「不可测」、partial/uncovered 是「未完成待移交」，而 service 承接是「已完成、覆盖层不同」。

## 关键问题
1. 诚实性漏洞：真实 service 层承接的端点只能虚标 covered 放行，矩阵统计失去「端点级 vs 间接」区分度（用户反馈原话「只能标 covered 才放行」）。
2. 现有逃生门语义错配：partial + 移交联动会触发 PASS 封顶降级——把「已测完」错误表达成「未完成」。
3. 门禁六轮返工的摩擦成本：每轮都在真实修文档，但缺一个正当的表达形态。

## 变更范围
接口矩阵判定列引入第五形态 `covered-service`（详见 design.md 三 Wave）：白名单/记账分子/测试锚点硬约束/advisory 计数/八面文案同源（API 骨架/probe7 骨架×2/verify 指引/模板/probe7 门文案×2/anchor-check/--init 提示）/五组测试。

## 不在范围内（显式清单）
- 不放宽既有四枚举的任何校验（covered 五形态锚点/partial 移交联动/non-testable 理由）
- 不动 facts schema、progress.db、既有导出函数签名
- 不做 service 承接占比上限（advisory 观察期，D-001 故障面）
- 不动回执门禁/集成证据门/写端点权限 advisory
- 不涉及 worktree doctor / editable install（已于 2026-08-25 闭环）

## 成功标准（可验证）
- FR-01/FR-02 验收通过（见 requirements.md）。
- 存量四枚举文档校验行为逐字不变（向后兼容回归组通过）。
- 全量测试套件通过（npm test）。
