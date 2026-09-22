---
author: zcode-r7-surgery
created_at: 2026-09-22 10:48:00
---
# 任务注册表（Tasks）— 2026-09-22-r7-protocol-surgery

> Wave 分组与 plan.md Wave 段一致（plan-adopt-waves 拓扑定排，调度唯一真相）；切片为
> 设计边界：一=task-01，二=task-02/03，三=task-04/05，四=task-06，工具修正=task-07。
> 用户裁定收口（D-006）：7 卡不预付协议税；测试与实现同卡；终验发枪归 verify。

## Wave 1（并行，无依赖）
- [x] task-01: watcher 实现+接线+单测+module-map——NEW:src/watcher.js（detached+心跳
  租约+轮询三源事件+provisional jsonl+events 端点 fail-soft 推送+墙钟拆账）+command.js
  无条件 spawnWatcher 接线+test/watcher.test.mjs（推断/租约/降级/解耦钉）+module-map 录入
- [x] task-02: 归档链抽取——src/run/complete-handlers.js 640-722 内联链抽为可导入函数
  runArchiveChain（纯搬运，既有 archive 流程回归为硬门）
- [x] task-04: machine-draft 泛化——NEW:src/machine-draft.js（wrapSection/verifyMarkers/
  amendDraft，AMEND_CMD 参数化）+verify-draft.js 消费方化（verify 族零回归硬门）
- [x] task-07: plan 提示词反细拆（D-006/FR-11）——src/stages/plan.js 任务分解与 TaskCard
  指引注入：默认实现+单测同卡；禁纯接线/纯 module-map/纯全绿独立成卡；「同 Wave 文件
  不相交」文案补防并行互盖语义说明

## Wave 2（依赖前序 Wave）
- [x] task-03: flow 协议全件——NEW:src/flow.js（flow start：initChange 建卡+薄流程说明+
  材料路径清单+恢复简报+显式档 --thick/--with-tasks 人声明；flow done 六子步幂等+
  fail-closed 三句；flow-state.yaml）+config-schema.js 三键注册+local.yaml.example+
  index.js 分发+test/flow-protocol.test.mjs（机械 harness 2 调用/恢复简报/幂等/
  legacy 零变化）

## Wave 3（依赖前序 Wave）
- [x] task-05: flow-draft 四件起草+守卫——NEW:src/flow-draft.js（四起草器+draft-ledger
  首版原文永存+AGENT 槽+任务卡分岔）+flow.js 起草接线与三态拒收守卫+amend 通道+
  test/flow-draft.test.mjs（四件形态/三态拒收/槽放行/amend 留痕/薄跑道写入面）+
  module-map 录入

## Wave 4（依赖前序 Wave）
- [x] task-06: editRatio+失败升厚——flow-draft.js computeEditRatio（LCS 行 diff，ledger
  首版原文基准）+flow.js 醒目 route_hint+遥测四列+enforcement 开关（advisory 缺省）+
  失败触发升厚（verify 失败/审查否决/distill 异态→tier:thick）+test/flow-route.test.mjs
  （阈值两侧/失败升级真跑/block 可选）
