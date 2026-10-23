---
author: flow-machine-draft
created_at: 2026-10-23T00:57:47.163Z
---
# 提案书（Proposal）— 2026-10-23-fr-regress-default-off

## 动机

任务原话转写：FR 回归层缺省关闭

动机与背景：变更 6（2026-10-23-fr-regress-cap）落地了 fr_regress_cap 帽但缺省仍是无帽整跑（消费仓零回归考虑）；用户裁决拍板缺省翻转（2026-10-23 原话）：「我们工具 默认就不跑，不用配置，配置可以开启」——工具开箱实测面=变更测试∪import 依赖，FR 关联回归层归 pre-push/CI 门；要这层网的仓自行配置开启（N=前 N 个 / all=全跑恢复旧行为）。缺省跳过恒打披露行+开启指引（不静默）。本仓 local.yaml 移除键（缺省即 off，注释留痕）。用户已显式授权——autopilot 直跑到底，--no-prestage 声明需求已含决策（用户原话即缺省裁决）。

成功标准：
- readFrRegressCap 语义 v2：缺省/坏值/不可读 → 0（off，新缺省）；off → 0；N（1-2000）→ N；all → null（无帽=旧现状，显式开启恢复全跑）；CRLF 容错保留；组面消费点缺省即施 off 帽
- 缺省跳过恒打披露行（0/N 进实测面，其余归 pre-push/CI 门＋「fr_regress_cap: N|all 可开启」指引）；动态子集信息行与 flow start 横幅测试面文案反映新缺省（不再无条件宣称含 FR 关联回归）
- 既有 FR 面测试/夹具按有意缺省变更同步（需要旧全跑行为的夹具显式 fr_regress_cap: all；断言随行为更新留痕）——除 FR 面相关外既有套件零改动全绿
- 本仓 local.yaml 移除 fr_regress_cap 键（缺省即 off），注释留痕用户裁决
- 测试：readFrRegressCap v2 五态（缺省 0/all null/N/off 0/坏值 0）；applyFrRegressCap 对 0 帽行为既有四态锚复用；缺省路径披露行 e2e/text 锚

## 变更范围

按成功标准机械推导，共 5 条验收面：
1. readFrRegressCap 语义 v2：缺省/坏值/不可读 → 0（off，新缺省）；off → 0；N（1-2000）→ N；all → null（无帽=旧现状，显式开启恢复全跑）；CRLF 容错保留；组面消费点缺省即施 off 帽
2. 缺省跳过恒打披露行（0/N 进实测面，其余归 pre-push/CI 门＋「fr_regress_cap: N|all 可开启」指引）；动态子集信息行与 flow start 横幅测试面文案反映新缺省（不再无条件宣称含 FR 关联回归）
3. 既有 FR 面测试/夹具按有意缺省变更同步（需要旧全跑行为的夹具显式 fr_regress_cap: all；断言随行为更新留痕）——除 FR 面相关外既有套件零改动全绿
4. 本仓 local.yaml 移除 fr_regress_cap 键（缺省即 off），注释留痕用户裁决
5. 测试：readFrRegressCap v2 五态（缺省 0/all null/N/off 0/坏值 0）；applyFrRegressCap 对 0 帽行为既有四态锚复用；缺省路径披露行 e2e/text 锚

## 成功标准（可验证）

1. readFrRegressCap 语义 v2：缺省/坏值/不可读 → 0（off，新缺省）；off → 0；N（1-2000）→ N；all → null（无帽=旧现状，显式开启恢复全跑）；CRLF 容错保留；组面消费点缺省即施 off 帽
2. 缺省跳过恒打披露行（0/N 进实测面，其余归 pre-push/CI 门＋「fr_regress_cap: N|all 可开启」指引）；动态子集信息行与 flow start 横幅测试面文案反映新缺省（不再无条件宣称含 FR 关联回归）
3. 既有 FR 面测试/夹具按有意缺省变更同步（需要旧全跑行为的夹具显式 fr_regress_cap: all；断言随行为更新留痕）——除 FR 面相关外既有套件零改动全绿
4. 本仓 local.yaml 移除 fr_regress_cap 键（缺省即 off），注释留痕用户裁决
5. 测试：readFrRegressCap v2 五态（缺省 0/all null/N/off 0/坏值 0）；applyFrRegressCap 对 0 帽行为既有四态锚复用；缺省路径披露行 e2e/text 锚
