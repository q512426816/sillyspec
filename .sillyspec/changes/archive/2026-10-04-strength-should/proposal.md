---
author: flow-machine-draft
created_at: 2026-10-04T15:57:42.471Z
---
# 提案书（Proposal）— 2026-10-04-strength-should

## 动机

任务原话转写：动机：thin-docs-v2 独立评审留档两个非阻断发现——P2：FR_STRENGTH_RE 强度词表缺 SHOULD 与 SHOULD NOT（模板指引列 SHOULD 为合法强度词，但只写 SHOULD 唯一强度句会被 done 误拒收，fail-closed 方向）；P3：flow approve 对不存在变更 exit 2 的行为已实现但零测试断言。两者随本微修清偿。
成功标准：
- FR 行为句强度词判定词表纳入 SHOULD（含 SHOULD NOT 形态）——只写 SHOULD 唯一强度句不再误拒收并有回归锁定
- flow approve 对不存在变更 exit 2 的行为补测试断言锁定
- 既有测试回归绿且 lint 零死导出

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. FR 行为句强度词判定词表纳入 SHOULD（含 SHOULD NOT 形态）——只写 SHOULD 唯一强度句不再误拒收并有回归锁定
2. flow approve 对不存在变更 exit 2 的行为补测试断言锁定
3. 既有测试回归绿且 lint 零死导出

## 成功标准（可验证）

1. FR 行为句强度词判定词表纳入 SHOULD（含 SHOULD NOT 形态）——只写 SHOULD 唯一强度句不再误拒收并有回归锁定
2. flow approve 对不存在变更 exit 2 的行为补测试断言锁定
3. 既有测试回归绿且 lint 零死导出
