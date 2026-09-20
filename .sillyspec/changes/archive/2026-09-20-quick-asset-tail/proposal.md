---
author: zcode-quick-asset-tail
created_at: 2026-09-20 19:52:00
---
# 提案书（Proposal）

## 动机
薄通道速度已追平 OpenSpec 但零资产（autocompact 实证：四件套僵尸、FR/决策永不进 knowledge）；纯 quick 482 条根因知识死库存。资产义务不随仪式定价。

## 关键问题
1. 薄通道无资产产出点；独立收口命令靠自觉=僵尸再现。
2. 钩子#1 只记遥测，FR 腐烂不可见。
3. quick 流水账无检索面。

## 变更范围
quick --done 收尾段三处接线 + fr-index 扩展（markFrNeedsReview/digest 透传/翻链清理）+ lite 归档。

## 不在范围内（显式清单）
- L3 声明义务；纯 quick FR 产出；module-impact/ROADMAP 进薄通道；多 quick 幂等升级

## 成功标准（可验证）
- 薄通道夹具：门禁过后 FR 入索引+决策入 knowledge+目录进 archive/+DB 注销
- needs_review 写/读/注入/承接清除四态测试绿
- 纯 quick 三机械件触发/跳过/fail-open 测试绿；全量 npm test 绿
