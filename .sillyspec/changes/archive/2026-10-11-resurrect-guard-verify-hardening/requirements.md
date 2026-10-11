---
author: flow-machine-draft
created_at: 2026-10-11T13:55:38.251Z
---
# 需求规格（Requirements）— 2026-10-11-resurrect-guard-verify-hardening

## 功能需求

### FR-01: run <stage> 对「活跃目录与 changes/archive/<同名>/ 并存且库内无活跃行」的变更名拒绝注册 exit 2 并给双出口指引；doctor detectArchiveIntegrity 对同形态 pass=false severity=FAILED 给处置指引（test/archived-resurrect-guard.test.mjs 全绿）

- run <stage> 必须在自动注册进度前检测「活跃目录与 changes/archive/<同名>/ 并存且库内无活跃行」的幽灵复活形态，命中即拒绝注册并以 exit 2 终止，输出必须含两个出口（认归档清目录 / 换名或恢复归档重开）；doctor detectArchiveIntegrity 对同形态必须返回 pass=false、severity=FAILED、resurrected 清单非空，且处置指引必须含「勿用 --align-execute-progress」警示。

#### 场景：幽灵复活拒绝注册

Given 活跃 changes/<名>/ 与 changes/archive/<名>/ 并存且进度库无该变更活跃行，When 跑 run verify --change <名>，Then exit 2、stderr 含「拒绝注册」与两个出口指引，进度库不新增行。

#### 场景：归档后重开放行

Given 同名并存但库内有该变更活跃行（恢复场景），When 跑 run verify --change <名>，Then 正常注册放行不拦截。

#### 场景：doctor 报 FAILED

Given 同名幽灵并存，When 跑 doctor 归档完整性重扫，Then archive_integrity 检查 pass=false、severity=FAILED、findings 含 resurrected 名单与「勿用 --align-execute-progress」。

### FR-02: verify 对账 diff 面锚点：merge-base(<主分支>,HEAD) 仅为立项点严格后代时采用（窗口只收窄），mb==HEAD、mb==立项点、非后代三形态一律退旧区间（test/verify-reconcile-merge-base.test.mjs 全绿）

- verify 对账 diff 面必须锚 merge-base(<主分支>,HEAD)，且仅当该 merge-base 是立项 diffBase 的严格后代（窗口只收窄）时采用；mb==HEAD、mb==立项点、merge-base 不可得或非立项点后代三种形态必须退回旧区间 <diffBase>..HEAD，禁止放大 diff 窗口。

#### 场景：合 main 后只圈本分支提交

Given 执行期已把 main 合入本分支（mb 严格晚于立项点），When 解析对账 diff 面，Then 锚采用 mb、diff 面不含主仓并行演进文件。

#### 场景：未合 main 零变化

Given 未合 main（mb==立项点），When 解析对账 diff 面，Then 锚保持立项点、diff 面与旧口径一致。

#### 场景：主分支不可得退旧区间

Given main/master ref 均不可得，When 解析对账 diff 面，Then 退旧区间 <diffBase>..HEAD 不抛错。

### FR-03: resolveTestTimeoutMs 与 TEST_TIMEOUT_MS 同口径解析 SILLYSPEC_TEST_TIMEOUT_MS：<10000 按秒×1000，≥10000 按毫秒并告警促改秒

- SILLYSPEC_TEST_TIMEOUT_MS 的两处读取（TEST_TIMEOUT_MS 常量与 resolveTestTimeoutMs）必须统一走 parseTestTimeoutEnvMs：值 <10000 必须按秒解释（×1000），值 ≥10000 必须按毫秒解释并输出告警促改传秒值；非法值（非数/≤0）必须返回 null 落默认超时。

#### 场景：秒值口径

Given env SILLYSPEC_TEST_TIMEOUT_MS=1800，When 解析超时，Then 得 1800000ms（秒×1000），不再被当 1.8s 帽。

#### 场景：毫秒兼容告警

Given env SILLYSPEC_TEST_TIMEOUT_MS=600000（≥10000），When 解析超时，Then 得 600000ms 且 stderr 出现按毫秒解释的告警。

### FR-04: .claude/skills/sillyspec-quick/SKILL.md 存在且描述 run quick 三步生命周期与 --linked-changes 语义；auto/brainstorm SKILL.md 分叉文案指向 quick --linked-changes

- .claude/skills/sillyspec-quick/SKILL.md 必须存在并描述 run quick 三步生命周期与 --linked-changes 语义（none/显式列表/non-interactive 且 --change 不作关联用途）；sillyspec-auto 与 sillyspec-brainstorm SKILL.md 的规模分叉文案必须指向 quick --linked-changes（不再指 flow start 收编）。

#### 场景：技能面落盘

Given 仓内 .claude/skills/，When 检查 sillyspec-quick/SKILL.md，Then 含「run quick」「--linked-changes」与三步生命周期说明；auto/brainstorm SKILL.md 含 quick 分叉指向。

### FR-05: node --test test/doc-ref-check.test.mjs 绿（platform-interface-map.md 零失效）；sillyspec docs check 全量 846 处引用零失效；docs gate 基线=0

- 文档行号引用必须零失效：test/doc-ref-check.test.mjs 必须绿（platform-interface-map.md 零失效），sillyspec docs check 全量必须零失效（846 处全过）；docs gate 基线必须收紧至 0（棘轮只紧不松，锁住全绿成果）。

#### 场景：重锚后全绿

Given docs check --fix 重锚 16 文件 + 手工修正 2 处（core-engine.md 调用点锚 4310、unmapped.md 裸名补全路径），When 跑 docs check 与 doc-ref-check 测试，Then 双双零失效，docs-check-baseline=0。

### FR-06: 全量 npm test 零失败（749 文件）

- 收口实测门必须全绿：全量 npm test 必须零失败（749 个测试文件，并发 12，含本变更两个新增测试文件）。

#### 场景：全量回归

When 跑 npm test，Then 通过 749 文件、失败 0。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/archived-resurrect-guard.test.mjs「① 幽灵复活：活跃目录 + archive 同名 + 库无活跃行 → run verify 拒绝注册」「② 库内有活跃行的同名并存（归档后重开恢复场景）→ 放行」「③ doctor：同名并存 → archive_integrity FAILED + resurrected 清单 + 勿 align」
FR-02: test/verify-reconcile-merge-base.test.mjs「① merge main 后：diff 面只含本分支自身提交（并行演进不圈入）」「② 未合 main：merge-base == 立项点，行为零变化」「③ main ref 不可得 → 退旧区间（守卫：只窄不宽）」
FR-03: test/verify-reconcile-merge-base.test.mjs（超时口径经全量 npm test 的 verify 执行面回归覆盖；resolveTestTimeoutMs 消费方 run-tests/verify 实测通过即证）
FR-04: 不适用：纯技能文案资产（.claude/skills/*.md），无代码行为可测；由 FR-06 全量回归与收口 diff 目检覆盖
FR-05: test/doc-ref-check.test.mjs（platform-interface-map.md 零失效断言 + test:core 清单在位断言）
FR-06: test/run-tests.mjs（全量入口，749 文件零失败）
