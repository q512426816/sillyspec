---
author: qinyi
created_at: 2026-09-24 14:10:00
---
# 提案书（Proposal）— 2026-09-24-fr-test-readside

## 动机
写侧（3143aadc）已让绑定台账活起来：candidate 落盘、verify 晋升、归档提升。但
**verify 跑什么还没变**——绑定行只是账面，没有进入执行。本变更是 fr-test-binding
方案读侧：跑集 = 现选测 ∪ trace[本变更锚点集] 残差（只加法），配悬空硬错与差集披露。

## 关键问题
- **锚点集**：⋃(task 卡 requirement_ids 局部号)（quick 侧行恒 candidate 天然 no-op；
  可选扩展「diff 命中既有锚」一期默认关——方案裁定）。
- **保守差集**：仅 deps-auto-subset 的文件集可证覆盖；full/module-subset 跑命令串
  不可证 → trace 文件全补（宁多重跑不假绿，禁解析命令串猜覆盖面）。
- **执行矩阵**：5 动作 × trace 空/非空——skip/module-zero-hit-skip 且 trace 非空 →
  跑 trace（现选测 skip 语义自身不动）；其余主跑 + 补残差。
- **悬空硬错**：锚点集内 active 行 tests 路径缺失 → verify 门硬拦 + 修复指引
  （`tests --bind/--unbind` 前笔已同批落地，无死锁）。
- **账本护栏**：trace 非空的变更，verify 门 consult/record 停用（run plan 含 trace
  残差、静态不可预测——fail-closed 宁重跑不误复用；空 trace 变更照用 v2 键）。

## 方案概要
1. verify-postcheck 增锚点集/残差计算/悬空检查/残差执行段（runner 复用
   buildDepsBatches 推断面：扩展名组卷 node --test / pytest 前缀，无法归一硬错）。
2. 结果合并：mode 附 `+trace(N)`；任一段失败整体失败。
3. 披露：`verify-trace-disclosure.json` sidecar（真源）+ 门禁 console 提示行。
4. gates.js verify 门：trace 非空 → 跳过账本 consult/record。

## 非目标
- 不收窄默认跑集、不改 decideVerifyTestAction 缺省（收窄另决策——方案时序第 4 步）。
- 沉默红（二期）、D 适配器、命名 runner profile、跨仓 repoKey（方案后置项）。
- 不改 quick 门语义（quick 行恒 candidate 不进跑集，天然零影响）。
