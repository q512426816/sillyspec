---
author: qinyi
created_at: 2026-09-14 23:45:00
generated_by: sillyspec-fourpiece-init
---
# 提案书（Proposal）

## 动机
acceptance 是否有测试承接是隐式判断：探针 3 只查存在性（模块目录递归），acceptance 可零测试触达凭自述过 verify；映射约定（测试=acceptance 代码化）无文档（问题三空缺）。

## 关键问题
1. verify 绿 ≠ acceptance 被测试覆盖——套件全绿与逐条承接是两回事。
2. 映射关系靠 prompt 上下文隐式传递，无明文约定无机器核对。
3. 关键词模糊匹配直接作判定会误报阻断（中文 acceptance × 英文测试名语义鸿沟）。

## 变更范围
探针 7（acceptance 自解析+双源结构归属+关键词提示）/ 矩阵骨架（四枚举槽+non-testable 逃生门+幂等补段）/ runValidators fail-closed 门禁 / testcase-design 第 7 条文档化。

## 不在范围内（显式清单）
- 不做覆盖率百分比与反向追溯；不改 quick 流程；关键词命中不参与门禁；存量归档变更不回填。

## 成功标准（可验证）
- verify 骨架机械预填矩阵，未填判定阻断 --done
- testcase-design 六条变七条且 4 处注入面同步
- 本变更自举：自身 verify 走幂等补段通道过门
