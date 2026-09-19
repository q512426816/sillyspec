---
author: zcode-redline-framework
created_at: 2026-09-19 16:16:50
generated_by: sillyspec-fourpiece-init
change: 2026-09-20-redline-machine-check
---
# 提案书（Proposal）

## 动机
语义级设计红线活在散文里无机器可查形态——对撞实验实证三层评审+352 测试拦不住两处红线失分，靠事后人工深读才发现。上限需要机器的眼睛。

## 关键问题
1. 红线散在历史 design/knowledge，verify 探针看不见。
2. 无断言载体：语义约束无法进任何门禁。
3. 直接硬门在误报率未知时有拦真变更风险。

## 变更范围
- src/redlines.js（清单解析+glob scope+评估器纯函数）
- verify-probes 探针 11 接线（advisory、fail-open）
- test/redlines.test.mjs + 模块登记

## 不在范围内（显式清单）
- AST/语义级分析；散文自动提炼
- PASS 封顶硬门（先攒误报数据）
- verify-facts schema 变更；quick/brainstorm 期接线
- 种子清单内容（另案落消费者仓）

## 成功标准（可验证）
- 夹具仓四态（violation/clean/absent/broken-yaml）行为符合 FR-01~03
- 本仓（无清单）verify 探针 11「不适用」零打扰
- 全量测试绿；探针 1-10 渲染序不变
