---
author: flow-machine-draft
created_at: 2026-09-26T00:21:43.802Z
---
# 需求规格（Requirements）— 2026-09-26-thin-gate-module-source

## 功能需求（agent 填写——每条 FR 格式 ### FR-NN: 标题 + Given/When/Then；FR 进知识索引，写清行为语义）

<!--AGENT:FR区 agent 填写功能需求（直接书写，不走 amend） -->

### FR-01: 命中源空回退（module 策略）
Given 全部改动已提交（thin「先提交再收口」的常态，git diff HEAD 为空）且调用方传入 restrictFiles（会话清单，与快照 overlay 同源）且其中含 src 文件，When runVerifyTestCheck 按 test_strategy: module 选择跑集，Then 以清单兜底作命中源 → 命中配置模块并实测子集（status=passed、command=module[...]），不再 0 命中假 skip；diff 源非空时（含他者声明过滤后非空）不使用清单替代。

### FR-02: 无清单维持 skip 语义（回归保护）
Given 同仓但调用方未传 restrictFiles，When 模块选择源为空，Then 维持 module-zero-hit-skip：status=skipped、reason 含「0 命中」与诊断文案（已配置 modules / diff 样例），不回退全量。

### FR-03: deps-auto 缺省收窄分支同款回退
Given 未配置 test_strategy 的仓、改动已全部提交、restrictFiles 含测试文件，When runVerifyTestCheck 走 deps-auto 缺省收窄，Then 以清单兜底作 deps(auto) 命中源 → 实测变更测试子集（command 含 deps(...)），不再落全量/skip。

### FR-04: 全量测试与 lint 绿
Given 本变更合入后，When 执行 npm test（全量）与 npm run lint，Then 全部通过。


## 测试绑定（每条 FR 至少一行——test 文件路径或用例名；不适用要写理由；flow done 空槽拒收）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/verify-gate-restrict-source.test.mjs 用例 A（全提交仓+清单→module[core] passed）＋用例 D（已跟踪文件未提交的 diff 源非空 → 命中且「回退」不触发）。

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/verify-gate-restrict-source.test.mjs 用例 B（无清单 → skipped＋reason 含 0 命中）。

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/verify-gate-restrict-source.test.mjs 用例 C（未配置策略仓+清单含测试文件 → module[]+deps(js1) passed）。

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
会话侧亲跑全量（2026-09-26）：`npm test` 637 个测试文件 0 失败 exit 0 ＋ `npm run lint` 813 文件绿；CLI 收口门本次实测面账本如实记录 `test: passed ← module[cli-core]+deps(js18)（13.3s）`＋`lint: passed（37.8s）`——本变更自身即修复路径的狗粮证据（评审 P3 补证落档）。
