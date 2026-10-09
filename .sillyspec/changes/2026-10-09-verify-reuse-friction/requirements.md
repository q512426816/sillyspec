---
author: zcode-verify-friction
created_at: 2026-10-09T15:30:00+08:00
---
# 需求规格（Requirements）— 2026-10-09-verify-reuse-friction

## 功能需求

### FR-01: 快照口径复用闸按「实际口径」收敛——快照创建慢性失败时 passed 幂等复用第二轮起命中（死循环断根）

- executeVerifyQualityScan 的 passed 幂等闸与 failed 失败签名去重闸（shouldReuseLastFailedScan 同型）必须在快照创建之后以实际口径（Boolean(snap)）判定，不得以计划口径（plannedSnapshot）判定；连续快照失败（记录 usedSnapshot=false、本轮实际=false）必须命中复用免重跑；口径真实切换（上轮快照、本轮失败或反之）必须失配重跑。

#### 场景：死循环断根

- Given 质量扫描记录 testResult=passed、usedSnapshot=false，本轮快照创建再次失败；When 执行 noAI 质量扫描；Then passed 幂等闸命中（reason 不为 snapshot-scope-changed），本轮零测试执行直接复用；口径切换场景（上轮 true 本轮 false）仍失配重跑。

tests: test/verify-quality-scan-reuse-actual-scope.test.mjs

### FR-02: 快照创建失败/跳过高可见 + 摩擦记账

- gates.js verify 段与 executeVerifyQualityScan 的快照创建静默 catch 必须改为醒目 ⚠️ 输出（含失败原因与「实测口径=主仓回退」明示）；并记摩擦事件 type=gate_snapshot_fallback（friction-tally 封闭枚举扩展，detail 携 change 名与失败摘要）。

#### 场景：可见性

- Given 快照创建抛异常；When verify --done / noAI 扫描执行；Then 控制台出现 ⚠️ 快照回退告警块（非静默），friction-tally 落一条 gate_snapshot_fallback。

tests: test/gates-snapshot-fallback-visibility.test.mjs

### FR-03: 复用指纹代码树内容键化——纯文档提交不击穿、代码提交必击穿；口径单点

- green-cache computeGateFingerprint 与质量扫描 computeQualityScanFingerprint 的 HEAD 分量必须替换为「代码树内容键」：基于 `git ls-tree -r HEAD` 条目、按既有非代码路径口径（.sillyspec/、docs/、*.md）过滤后哈希；判据与树键计算收敛到单点模块（code-face-key.js），两指纹消费方不再各自实现；git 失败返回 null（fail-open miss 语义不变，逃生阀与 TTL 不变）。

#### 场景：文档提交存活 / 代码提交击穿

- Given 一次真跑绿后仅做纯文档提交（代码树键不变）；When 下轮收口查缓存；Then 命中复用零重测。Given 代码文件提交（代码树键变化）；When 查缓存；Then 必失配真跑。

tests: test/code-face-key-doc-commit-survival.test.mjs

### FR-04: 复用判定落盘可观测

- runVerifyTestCheck 写出的 test-result.json 必须新增 additive 字段：fingerprint（本轮指纹）与 reuseDecision {layer, hit, reason}（ledger/quality-scan/green-cache/real-run 四层之一与 miss 原因）；质量扫描记录 store 时必须携带上一轮 miss 原因（missReason）——复用链路取证不再依赖 stdout。

#### 场景：取证直读

- Given 一轮真实执行与一轮复用命中；When 直读两份 test-result.json；Then 各自携带 fingerprint 与 reuseDecision（real-run / green-cache-hit + reason），无空字段。

tests: test/verify-test-result-reuse-observability.test.mjs

### FR-05: verify 收口纯事实门前移——声明缺失时零测试执行秒级失败

- gates.js verify 段门序重排：required-evidence 门与 target_files 对账门（纯 git/文档事实、零外部执行）必须移至实测门（test/lint）之前（并入文档面收集阶段，享受 R16 一次性全列 + 统一 rollback）；依赖实测结果的门（PASS 封顶/parity 等）位置不动。

#### 场景：秒级失败

- Given task 卡声明 4 个交付文件而实际改动 0 个；When run verify --done；Then target_files 对账门在实测门之前拦截（零测试执行，秒级返回，清单式报错）。

tests: test/gates-verify-cheap-gates-first.test.mjs

### FR-06: trace 行 repo 归属——写侧透传、读侧按行解析

- test-bindings 机器 candidate 行写侧必须从 task 卡 repo 切片透传 repo 字段（additive，缺省视为 main，存量行零迁移）；verify 悬空判定与残差执行的路径解析必须按行 repo 归属换根（经 repos 注册表），无 repo 字段行回退主仓 cwd（行为兼容）。

#### 场景：跨仓行不再悬空

- Given 跨仓 task 卡 repo: sillyspec 声明 tests 路径（仓根相对）、该文件在 sillyspec 仓存在；When verify 实测门 trace 悬空判定与残差执行；Then 按 sillyspec 仓根解析命中，不再 fail-fast 悬空。

tests: test/test-bindings-crossrepo-row-resolution.test.mjs

### FR-07: 跨仓对账锚点窗口覆盖多笔提交

- cross-repo-reconcile 与 verify-postcheck 跨仓分支的 B 档锚点 `HEAD~1..HEAD` 必须扩展：apply/worktree baseline 可得时用 `baseline..HEAD` 覆盖多笔提交窗口，label 如实标注窗口来源；baseline 不可得时回退现行 `HEAD~1..HEAD`（不回退语义）。

#### 场景：多笔提交对上

- Given 跨仓仓在 baseline 后有 2 笔交付提交；When 对账采集 actual；Then 两笔的文件都在 actual 面（不再只看最近一笔），声明/实测对上。

tests: test/cross-repo-reconcile-baseline-anchor.test.mjs

### FR-08: wt-commit 跨仓 worktree 识别

- wt-commit 的 cwd 推断在 worktree 名含 `--<repoKey>` 后缀时必须经 repos 注册表校验后剥除后缀得到变更名（不猜切分：仅当后缀命中注册 repo 键才剥）；剥出变更名后按主仓进度库记账，跨仓 worktree 内可正常执行。

#### 场景：跨仓推断

- Given cwd 为 `.sillyspec/.runtime/worktrees/2026-10-09-x--sillyspec` 且 sillyspec 是注册 repo；When sillyspec wt-commit -m ...；Then 推断变更名 2026-10-09-x（非 2026-10-09-x--sillyspec），提交完成记账正确。

tests: test/wt-commit-crossrepo-infer.test.mjs

## 决策覆盖矩阵

| 决策 | 覆盖 |
|---|---|
| D-001@v1 单变更四 Wave | 全部 FR 的 Wave 归属（FR-01/02=W1，FR-03/04=W2，FR-05=W3，FR-06/07/08=W4） |
| D-002@v1 指纹=代码树内容键 | FR-03 |
| D-003@v1 复用闸按实际口径 | FR-01 |
| D-004@v1 门序前移安全边界 | FR-05 |
| D-005@v1 trace 行 repo additive + 回退主仓 | FR-06 |
| D-006@v1 wt-commit 注册表校验剥后缀 | FR-08 |

## 测试绑定（每条 FR 至少一行：`FR-NN: test/路径「用例名」`；不适用要写理由；flow done 空行拒收）

FR-01: （待填——哪个测试文件/用例覆盖这条 FR；无测试面写「不适用：理由」）
FR-02: （待填——哪个测试文件/用例覆盖这条 FR；无测试面写「不适用：理由」）
FR-03: （待填——哪个测试文件/用例覆盖这条 FR；无测试面写「不适用：理由」）
FR-04: （待填——哪个测试文件/用例覆盖这条 FR；无测试面写「不适用：理由」）
FR-05: （待填——哪个测试文件/用例覆盖这条 FR；无测试面写「不适用：理由」）
FR-06: （待填——哪个测试文件/用例覆盖这条 FR；无测试面写「不适用：理由」）
FR-07: （待填——哪个测试文件/用例覆盖这条 FR；无测试面写「不适用：理由」）
FR-08: （待填——哪个测试文件/用例覆盖这条 FR；无测试面写「不适用：理由」）
