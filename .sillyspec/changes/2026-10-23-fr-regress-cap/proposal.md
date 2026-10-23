---
author: flow-machine-draft
created_at: 2026-10-23T00:27:36.745Z
---
# 提案书（Proposal）— 2026-10-23-fr-regress-cap

## 动机

任务原话转写：FR 回归面帽配置键

动机与背景：实测面三源（变更测试∪FR 关联回归∪import 依赖）中 FR 层自 2026-10-06 fr-regress-cap-drop 起优先面豁免帽整跑——脸肥域每次收口拖迷你全量：本仓 cli-entry 域 441 条 active FR → 每次 97-103 个绑定文件；平台仓 multi-agent-platform 实证 session-composer-slim 一轮 fr(237)+deps(~200)=440 文件 706.9s，review-risk-fixes-2 fr(97)=316.9s，多轮+评审复跑即小时级体感。用户裁决（2026-10-23 原话）：「别让跑全量测试啊，留 ci 跑，甚至只跑自己写的就行了」。新增 local.yaml fr_regress_cap：N=FR 绑定面前 N 个进实测面（其余 loud 披露归 pre-push/CI 门），off=FR 层整体跳过（只跑变更∪import 依赖——验收层不动），缺省=无帽整跑零回归。本仓落地 fr_regress_cap: 24 自举（收口面 26 deps+24 fr≈50 文件）。用户已显式授权继续——autopilot 直跑到底，--no-prestage 声明需求已含决策（用户原话即裁决）。

成功标准：
- local.yaml 新键 fr_regress_cap（readFrRegressCap 逐键正则 fail-soft：正整数 1-2000 有效、off=0、缺省/坏值=无帽现状）：runVerifyTestCheck 组面时对 FR 关联回归面应用帽——超帽时前 N 个进实测面（现有稳定序），被弃 K 个与去向 loud 披露一行（归 pre-push/CI 门，防静默漏测）；off 时 FR 层跳过并 loud 披露（变更∪import 依赖照跑）
- 帽应用为纯函数 applyFrRegressCap(fr, cap)（fr 对象→{fr, capApplied}），frLinked/frReport/优先面标记从帽后面自然推导（无第二套口径）；缺省无键时行为与改动前逐字一致（零回归锚）
- 变更自身测试与 import 依赖层不受键影响（验收层不动——直接断言面保持）
- 本仓 local.yaml 落地 fr_regress_cap: 24（自举：本变更收口即吃到帽）
- 测试：applyFrRegressCap 纯函数四态（无帽/N 内不截/超帽截断+kept/total/off 归零）＋readFrRegressCap 三态＋既有 verify-postcheck/quick-audit 测试面零改动全绿

## 变更范围

按成功标准机械推导，共 5 条验收面：
1. local.yaml 新键 fr_regress_cap（readFrRegressCap 逐键正则 fail-soft：正整数 1-2000 有效、off=0、缺省/坏值=无帽现状）：runVerifyTestCheck 组面时对 FR 关联回归面应用帽——超帽时前 N 个进实测面（现有稳定序），被弃 K 个与去向 loud 披露一行（归 pre-push/CI 门，防静默漏测）；off 时 FR 层跳过并 loud 披露（变更∪import 依赖照跑）
2. 帽应用为纯函数 applyFrRegressCap(fr, cap)（fr 对象→{fr, capApplied}），frLinked/frReport/优先面标记从帽后面自然推导（无第二套口径）；缺省无键时行为与改动前逐字一致（零回归锚）
3. 变更自身测试与 import 依赖层不受键影响（验收层不动——直接断言面保持）
4. 本仓 local.yaml 落地 fr_regress_cap: 24（自举：本变更收口即吃到帽）
5. 测试：applyFrRegressCap 纯函数四态（无帽/N 内不截/超帽截断+kept/total/off 归零）＋readFrRegressCap 三态＋既有 verify-postcheck/quick-audit 测试面零改动全绿

## 成功标准（可验证）

1. local.yaml 新键 fr_regress_cap（readFrRegressCap 逐键正则 fail-soft：正整数 1-2000 有效、off=0、缺省/坏值=无帽现状）：runVerifyTestCheck 组面时对 FR 关联回归面应用帽——超帽时前 N 个进实测面（现有稳定序），被弃 K 个与去向 loud 披露一行（归 pre-push/CI 门，防静默漏测）；off 时 FR 层跳过并 loud 披露（变更∪import 依赖照跑）
2. 帽应用为纯函数 applyFrRegressCap(fr, cap)（fr 对象→{fr, capApplied}），frLinked/frReport/优先面标记从帽后面自然推导（无第二套口径）；缺省无键时行为与改动前逐字一致（零回归锚）
3. 变更自身测试与 import 依赖层不受键影响（验收层不动——直接断言面保持）
4. 本仓 local.yaml 落地 fr_regress_cap: 24（自举：本变更收口即吃到帽）
5. 测试：applyFrRegressCap 纯函数四态（无帽/N 内不截/超帽截断+kept/total/off 归零）＋readFrRegressCap 三态＋既有 verify-postcheck/quick-audit 测试面零改动全绿
