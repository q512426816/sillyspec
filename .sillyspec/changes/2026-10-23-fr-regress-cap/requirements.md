---
author: flow-machine-draft
created_at: 2026-10-23T00:27:36.745Z
---
# 需求规格（Requirements）— 2026-10-23-fr-regress-cap

## 功能需求

### FR-01: fr_regress_cap 配置键与 FR 回归面帽

- local.yaml 新键 `fr_regress_cap`（readFrRegressCap 逐键正则 fail-soft：正整数 1-2000 有效、off=0、缺省/坏值=无帽现状）必须在 runVerifyTestCheck 组面时对 FR 关联回归面生效：超帽时前 N 个（现有稳定序）进实测面，被弃 K 个与去向（pre-push/CI 门）loud 披露一行；off 时 FR 层整体跳过并 loud 披露；帽应用为纯函数 applyFrRegressCap(fr, cap)，frLinked/frReport/优先面标记从帽后自然推导（无第二套口径）。

#### 场景：超帽截断

Given fr.files 含 100 个绑定文件且键=24；When 组面；Then 前 24 个进实测面并保持优先面标记，输出「24/100 进实测面，其余 76 个归 pre-push/CI 门」披露行，frReport 计数按帽后面计。

#### 场景：off 整层跳过

Given 键=off 且 fr.files 非空；When 组面；Then FR 层零文件进实测面，输出整层跳过披露行；变更测试与 import 依赖层照跑。

### FR-02: 验收层不动与零回归

- 变更自身测试与 import 依赖层必须不受键影响（直接断言面保持）；未配置键时组面行为与改动前逐字一致（信息行/计数/批组卷零变化），既有 verify-postcheck/quick-audit 测试面零改动全绿。

#### 场景：缺省零回归

Given 未配置键；When 组面（fr.files 100）；Then 100 个全部进实测面（现状），无帽披露行。

### FR-03: 本仓自举落地

- 本仓 local.yaml MUST 落地 `fr_regress_cap: 24`——本变更自身收口即吃到帽：实测面 fr 分量 MUST ≤24，收口输出与回执 MUST 可见帽披露行。

#### 场景：自举收口

Given 本仓配置 24 且本变更触达 cli-entry 域 400+ FR；When 本变更 flow done；Then 实测面 fr 分量 ≤24 并有帽披露行。

### FR-04: 测试矩阵

- 新增测试必须覆盖：applyFrRegressCap 四态（无帽/N 内不截/超帽截断 kept-total/off 归零）＋readFrRegressCap 三态（缺省 null/合法 N/off=0/坏值 null）＋既有面回归。

#### 场景：矩阵

Given 直调各形态；When 分别执行；Then 断言各自成立。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/fr-regress-cap.test.mjs「①applyFrRegressCap 四态（截断/不截/off/无帽）」
FR-02: test/fr-regress-cap.test.mjs「②readFrRegressCap 三态 fail-soft」「③既有面零回归（套件零改动全绿）」
FR-03: test/fr-regress-cap.test.mjs「④本仓 local.yaml 键在场断言」
FR-04: test/fr-regress-cap.test.mjs「①-④」
