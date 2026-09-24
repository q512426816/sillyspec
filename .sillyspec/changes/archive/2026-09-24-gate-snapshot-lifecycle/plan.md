---
plan_level: full
execution_mode: main
---

# 实现计划（Plan）— 门禁快照生命周期加固

## Wave 1（并行，文件正交）
- task-01
- task-02

## Wave 2（依赖 Wave 1，同文件续作）
- task-03

## Wave 3（依赖 task-01/03）
- task-04

## Wave 4（收尾登记）
- task-05

## 任务总表

| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | 说明 |
|---|---|---|---|---|---|---|
| task-01 | 账本模块+单测 | W1 | P0 | — | FR-01, FR-04, D-003@v2, D-004@v2, D-005@v1 | 新模块：账本读写+路径守卫+纯判定+回收执行，注入时钟/pid 探针 |
| task-02 | cleanup 硬化+故障注入测试 | W1 | P0 | — | FR-02, D-001@v1 | 抽出可注入 cleanupSnapshot（rmSync 重试+prune 兜底，返回双清结果）；独立测试文件做故障注入（与 task-01 无共享文件，保持并行） |
| task-03 | 回收接线+三路径销账 | W2 | P0 | task-01,02 | FR-01, FR-02, FR-04, D-002@v1, D-003@v2, D-004@v2, D-006@v1 | runtimeRoot 透传（quick-audit.js 进边界）+create 前回收+消费 cleanupSnapshot 双清返回值决定销账+真实 kill 集成用例 |
| task-04 | doctor 泄漏维度+单测 | W3 | P1 | task-01, task-03 | FR-03, D-001@v1, D-007@v1 | warning 级诊断，阈值 env/24h 单源（零新增参数面），dimensions 结构适配 |
| task-05 | 文档同步+test:core 登记 | W4 | P1 | task-01,03,04 | D-001@v1 | runtime 模块卡/changelog、file-lifecycle、package.json |

## 关键路径

task-01 → task-03（账本先于接线；task-02 与 task-01 可并行汇入；task-04 依赖 task-03 的测试面）

## 全局硬约束（从 design.md 逐字抄录，绑定所有 task）

- 判定逻辑纯函数化：时钟、pid 活性探针、路径均可注入（可单测，禁依赖真实 %TEMP% 与真实 pid 语义）。
- 回收与账本异常全 try/catch 吞掉：永不阻断门禁建快照与判定（fail-open 退现状）。
- 账本 register/unregister 同 root 幂等；建快照失败与 cleanup 均先尝试清理，仅在「目录消失 ∧ worktree list 无注册」双清确认后销账，删不掉的条目必须保留（失追踪=永久泄漏）。
- 失活判据恒为「账本有条目 ∧ 过路径守卫 ∧ age>TTL(有限正数，默认 24h) ∧ pid 明确 ESRCH」四合取；EPERM/无效 pid/探针异常一律按活跳过，env 非法值回退 24h。
- 删除原语（rmSync/recursive 与 git worktree remove）在**账本回收路径**调用前必经 isSafeLedgerEntry（内含 isSafeSnapshotRoot 路径守卫：tmpdir 直接子目录+sillyspec-gate-* basename+无 .. 嵌套），不过闸零删除；cleanup 自身 root 来自 mkdtemp（生成即受信）豁免。
- runtimeRoot 显式形参透传（quick 侧 resolveRuntimeRoot(null,specBase) 同 test-ledger 先例），禁从 cwd 猜；缺失时账本链路退 no-op。
- 不改门禁判定语义、快照隔离/血统三态、信任边界、任何 CLI 参数面与退出码。
- 新增运行时文件须登记 file-lifecycle.md；模块卡摘要随本变更同步。

## 全局验收标准

1. 新测试（test/gate-snapshot-lifecycle.test.mjs + test/gate-snapshot-cleanup.test.mjs）全绿；既有 gate-snapshot 族全部零回归；doctor 族零回归。
2. 全量 npm test + npm run lint 零失败（新测试入 test:core 清单）。
3. 门禁正常路径（无泄漏）输出逐字节不变；账本空/损坏场景零副作用。
4. 崩溃残留自愈实证：账本留条目 + 杀进程态目录下个 create 触发回收，目录与 worktree 注册双清。

## 覆盖矩阵

| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v1 | task-02, task-04, task-05 | FR-02/FR-03 验收条目 |
| D-002@v1 | task-03 | 接线源文本钉 + create 前调用断言 + 空结果零输出 |
| D-003@v2 | task-01, task-03 | TTL×pid 三态真值表（EPERM/异常/无效/NaN env）单测 |
| D-004@v2 | task-01, task-03 | 双清销账/双失败保留/幂等/损坏退空单测 |
| D-005@v1 | task-01 | 篡改条目零删除原语单测 |
| D-006@v1 | task-03 | runtimeRoot 透传接线钉 + 缺失退 no-op |
| D-007@v1 | task-04 | doctor 维度阈值 env/24h 与零新增参数面核验 |
