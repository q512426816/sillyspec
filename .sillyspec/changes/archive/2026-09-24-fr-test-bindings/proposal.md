---
author: qinyi
created_at: 2026-09-24 12:40:00
---
# 提案书（Proposal）— 2026-09-24-fr-test-bindings

## 动机
verify 探针 7 已机械产出「acceptance ↔ 测试文件」候选矩阵，但结果只落在不进归档的
verify-result.md——**是报告，不是注册表**：答不了「谁要求这条测试」。fr-test-binding
方案（docs/sillyspec/fr-test-binding-proposal-2026-09-24.md，六轮审阅收敛，A 立项）裁定
把这份已有计算**持久化并归档提升**为可查询面。本变更是其立项实现的**写侧主体**
（前置 test-ledger P0 已落地：commit 5d102aee）。

## 关键问题
- **候选从哪来**：探针 7 机械归属（requirement_ids join）落 candidate 行；agent 逐格
  复核后的判定列驱动晋升——预填≠证明（discovery/confirmed_by 分层）。
- **真源放哪**：提升后的绑定挂 FR 活库条目**机器字段**（fr-index 蒸馏链单一解析扩展）；
  ql 同构（quicklog 侧机器面）。禁 CAP 第四锚空间、禁 knowledge/test-trace/ 第二目录。
- **谁能修**：`sillyspec tests --bind/--unbind` 是唯一合法修理工——悬空硬错（另案）
  没有它就是死锁；修理工自身不得制造悬空（锚可解析+路径存在硬校验）。
- **重放与修复怎么不打架**：字段级所有权四硬约束——蒸馏重放不覆盖绑定字段、同源
  重放不冲 agent 修复、--bind 原子更新、FR supersede 同步绑定状态。

## 方案概要
1. 变更内机器文件 `changes/<名>/test-trace.json` 承载验证期 trace（局部锚）。
2. verify 探针 7 构建时机械落 candidate；verify --done 矩阵门通过后按判定列晋升
   active（covered/covered-service）；归档时随 fr-index 铸全局锚写入活库条目。
3. quick --done 对提交窗口测试文件机械落 ql candidate 行（quicklog 机器面）。
4. 新增 `src/test-bindings.js` 单点解析模块 + `sillyspec tests` CLI（视图+修理工）。

## 非目标
- verify 跑集 / residual adapter / 保守差集 / 披露 / 悬空硬错——**另案**
  （fr-test-binding §3.3 读侧，分变更裁定）。
- D 锚适配器、命名 runner profile（方案后置项）。
- CAP 第四锚空间、第四指纹实现（方案禁止项）。
- 沉默红表态（二期）。
