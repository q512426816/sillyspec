---
author: qinyi
created_at: 2026-09-24
---

# 需求规格（Requirements）

## 角色

| 角色 | 说明 |
|---|---|
| 开发者 | 用 quick/verify 门禁的 agent 与人类，对 %TEMP% 泄漏零感知成本 |

## 功能需求

### FR-01: 创建前自动回收失活快照
覆盖决策：D-002@v1, D-003@v2, D-004@v2, D-005@v1, D-006@v1
Given 账本存在条目，条目过 fail-closed 路径守卫（tmpdir 直接子目录+sillyspec-gate-* basename+形态合法），且超 TTL（默认 24h，env `SILLYSPEC_GATE_SNAPSHOT_STALE_HOURS` 覆盖，须为有限正数否则回退 24h）、pid 明确死（kill 成功/EPERM=活，ESRCH=死，无效/异常=按活跳过）
When 下一个门禁建隔离快照（runtimeRoot 经显式参数透传，缺失时账本链路退 no-op）
Then 同步回收其目录并清 git worktree 注册，条目仅在双清确认后销号；reclaimed 为空时零输出；异常时静默跳过永不阻断建快照

#### 场景：崩溃残留自愈
Given 上一门禁进程被杀留下账本条目（目录+注册俱在）
When 新门禁建快照
Then 条目被回收，%TEMP% 与 worktree 注册均无残留

#### 场景：活跃快照零误删
Given 账本条目 age>TTL 但 pid 存活，或 pid 无效/探针异常
When 新门禁建快照
Then 该条目跳过，活跃快照目录与注册原样保留

#### 场景：篡改条目零删除
Given 账本条目路径不满足守卫（非 tmpdir 直接子目录/非 sillyspec-gate-* 前缀/含 .. 嵌套）
When 触发回收
Then 跳过且不调用任何删除原语

### FR-02: cleanup 路径 Windows 硬化
覆盖决策：D-001@v1, D-004@v2
Given `git worktree remove` 失败或 rmSync 遇 EPERM
When cleanup 执行
Then rmSync 带 maxRetries/retryDelay 重试，失败后补 `git worktree prune` 清注册，双失败时不抛且**保留账本条目**（残留留待回收路径自愈，绝不先销账失追踪）

### FR-03: doctor 泄漏维度
覆盖决策：D-001@v1, D-007@v1
Given 账本存在超期且守卫过的失活条目
When 跑 `sillyspec doctor`
Then 输出一条 warning 级泄漏诊断（列 root 与账龄，维度按既有 name/label/pass/severity/findings/safe_actions 结构适配），不自动修复、不阻断 quick/verify 门禁，零新增 CLI 参数；阈值与 create 前扫共用 env/24h 单源。「不阻断」仅指门禁与修复面——doctor --json 的 overall_status=warning 与退出码沿用现行全局口径不改

### FR-04: 账本登记/销账幂等与销账条件
覆盖决策：D-003@v2, D-004@v2, D-006@v1
Given 建快照成功、cleanup 执行、建快照中途失败三条路径；runtimeRoot 显式透传
When 账本读写发生重复调用或并发
Then 同一 root 重复登记/销账结果一致（跨 root 并发 lost update 为明示的接受退化）；建快照失败路径先尝试清理，仅在目录消失 ∧ worktree list 无注册时销账；账本损坏时读取退空数组；runtimeRoot 缺失时读写退 no-op

## 非功能需求

- 兼容性：Windows/POSIX 通用（junction 清理语义差异由 git remove 主导）；无新 CLI 参数（env 覆盖）。
- 可回退：删账本模块接线即回原 cleanup 单删；账本异常一律 fail-open 零阻断。
- 可测试：判定逻辑纯函数化（注入时钟/pid 探针/路径），副作用层分离可单测。

## 决策覆盖矩阵（如存在 decisions.md）

| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-01, FR-02, FR-03 | 三件套范围边界 |
| D-002@v1 | FR-01 | 回收触发点=创建前同步扫（空结果零输出） |
| D-003@v2 | FR-01, FR-04 | TTL×pid 三态保守判定 + env 值域校验 |
| D-004@v2 | FR-02, FR-04 | 双清确认销账 + 幂等与并发退化口径 |
| D-005@v1 | FR-01 | 账本驱动删除的 fail-closed 路径守卫 |
| D-006@v1 | FR-01, FR-04 | runtimeRoot 显式透传，禁 cwd 猜 |
| D-007@v1 | FR-03 | doctor 阈值 env/24h 单源，零新增参数面 |
