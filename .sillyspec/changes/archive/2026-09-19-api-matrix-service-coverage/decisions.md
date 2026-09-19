---
author: qinyi
created_at: 2026-09-18 21:56:19
generated_by: sillyspec-fourpiece-init
change: 2026-09-19-api-matrix-service-coverage
---

# 决策记录（Decisions）

<!-- 增量落盘：每解决一个有实现影响的问题当场追加一条（格式见 brainstorm Step 3 模板）；幂等按 D-xxx@vN 判重 -->

## D-001@v1: 接口矩阵引入第五判定形态 covered-service（service 层承接计入覆盖）
- type: architecture
- priority: P0
- status: accepted
- source: user
- question: 「covered 分子==有效分母」硬等式对「端点行为由 service 层测试锁定、无端点级用例」的端点偏严——agent 被迫虚标 covered 才能放行（用户实证：dispatch-now 端点，verify facts 门禁六轮迭代）。
- answer: 新增 verdict 枚举 `covered-service`：**计入分子、分母不变**（区别于 non-testable 的分母扣除——那是「不可测」，service 承接是「已测、覆盖层不同」）；证据列必须含**真实测试锚点**（复用 probe7-anchor-check 的测试文件口径：`.test.` / `test/` 路径 / file:line 形态），缺锚点即 error（与 non-testable 必须有一句理由同构——防滥用是 D-004@v1(api-coverage-smoke)「防挑好测的测」立意的延续，虚标 covered 反而是当前最大的诚实性漏洞）；不触发 PASS 封顶降级（区别于 partial——service 承接是已完成态不是移交待办），但 advisory 单独计数「N 端点由 service 层测试承接（非端点级）」保持评审可见。
- normalized_requirement: 接口矩阵判定列四选一改五选一（covered/covered-service/partial/uncovered/non-testable）；covered-service 行满足覆盖等式（分子计数）且证据列含测试文件锚点，缺锚点 verify gate error；advisory 输出承接计数。
- impacts: [FR-01, FR-02]
- 模块域: core-engine
- evidence: 用户反馈原话（2026-09-19 工具驾驭感受）；src/stage-contract.js:1208-1232（硬等式）；src/stage-contract.js:1199-1206（non-testable 理由同构先例）；src/probe7-anchor-check.js（测试锚点三形态先例）
- 故障面: 全部端点都标 covered-service、零端点级验证的系统性逃避——advisory 计数保持可见但不阻断（先观察滥用面再考虑上限；写端点的回执/集成门禁是独立门照常拦截）。
- 退役判据: 若接口矩阵迁结构化产物（design-frontmatter/api.yaml），覆盖形态语义随预填源切换重审；advisory 实证滥用面可忽略时移除计数注记。

## D-002@v1: MATRIX_VERDICT_WHITELIST 两矩阵共用——covered-service 联动接受而非拆分
- type: architecture
- priority: P1
- status: accepted
- source: code
- question: 判定枚举白名单 `MATRIX_VERDICT_WHITELIST`（stage-contract.js:789）被探针 7 验收矩阵门与接口矩阵门两处共用，新增 covered-service 会同步放宽验收矩阵的合法判定值。
- answer: 接受联动不拆白名单。依据：两矩阵判定词汇本就「骨架口径注记字面同源」；验收矩阵语义上「验收项由非端点层测试承接」本就是正当形态（单测承接验收项是常态），联动是语义修正而非风险扩散。执行时必须核实探针 7 门（:872 附近）对 covered-service 的记账路径——不得落进 unfilled 分支误报。
- normalized_requirement: 白名单加入 covered-service 后，验收矩阵门对 covered-service 行按与 covered 同类的合法判定处理（不进 unfilled/partial 记账）。
- impacts: [FR-02]
- 模块域: core-engine
- evidence: src/stage-contract.js:789（白名单定义+同源注释）、:872（探针 7 消费点）、:1062（接口矩阵消费点）
- 故障面: 探针 7 记账分支若显式枚举 verdict 值（而非白名单判非）会把 covered-service 误判 unfilled——需测试覆盖「验收矩阵含 covered-service 行」用例。
- 退役判据: 若两矩阵判定词汇语义分化（各自需要不同枚举集），拆白名单为两份。

## D-003@v1: 方案选择——A（新枚举 covered-service）胜出
- type: architecture
- priority: P0
- status: accepted
- source: user
- question: 三方案取舍：A 新枚举 covered-service / B covered 扩测试锚点形态 / C partial+测试锚点计分子。
- answer: 选 A。**用户未应答（自主模式推进，非用户确认——可否决：--reopen 重选）**，依据：用户原始反馈方向（诚实标注 service 承接、不再被迫虚标 covered）与 A 完全对齐；B 的最小改动恰好牺牲本变更的目的本身（端点级/间接区分度、承接占比可审计、防滥用——原虚标问题被合法化）；C 把 partial 语义重载为「间接覆盖可放行」，与移交联动/PASS 封顶分支纠缠最深、回归面最大。
- normalized_requirement: 实现按方案 A 执行（D-001/D-002 细节决策为准）。
- impacts: [FR-01, FR-02]
- 模块域: core-engine
- evidence: 方案对比轮（brainstorm step 4 --wait 挂起后自主推进，AskUserQuestion 未获应答）
- 故障面: 自主选案未经用户实时确认——用户回看时若否决 A，需 --reopen 从 step 4 重做并 supersedes 本条。
- 退役判据: 用户回看确认方案 A（step 5 设计确认轮已实质覆盖——设计为 A 的直接展开且获用户实答「确认设计，继续」）。
