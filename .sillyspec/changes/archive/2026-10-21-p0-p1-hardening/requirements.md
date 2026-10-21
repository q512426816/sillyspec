---
author: flow-machine-draft
created_at: 2026-10-21T13:38:03.403Z
---
# 需求规格（Requirements）— 2026-10-21-p0-p1-hardening

## 功能需求

### FR-01: getWorkerResult 返回体含 worker 回答正文（向后兼容）；review-dispatch 提取器在 artifacts 缺失时从回答正文提取平衡 JSON；worker 终态原文落盘；失败文案先给 salvage/--from 救回路径再谈降级；派发任务书注明宿主不支持 artifacts 时 JSON 放回答正文代码块

- 核码事实：上述五项能力已由先前变更 2026-10-21-review-dispatch-answer-salvage 全量落地（src/sillyhub-mcp/client.js getWorkerResult answer 透传、src/review-dispatch.js 三通道提取 extractReviewFromArtifacts / writeWorkerAnswer 终态原文落盘 / salvage+--from 两步出口文案 / 任务书 ```json 兜底指引，注释均带该变更名）。本条**禁止重复实现**，必须以既有测试作回归锚：相关测试全绿即视为本条满足；回归红即本条失败。

#### 场景：回归锚

- Given 既有 test/review-dispatch.test.mjs 与 test/sillyhub-mcp-platform-fixes.test.mjs 在场
- When 运行两文件
- Then 全绿（回收链五项能力行为保持）

### FR-02: worktree apply 恢复步后机械扫描变更面冲突标记（<<<<<<< / ======= / >>>>>>>），命中即 exit 非零并列出文件

- worktree apply `--stash-dirty` 的 stash 恢复步（restoreMainStash，含 --index 与普通两级恢复及失败分支）完成后，CLI **必须**对 stash 面文件（`git stash show --name-only` 口径）机械扫描行首 git 冲突标记（`<<<<<<< ` / `=======` / `>>>>>>> ` 三形态）；命中时**必须**：不 drop stash 条目（SHA 兜底既有语义保持）、打印命中文件清单与处置指引、把错误写入 apply 结果使最终 exit 非零。干净恢复（无标记）**必须**保持既有行为不变（照常 drop、零新增输出语义变化）。

#### 场景：恢复留冲突标记（dsh z2 实证事故）

- Given stash 恢复后 stash 面某文件含 `<<<<<<< Updated upstream` 等标记
- When restoreMainStash 收尾
- Then 返回 conflictFiles 含该文件、stash 条目保留未 drop、apply result.errors 含文件名与处置指引（exit 非零）

#### 场景：干净恢复零扰动

- Given 恢复干净无标记
- Then stash 照常 drop、无新增错误（既有行为不变）

### FR-03: run verify --done 输出进度心跳，同步类 IO 移出关键路径后台化，不再静默挂起

- run `--done` 收口链（completeStep 与 completeStepBurst 全程——单步 --done 与阶段完成门均在内）执行超过 60 秒时，CLI **必须**每 60 秒输出一行进度心跳（stderr，内容含已等待时长与旁路核对建议），命令结束（含异常/任意 return 路径）时**必须**停止心跳；60 秒内完成的常规路径**必须**零新增输出。非终态平台同步**必须**保持既有后台化行为（triggerSync → detached bg-sync；终态有界内联同步既有超时语义不变——本条回归保持，不重构同步链）。

#### 场景：慢收口可见

- Given 收口链耗时 >2 分钟
- Then 输出 ≥2 行心跳行（stderr），函数返回后不再打印

#### 场景：常规速度零噪音

- Given 收口 <60 秒
- Then 无任何心跳输出

### FR-04: stage-review-hint 探测覆盖 brainstorm/plan/execute 与 gates.js 拦截范围对齐；Stage Review 门输出含可粘贴的评审子代理 prompt 模板与 register-stage-review 骨架指引

- gate 的 stage-review 预警面**必须**与 run/gates.js Stage Review Gate 实拦范围（brainstorm/plan/execute 三阶段）对齐：默认档 informational `stage-review-hint` 与 `--full` 档 `full-stage-review` 探测**必须**三阶段全部在场；verify **必须**继续不产 hint（2026-10-11 期望面收敛保持——提示命令不可执行且门禁不存在，双重误导）。提示文案**必须**按 stage 参数化（禁止写死 execute）。可粘贴评审任务书模板（renderStageReviewerTaskbook，2026-10-12-thick-taskbook-cli）与 register-stage-review 骨架指引已在既有门输出在场——本条不重复交付，保持既有行为。

#### 场景：brainstorm/plan 预警在场

- Given brainstorm（或 plan）变更缺 stage review.json
- When `gate <stage>`（默认档与 --full 档）
- Then stage-review-hint（默认档）/ full-stage-review（--full 档）在场，文案含本 stage 名与 register-stage-review 指引

#### 场景：verify 维持排除

- Given verify 变更
- When gate verify（默认档）
- Then 无 stage-review-hint（既有期望面，回归保持）

### FR-05: handoff 交接块原子转移所有权到新 SESSION_ID（或显式预告首个写操作需 --takeover）；写操作命令支持 --session flag；匿名占位所有权+同主机显式身份自动升级免 --takeover

- ① handoff 交接块**必须**在粘贴块内显式预告：换用新 SILLYSPEC_SESSION_ID 时首个写操作会撞所有权活跃窗——等窗过期或首写带 `--takeover`（既有「SESSION_ID 保持不变」设计不变，原子转移所有权方案弃——见 design 风险节）。② 所有权判定**必须**对「owner 为本机匿名占位（`anon@<本主机名>`）且当前会话身份为显式解析结果（--session/env，非 anon 降级）」自动放行并升级 owner（新 action=takeover-anon-upgrade，调用方既有 setChangeOwner 重写留痕——dsh z1 实证自锁消除）；他人显式持有（活跃窗内）**必须**照旧拦截；跨主机匿名占位**必须**照旧拦截。③ 写操作命令 `--session` flag 已在既有三级解析接线在场（run --done/--reset 等、worktree apply）——回归保持，不重复交付。

#### 场景：匿名自锁消除（dsh z1 实证）

- Given owner=`anon@<本机>` 且活跃窗内
- When 显式身份（env/flag）发起写操作
- Then allowed=true + action=takeover-anon-upgrade，owner 重写为显式身份（无需 --takeover）

#### 场景：他人显式持有仍拦

- Given owner=他人显式身份 且活跃窗内
- When 另一会话写操作
- Then 拒绝（既有行为不变）

#### 场景：跨机匿名仍拦

- Given owner=`anon@<他机>`
- When 本机显式身份写操作
- Then 拒绝（机器级隔离语义保持）

#### 场景：交接块预告

- When buildHandoff 生成交接块
- Then 粘贴块含 --takeover 预告行（换新 SESSION_ID 场景）

### FR-06: worktree gitignore 探测区分探测失败（EPERM 等）与确实未忽略两种文案并内置一次重试

- worktree 创建前的 gitignore 探测（checkWorktreeDirIgnored）**必须**区分三种结局：已忽略（放行）/ 确未忽略（git check-ignore 判定 exit 1——照旧阻断并给 .gitignore 修复指引，行为不变）/ 探测失败（spawn 异常如 EPERM/ENOENT——**必须**立即重试一次；仍失败**必须**按「无法证实未忽略」fail-open 放行创建并打印探测失败警告（含异常码与人工复核命令），**禁止**误报「未被 .gitignore 忽略」阻断创建——dsh z2 实证 27 分钟误排 + 强制提权事故消除）。

#### 场景：探测失败 fail-open

- Given 注入的 git runner 两次抛 EPERM（spawn 失败）
- Then 返回 ignored:null + probeError，创建路径放行并打警告与人工复核命令

#### 场景：真未忽略照旧拦

- Given git 判定未忽略（exit 1）
- Then 照旧阻断（既有行为不变）

#### 场景：重试成功

- Given runner 首次抛 EPERM、第二次成功
- Then 按第二次真实判定

### FR-07: doctor 新增 local.yaml 可解析性检查项；新增 config known-failures add/remove 管理子命令

- ① doctor **必须**新增 local.yaml 完整性检查维度：文件存在但 YAML 解析失败或含 UTF-8 BOM 时**必须**产出 finding 与修复指引（只读，不自动改文件——dsh z2 实证 doctor 对 mojibake local.yaml 完全失明事故消除）。② **必须**新增 `sillyspec config known-failures list|add <key…>|remove <key…>` 子命令：对 local.yaml 的 known_failures 键做行级增删查，**必须**保留文件其余内容与注释（禁止 js-yaml 整体重序列化），写入**必须**原子（tmp+rename）且 UTF-8 无 BOM；local.yaml 解析失败时 add/remove **必须**拒绝执行并给修复指引。

#### 场景：增删查 roundtrip

- Given 带注释与既有键的 local.yaml
- When add 新键 → list → remove 该键
- Then list 先含新键后不含；除 known_failures 段外逐字节保持（注释保留）；文件无 BOM

#### 场景：坏 YAML 拒改

- Given local.yaml 内容非法（mojibake/残缺）
- When config known-failures add
- Then 拒绝执行 + 修复指引；文件未被改动

#### 场景：doctor 发现坏配置

- Given local.yaml 解析失败（或含 BOM）
- When runDoctorDiagnostics
- Then local_yaml_integrity 维度产出 finding + 修复指引

### FR-08: 后台 spec-sync 子进程退出前显式清理句柄，缓解 libuv 退出断言崩溃

- watcher 与 bg-sync 的 detached 子进程 spawn 后，父进程**必须**等待 spawn 事件稳定（子进程 'spawn' 成功或 'error'，上限 150ms 兜底）再继续返回——缓解 Windows 下父进程在子进程 async 句柄建立中途退出触发的 libuv 断言崩溃（dsh z1/z2 各实证一次，成功调用变 exit 1）。该等待**必须**对命令功能零影响（best-effort 缓解，Node 运行时缺陷不强求根除）；已退出/出错的 child **必须**立即返回不等待。

#### 场景：spawn 稳定化

- Given 注入 fake child（EventEmitter，稍后 emit 'spawn'/'error'）
- When awaitSpawnSettled(child, ms)
- Then 'spawn'/'error' 事件即 resolve；两事件均不发时 ms 上限兜底 resolve；已 exitCode 非 null 立即 resolve

### FR-09: 以上各项均有对应测试，变更测试面全绿

- 本变更**必须**为 FR-02..FR-08 的新行为各配测试（新增或扩展既有文件），且变更测试面（新增测试 ∪ 受影响既有回归：gate-stage-review-hint / change-ownership-guards / review-dispatch / sillyhub-mcp-platform-fixes / apply-conflict-hardening 等 FR 关联面）在收口时全绿；FR-01/FR-05③/FR-04 模板部分为回归锚（既有测试保持绿即证据）。

#### 场景：聚合口径

- Given 全部新增/扩展测试落地
- When 收口实测变更测试面
- Then 全绿

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/review-dispatch.test.mjs + test/sillyhub-mcp-platform-fixes.test.mjs「回收链五项能力回归锚——既有用例全绿」
FR-02: test/apply-stash-conflict-scan.test.mjs「恢复后冲突标记扫描命中保留 stash+进 errors；干净恢复行为不变」
FR-03: test/done-heartbeat.test.mjs「慢收口心跳行（stderr）+结束清理；常规路径零输出」
FR-04: test/gate-stage-review-hint.test.mjs「brainstorm/plan 默认档+--full 档 hint 在场且文案按 stage 参数化；verify 维持无 hint」
FR-05: test/change-ownership-guards.test.mjs「匿名同机自动升级/他人显式仍拦/跨机匿名仍拦」+ test/handoff-takeover-hint.test.mjs「交接块含 --takeover 预告行」
FR-06: test/worktree-gitignore-probe.test.mjs「EPERM fail-open+重试；真未忽略照旧拦；重试后按真实判定」
FR-07: test/config-known-failures.test.mjs「增删查 roundtrip+注释保留+坏 YAML 拒改」+ test/doctor-local-yaml.test.mjs「坏 YAML/BOM finding+好文件零 finding」
FR-08: test/spawn-settle.test.mjs「spawn/error 事件即 resolve；上限兜底；已退出立即返回」
FR-09: 不适用：聚合口径——FR-01..08 各自测试绑定即本条证据，收口时 CLI 按变更测试面亲测全绿
