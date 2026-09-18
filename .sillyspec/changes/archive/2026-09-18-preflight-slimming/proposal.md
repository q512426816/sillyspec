---
author: qinyi
created_at: 2026-09-18 12:38:55
generated_by: sillyspec-fourpiece-init
---
# 提案书（Proposal）

## 动机
基线锚实证主会话双因子（轮次 2.2×/上下文 1.8×）：9 次摩擦的重试循环与每步重注的上下文雪球。批 2 对两因子各下一刀，评审三约束为验收红线。

## 关键问题
①摩擦全走「提交→打回」后知后觉路径（design-file-list 前移先例证明可省整轮）；②模块/scan 事实每步全文重注；③可继承的 wait 确认轮仍占两次 CLI 往返；④中间验证习惯性全量 npm test。

## 变更范围
门禁前置（{PREFLIGHT_FAILURES} 只读快跑+条数帽）+注入瘦身（阶段首步全量后续摘要+.runtime 账本）+wait 继承盖章（--inherit-from 机械校验 fail-closed）+测选路引导（定向优先文案，不改默认）。

## 不在范围内（显式清单）
- 不改 test_strategy 默认值（module-zero-hit 静默无测试风险）
- 不做步骤合并（状态机契约押后）
- 不触碰已上线定价面
- 不动 L1 机械门存在性

## 成功标准（可验证）
- - 摩擦重试轮次下降且 L1 拦截数守恒（ledger 对账）
- 单步 prompt 中位长度不反弹（上下文均值 249k→≤210k 方向）
- inherit-from 双态（存在盖章/不存在 exit 2）直测
- 全量测试绿+镜像同步
