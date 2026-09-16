---
author: qinyi
created_at: 2026-09-16 20:15:00
---
# 提案书（Proposal）

## 动机
2026-09-15 wp EHS 二次独立复核实证：同实体守卫不一致越权（doSubmit 无操作人校验而 delete/withdraw/handle 有）——权限守卫面是探针 1-8 的共同盲区，全靠人工走查且恰是走查盲区。

## 关键问题
同实体变更方法组内「有守卫与无守卫并存」的形态机器不可见；编码式校验（EHS 栈）注解审计不覆盖。

## 变更范围
- src/verify-probes.js：探针9 实现（三导出+渲染+metrics）
- src/verify-postcheck.js：一致性抽查纳入 probe9 维度（WARNING 级）
- NEW:test/probe9-guard-consistency.test.mjs：五用例

## 不在范围内（显式清单）
- 不做硬门；不做语义正确性审计；不跨文件聚类；不覆盖非 Java；不改探针 1-8

## 成功标准（可验证）
- EHS doSubmit 缩小版 fixture 命中（unguarded=submit + guarded 双方法带信号类别）
- 全守卫零告警 / 单方法组 skipped / 注解式命中 / 非 Java 与文件级豁免边界齐
- npm test 全量 0 失败 + lint 过
