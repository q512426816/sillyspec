---
author: flow-machine-draft
created_at: 2026-10-23T00:57:47.163Z
---
# 需求规格（Requirements）— 2026-10-23-fr-regress-default-off

## 功能需求

### FR-01: readFrRegressCap 语义 v2（缺省翻转）

- readFrRegressCap MUST 按新缺省返回：缺省（无键）/坏值/local.yaml 不可读 → 0（off，新缺省）；`off` → 0；`N`（1-2000 正整数）→ N；`all` → null（无帽=旧现状，显式开启恢复全跑）；CRLF 行尾容错 MUST 保留；组面消费点逻辑零改动（null 不施帽、0 施 off 帽、N 施 N 帽——缺省路径天然走 off）。

#### 场景：缺省即 off

Given temp 仓 local.yaml 无 fr_regress_cap 键且 FR 索引非空；When 组面；Then FR 层零文件进实测面、披露行在场（0/N），变更测试∪import 依赖照跑。

#### 场景：all 显式恢复旧行为

Given 键=all；When 组面；Then FR 绑定面全部进实测面（旧行为），无帽披露行。

### FR-02: 披露与教学面反映新缺省

- 缺省跳过 MUST 恒打披露行（不静默），文案含开启指引（「fr_regress_cap 可开启：N=前 N 个 / all=全跑（旧行为）」）；动态子集信息行 MUST 反映实际组面（FR 层未进面时不再宣称「∪ FR 关联回归」，注明缺省归 pre-push/CI 门）；flow start 横幅测试面文案（local.yaml 缺席指引行）MUST 同步新缺省。

#### 场景：文案如实

Given 缺省 off 且 FR 索引非空；When 收口组面；Then 信息行描述为「本变更测试 ∪ import 依赖（FR 关联回归层缺省不跑…）」而非宣称含 FR 层。

### FR-03: 既有面适配与本仓配置收敛

- 需要 FR 面旧行为的既有测试夹具（fr-priority-overlap 直调 runModuleSubset）MUST 显式 `fr_regress_cap: all` 保持旧断言（有意缺省变更的夹具适配，留痕注释）；变更 6 的 fr-regress-cap 测试 MUST 随 v2 语义更新（键五态/本仓断言）；除 FR 面相关夹具外既有套件 MUST 零改动全绿。本仓 local.yaml MUST 移除 fr_regress_cap 键（缺省即 off），注释 MUST 留痕用户裁决。

#### 场景：夹具适配

Given fr-priority-overlap 夹具显式 all；When 跑套件；Then 旧断言（fr 标签/优先面）原样通过。

### FR-04: 测试矩阵

- 新增/更新测试 MUST 覆盖：readFrRegressCap v2 五态（缺省 0/all null/N/off 0/坏值 0，含 CRLF）；缺省 off 路径披露行锚；本仓键缺席断言。

#### 场景：矩阵

Given 直调与文本锚各形态；When 分别执行；Then 断言各自成立。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/fr-regress-cap.test.mjs「②readFrRegressCap v2 五态（缺省 0/all null/N/off/坏值）」
FR-02: test/fr-regress-cap.test.mjs「③本仓缺省断言与消费点单一源锚（披露行开启指引文案锚）」＋test/dynamic-test-inference.test.mjs「缺省 dynamic-empty reason 如实（评审 P1 修复锚）」
FR-03: test/fr-priority-overlap.test.mjs「夹具显式 all 旧断言原样绿」＋test/fr-regress-cap.test.mjs「③本仓键缺席断言」
FR-04: test/fr-regress-cap.test.mjs「①②③」＋test/dynamic-test-inference.test.mjs「两相 E2E」
