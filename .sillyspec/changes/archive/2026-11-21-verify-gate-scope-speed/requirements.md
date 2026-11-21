---
author: qinyi
created_at: 2026-11-21 23:06:32
generated_by: sillyspec-fourpiece-init
---
# 需求规格（Requirements）

## 角色
| 角色 | 说明 |
|---|---|
| agent（变更执行者） | 在收口被实测门阻断/放行的主体——分层门直接改善其收口等待时长 |
| 仓维护者 | 通过 local.yaml 两键（gate_scope/timeout_policy）控制分层门与护栏行为的配置主体 |

## 功能需求

### FR-01: 缺省阻断面收窄到自身测试∪非枢纽依赖命中
Given 未配置 gate_scope（或 gate_scope: lean）的仓执行收口实测
When 动态子集三源组装完成
Then 阻断面=changedFiles 中的测试文件∪仅命中非枢纽源（命中测试数≤DEPS_SYMBOL_NARROW_HUB_MIN）的依赖测试；命中任一枢纽源的测试文件移出阻断面

### FR-02: 间接面收口不执行且披露归 pre-push
Given 阻断面与间接面拆分完成
When 收口实测执行
Then 间接面（枢纽命中测试∪FR 关联回归层）不在收口执行；收口输出披露行列出间接面构成与「归 pre-push」去向；间接面清单落 ledger

### FR-03: 阻断面构成披露可审计
Given 收口实测执行完成（无论通过/失败/降级）
When 输出结果
Then 披露行含各源文件数（自身/依赖直接/间接）与总时长；ledger 落盘面构成与间接面清单，事后可查证

### FR-04: 时长护栏超预算转留痕不阻断
Given timeout_policy: degrade（缺省）
When 阻断面执行超 TEST_TIMEOUT_MS 预算且 isTimeoutOnlyTestFailure 判定命中
Then 结果改判 degraded-timeout 不阻断收口，loud 披露「阻断面超预算未跑完，转 pre-push/CI 门」+ledger 留痕；timeout_policy: block 时回超时=失败阻断旧行为

### FR-05: gate_scope: legacy 逃生阀恢复旧行为
Given 配置 verify: gate_scope: legacy + timeout_policy: block
When 收口实测执行
Then 阻断面=三源全阻断面（本变更测试∪FR 关联回归∪import 依赖）且超时=失败阻断，逐字对齐 2026-11-21 前现状行为

### FR-06: 归因出参 opt-in 零回归
Given discoverModuleDependentTests 不带 withAttribution 调用（三个既有消费点：收口主路径 src/verify-postcheck.js:2535、子集路径 src/verify-postcheck.js:3859、quick 存量门 src/index.js:1075）
When 执行
Then 返回 string[]（逐字现状）；带 withAttribution: true 时返回 { files, attribution, hitCountBySrc } 且 files 与缺省形态逐字一致

## 非功能需求
- 兼容性：未配置新键时收窄为缺省（目的性行为变化，披露行首现带说明）；legacy+block 组合完全回退；ledger 新字段缺省缺失按现状语义处理；Windows/Linux/macOS 三平台行为一致（路径/换行按既有工具函数口径）

## 决策覆盖矩阵（如存在 decisions.md）
| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-01, FR-02 | 收窄语义与间接面移出阻断 |
| D-002@v1 | FR-03, FR-04 | 双验收：构成披露+时长护栏 |
| D-003@v1 | FR-04 | 预算缺省沿用 TEST_TIMEOUT_MS |
| D-004@v1 | FR-02 | 间接面只归 pre-push 不在收口跑 |
| D-005@v1 | FR-06 | 命中算法/调度/缓存三面零改动 |
| D-006@v1 | FR-01, FR-05 | 收窄缺省+legacy 逃生阀 |
| D-007@v1 | FR-01, FR-02, FR-06 | 枢纽分层切线全语言同口径 |

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/verify-gate-lean-scope.test.mjs「缺省阻断面=自身∪非枢纽命中」
FR-02: test/verify-gate-lean-scope.test.mjs「间接面不执行且披露归 pre-push」
FR-03: test/verify-gate-lean-scope.test.mjs「披露行构成与 ledger 留痕可查证」
FR-04: test/verify-gate-lean-scope.test.mjs「护栏 degrade 转留痕不阻断与 block 旧行为」
FR-05: test/verify-gate-lean-scope.test.mjs「legacy+block 组合逐字对齐旧行为」
FR-06: test/verify-gate-lean-scope.test.mjs「归因出参 opt-in 零回归」
