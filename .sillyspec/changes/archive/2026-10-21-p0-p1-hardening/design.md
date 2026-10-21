---
author: flow-machine-draft
created_at: 2026-10-21T13:38:03.403Z
---
# 设计记录（Design Record）— 2026-10-21-p0-p1-hardening

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

两个 dsh 会话导出（2026-10-20-session-page-dsh-alignment 变更的 z1 brainstorm/plan 会话与 z2 execute/verify 会话）经六路子代理考古定位的 sillyspec 工具自身 P0/P1 缺陷修复。动手前核码发现两项已落地：P0-1 review-dispatch 回收链五项能力已由 2026-10-21-review-dispatch-answer-salvage 全量交付（client answer 透传/三通道提取/终态原文落盘/两步出口文案/任务书兜底指引），可粘贴评审任务书已由 2026-10-12-thick-taskbook-cli 的 renderStageReviewerTaskbook 交付——两者按回归锚处理，不重复实现。

其余修复全部走最小侵入单点：恢复步冲突标记机械扫描收口在 restoreMainStash（唯一标记泄漏矢量——三方合并助手用 merge-file -p stdout 模式不落盘标记，已核）；--done 心跳是 completeStep/completeStepBurst 外层薄 wrapper（原函数体改名内层，零重排）；gate 预警面扩面是 machine-interface.js 两处 stage 条件从 execute 单值改三值集合+文案参数化（与 gates.js Stage Review Gate 拦截面逐字对齐，verify 维持既有排除）；匿名自锁消除是 assertChangeOwnership 单分支（调用方既有 setChangeOwner 接线零改动即消费新 action）；交接块补一行 --takeover 预告；gitignore 探测改三态分流+一次重试+fail-open；doctor 加 local.yaml 完整性维度、config 加 known-failures 行级手术子命令（保注释）；detached spawn 后 bounded 等待稳定化缓解 libuv 退出断言。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `applyWorktree` 结果对象新增可选字段 `conflictMarkerFiles: string[]`（恢复步扫描命中时非空，伴随 errors——最终 exit 非零走既有 errors 通道）；模块私有 `restoreMainStash` 导出供测试，签名 `(projectRoot, { sha, marker }) → { conflictFiles: string[] }`；新增导出 `scanConflictMarkers(projectRoot, files) → string[]`。
- `assertChangeOwnership` 返回的 action 枚举新增 `'takeover-anon-upgrade'`（allowed:true 同族，调用方 setChangeOwner 重写 owner 留痕——run/command.js 既有接线零改动消费）。
- `checkWorktreeDirIgnored(cwd, runner?)` 返回形态变为 `{ ignored: boolean|null, path, probeError?, retried? }`：`ignored:null` = 探测失败（调用方 fail-open 放行+警告）；runner 可注入供测试。
- `completeStep`/`completeStepBurst` 对外签名不变（内部 wrapper 化）；新增导出 `withDoneHeartbeat(label, fn)`（测试用；心跳走 stderr，防污染 stdout 的 --json 输出）。
- machine-interface：默认档 `stage-review-hint` 与 `--full` 档 `full-stage-review` 适用 stage 集合扩为 `['brainstorm','plan','execute']`（verify 维持排除）；提示文案按 stage 参数化。
- CLI 新增子命令 `sillyspec config known-failures list|add <key…>|remove <key…>`（新模块 src/config-known-failures.js，导出 listKnownFailures/addKnownFailures/removeKnownFailures；行级手术保注释，writeAtomicSync 原子写，UTF-8 无 BOM）。
- doctor 诊断新增维度 `local_yaml_integrity`（findings + safe_actions，只读不修；坏 YAML 与 BOM 各自 finding）。
- 新增 src/spawn-settle.js 导出 `awaitSpawnSettled(child, timeoutMs=150)`；src/watcher.js 与 src/run/bg-sync.js 的 detached spawn 后消费。
- handoff 交接块粘贴段新增一行注释：换新 SESSION_ID 时首个写操作需 --takeover（或等活跃窗）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

   成立。冲突标记扫描在 restoreMainStash 尾部单点执行（applyWorktree 的 finally 全覆盖既有语义保持——中途 return/异常路径恢复照跑，扫描随恢复走）；gitignore 探测重试仅一次、以最后一次结果为准；心跳 wrapper 对 completeStep 任意 return/throw 均在 finally clearInterval；awaitSpawnSettled 对已退出 child（exitCode 非 null）立即返回不等待。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

   known-failures 行级改写用 writeAtomicSync（tmp+rename 整文件原子替换）——与 local.yaml 其他写者（platform connect 等）既有共同语义，并发窗口后写覆盖先写，不新增风险；anon 升级分支维持「判定与写分离」既有契约（调用方锁内先判后写）；restoreMainStash 扫描只读；探测失败 fail-open 不落任何状态。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

   安全。恢复步检出标记时 stash 条目必保留（SHA 兜底既有语义），中断后可人工 `git stash apply` 重放；心跳 interval unref + finally clear，命令中断不残留定时器；known-failures 改写失败时原文件不被破坏（tmp+rename）；探测失败重试不产生副作用（check-ignore 只读）。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

   不会。冲突标记扫描限定 stash 面文件（`git stash show --name-only stash@{0}`），不扫全仓（文档中示例标记、行中缩进不触发——行首三形态锚定）；known-failures 命令只碰 `cwd/.sillyspec/local.yaml`；anon 升级仅同主机（hostname() 逐字比对 owner 的 @ 后缀），跨机不适用；spawn-settle 只影响父进程返回/退出时序，不改子进程行为；心跳行走 stderr 不进 stdout envelope。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：① 心跳行污染机器可读输出——若走 stdout，`--json` 消费方 JSON.parse(stdout) 会炸；定案走 stderr（console.error），人类/agent 均可见且 stdout envelope 纯净（pwsh 下 stderr 偶发 NativeCommandError 包装是既有环境噪声，心跳仅 >60s 慢路径出现，可接受）。② 冲突标记正则误报（把文档示例当标记）——限定 stash 面文件集 + 行首 `<{7} `/`={7}$`/`>{7} ` 三形态锚定，误报面收敛到「stash 恢复刚触碰的文件自身含行首标记」，即使误报也只是一次可人工解除的 apply 失败，fail-closed 方向安全。③ anon 自动升级被滥用冒充接管——升级仅限「匿名占位（机器级标识）→ 同主机显式身份」，匿名占位本就只拦他机（R-01 明示局限），升级不弱于既有隔离强度；他人显式/跨机持有不受影响。

试过放弃：① libuv 退出断言崩溃根修——Node on Windows 运行时缺陷（async 句柄关闭竞态），应用层无法根除，降级为 spawn-settle bounded 等待缓解（句柄建立完成后再放行父进程退出）；② known_failures 用 js-yaml 整体重序列化——丢注释，用户文档性受损，放弃，改定向行级手术；③ handoff 原子转移所有权到新 SESSION_ID——与既有「SESSION_ID 是所有权标识非会话实例，交接要求保持不变」设计冲突（handoff.js 头注释与 stage-session ledger 契约），且换 ID 本就是偏离交接块指引的操作，定案为粘贴块内显式预告 --takeover 出路；④ `--continue` 幂等化等 P2 项——不在本变更 P0/P1 范围，未纳入。

## 文件变更清单

| 操作 | 路径 | 说明 |
| --- | --- | --- |
| 修改 | src/progress/change-registry.js | assertChangeOwnership 匿名同机自动升级分支（action=takeover-anon-upgrade） |
| 修改 | src/handoff.js | 交接块粘贴段 --takeover 预告行 |
| 修改 | src/machine-interface.js | stage-review 预警面扩 brainstorm/plan（默认档+--full 档）+ 文案按 stage 参数化 |
| 修改 | src/worktree.js | checkWorktreeDirIgnored 三态分流+一次重试+探测失败 fail-open |
| 修改 | src/worktree-apply.js | restoreMainStash 冲突标记扫描+导出；applyWorktree finally 传导 conflictMarkerFiles 进 errors |
| 修改 | src/run/complete.js | completeStep/completeStepBurst 心跳 wrapper（内层改名，导出 withDoneHeartbeat） |
| 修改 | src/doctor-diagnostics.js | local_yaml_integrity 维度（坏 YAML/BOM finding，只读） |
| 新增 | src/config-known-failures.js | known-failures 行级增删查（保注释，原子写） |
| 修改 | src/index.js | config known-failures 子命令接线 |
| 新增 | src/spawn-settle.js | awaitSpawnSettled(child, ms) detached spawn 稳定化 util |
| 修改 | src/watcher.js | spawn 后 awaitSpawnSettled |
| 修改 | src/run/bg-sync.js | spawn 后 awaitSpawnSettled |
| 修改 | test/gate-stage-review-hint.test.mjs | brainstorm/plan 覆盖用例（默认档+--full 档） |
| 修改 | test/change-ownership-guards.test.mjs | 匿名升级/跨机仍拦用例 |
| 新增 | test/apply-stash-conflict-scan.test.mjs | 恢复步冲突标记扫描 |
| 新增 | test/worktree-gitignore-probe.test.mjs | 探测三态+重试 |
| 新增 | test/config-known-failures.test.mjs | 增删查 roundtrip+注释保留+坏 YAML 拒改 |
| 新增 | test/doctor-local-yaml.test.mjs | 坏 YAML/BOM finding+好文件零 finding |
| 新增 | test/done-heartbeat.test.mjs | 心跳 wrapper 行为 |
| 新增 | test/spawn-settle.test.mjs | spawn 稳定化 util |
| 新增 | test/handoff-takeover-hint.test.mjs | 交接块预告行 |
| 修改 | docs/sillyspec/platform-interface-map.md | 行号锚自动重锚（本变更 src 插行致 7 处漂移，docs check --fix） |
| 修改 | docs/sillyspec/architecture-4a.md | 既有漂移行号锚顺带重锚（--fix 全文档面扫描，修正为当前源码真实行号） |
| 修改 | docs/sillyspec/file-lifecycle.md | 既有漂移行号锚顺带重锚（同上） |
| 修改 | docs/sillyspec/prompt-control-debt.md | 既有漂移行号锚顺带重锚（同上） |
| 修改 | docs/sillyspec/review-2026-08-20-full-audit.md | 既有漂移行号锚顺带重锚（同上） |
