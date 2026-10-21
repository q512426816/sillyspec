---
author: flow-machine-draft
created_at: 2026-10-21T14:15:09.575Z
---
# 设计记录（Design Record）— 2026-10-21-protocol-tax

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

协议税三源：每命令同步轮（消费仓 status 实测 6.3s，71% idle 等平台同步遍历 681 归档 spec 树）、doctor 逐锚点串行 git spawn（本仓实测 41.8s，CPU profile 95% spawnSync：`anchorOk` 逐 SHA `git cat-file -e` + `_branchReviewReferences` 逐引用起进程）、全量模板重放（单次 render 最大 11.8KB，z1 会话 agent 44/48 次把输出重定向进日志只看尾部——规则没送达上下文）。另有往返税：z1 26 轮真实问答 ↔ ~60 次 --wait/--continue 心跳，且 wait/continue 严格交替导致 4 次 exit=1。

方案（用户 2026-10-21 认可的收缩版）：先落观测地基（FR-01 timing 段），再做四个减法——FR-02 重复渲染增量面、FR-03 内建 --out-file/--tail（收编 agent 自发重定向模式并保退出码）、FR-04/05 wait 结构化输出与多答合并+continue 幂等化、FR-06 只读命令去同步、FR-07 doctor 批量化。全部为 CLI 输出层/调用模式/进程组织改造，**不碰状态机推进语义**（gate 判定、完成回滚、worktree 生命周期、spec-sync 写路径语义零变化）。明确不做（用户裁决）：写命令增量同步改造（等 timing 数据再定）、brainstorm 范围膨胀传感器（证据不支持——18.5h 为用户驱动迭代）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- 新环境变量 `DEBUG_SILLYSPEC_TIMING=1`：开启后 run/flow 主命令尾部打 `[timing] sync=…ms gates=…ms render=…ms state-write=…ms`（未触达段 `n/a`）；未设置时零输出变化。
- 新全局 flag：`--out-file <路径>`（全文写文件，stdout 打提示行+尾部行）、`--tail N`（尾部行数，默认 40）；对所有命令可用；退出码与裸跑逐命令一致。
- run 命令新 flag：`--wait --json`（stdout 唯一 JSON 对象：change/stage/step/stepName/question/options[{label,description}]，退出码同文本模式）；`--continue --answers <k=v,…>`（k=步骤名或序号，值含逗号用 `k="v,…"` 引号形态；全键命中才回填，任一 miss 整单拒绝 exit≠0 列出未匹配键）。
- 行为变化点（唯一）：`--continue` 在无 waiting 步骤时从 exit=1 改为幂等 exit=0 + 一行指引（src/run/complete.js 无 waiting 守卫分支）；有 waiting 时语义不变。
- 新模块导出：src/timing.js（timingMark(segment)/emitTimingIfEnabled()）；src/git-helper.js 增 batchCatFileCheck(cwd, shas[]) → Map<sha,boolean>（单次 `git cat-file --batch-check`，stdin 喂 SHA）。
- 输出形态变化：同 (change,stage,step) 重复渲染输出增量面（<60 行，固定模板收敛为 step-guide 锚一行引用；换步/换 change 恢复全量）。渲染台账落 `.sillyspec/.runtime/render-ledger.json`（键=change，值=最近全量渲染的 stage/stepIdx 指纹）。
- 不改：gate 判定逻辑、steps 状态机、review/dispatch 语义、worktree 生命周期、spec-sync 写路径与 bg-sync 预算、docs check 判定。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

   成立。--answers 键值解析先引号感知切分再逐键匹配 waiting 步骤，解析与匹配分离，乱序输入只影响「哪个键命中哪步」，命中集合仍封闭校验；wait --json 与文本模式共用同一 wait 数据源（不新增状态）；timing 段按调用时序记录，乱序只影响展示不影响判定；render 台账指纹=已完成渲染的事实记录，迟到读取只影响「本次是否增量」的选择，两个方向都安全（增量或全量均合法输出）。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

   render-ledger.json 用 writeAtomicSync（tmp+rename 原子替换，同 fs-atomic 既有语义）写、键按 change 隔离；两进程并发渲染同步骤时后写覆盖，最坏退化为下一次多打一次全量渲染（退化方向安全）；--out-file 目标文件为单命令进程私有，无共享写；batchCatFileCheck 只读对象库（stdin 喂 SHA 的 git cat-file --batch-check），无写面；timing 记录器进程内私有。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

   安全。--out-file 在输出收集器 exit 钩子统一落盘：命令被 kill 时文件可能缺失，但 stdout/退出码不受影响（收集失败不改变命令本身的成败）；幂等 --continue 不落任何状态（no-op 纯读）；timing env 未开启时零开销零输出；render 台账写失败按无台账处理（回退全量渲染，fail-open 到现状行为）；批量化失败（batch-check 非零退出）按 safeGit 既有 error 语义回退（视为不可判定，与旧单查失败同路）。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

   不会。render 台账键含 change 名且文件落各仓自己的 .sillyspec/.runtime/ 下，多仓天然隔离；--out-file 路径由调用方给出（相对路径按命令 cwd 解析，同既有 flag 惯例）；batchCatFileCheck 在目标仓 cwd 执行只读该仓对象库；--tail/--out-file 不改同步边界（同步该走的写命令与 bg-sync 照走，只读命令本就不该同步）。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：test/output-step-render.test.mjs 冻结了 outputStep 结构契约（step0 全文 vs step1+ 精简的分叉），增量渲染与之冲突。处置：characterization 口径按「首次渲染」回归（fixture 清掉 render 台账即回到首渲染路径），增量形态另立断言（test/output-repeat-delta.test.mjs），两测试各测一面；增量面保留全部结构标记行（状态行/锚引用行），不删块只缩块。

次风险：--continue 幂等化改变退出码语义，若下游脚本/测试依赖 exit=1 判错。排查：test/ 目录无「没有处于等待状态」断言（已 grep 确认）；错误文案保留为提示行，语义信息不丢。

试过但放弃的方案：① 写命令增量同步（不遍历归档 spec 树）——收益 ~5s/写命令但同步链路改造面大，先靠 FR-01 timing 数据说话（用户裁决 2026-10-21 不做）；② brainstorm 范围膨胀传感器——考古证据显示 18.5h Step5 是用户驱动迭代，传感器会在正常工作上误报，不做；③ doctor 全维度并行化（worker 线程/并行 spawn）——先做批量化（消 70%+21% 热点），并行化留待数据证明仍有残余热点再上，避免一次改两层引入回归。

## 文件变更清单

| 操作 | 路径 | 说明 |
| --- | --- | --- |
| 新增 | src/timing.js | 分段计时记录器：timingMark(segment)/emitTimingIfEnabled()，env 门控零开销 |
| 修改 | src/run/shared.js | triggerSync 段 timing 打点；（FR-06 不在此改——只读命令分流在 index.js 命令层） |
| 修改 | src/run/prompt.js | outputStep 重复渲染增量面 + render 台账读写；render 段 timing 打点 |
| 修改 | src/run/complete.js | waitStep --json；continueStep --answers 多答/无 waiting 幂等 exit 0；gates/state-write 段打点 |
| 修改 | src/run/gates.js | completeStageGates 段 timing 打点（判定逻辑零变化） |
| 修改 | src/index.js | 全局 --out-file/--tail 输出收集器；run 子命令 --json/--answers flag 接线；status/progress show/handoff 只读命令跳过同步 |
| 修改 | src/git-helper.js | 新导出 batchCatFileCheck(cwd, shas)（单次 git cat-file --batch-check） |
| 修改 | src/doctor-diagnostics.js | detectArchiveIntegrity 锚点校验批量化（收集全量 SHA→一次 batch→分发判定；文案零变化） |
| 修改 | src/worktree.js | _branchReviewReferences 批量化（单次 for-each-ref 类枚举） |
| 新增 | test/timing-segments.test.mjs | FR-01 |
| 新增 | test/output-repeat-delta.test.mjs | FR-02 |
| 新增 | test/out-file-tail.test.mjs | FR-03 |
| 新增 | test/wait-json-answers.test.mjs | FR-04 |
| 新增 | test/continue-idempotent.test.mjs | FR-05 |
| 新增 | test/status-nosync.test.mjs | FR-06 |
| 新增 | test/doctor-anchor-batch.test.mjs | FR-07 |
| 修改 | docs/sillyspec/platform-interface-map.md | 本变更 src 插行致 file:line 锚漂 20 处，docs check --fix 重锚（doc-ref-check 复绿） |
| 修改 | docs/sillyspec/architecture-4a.md | 同上（锚漂随动文件） |
| 修改 | docs/sillyspec/file-lifecycle.md | 同上（锚漂随动文件） |
| 修改 | docs/sillyspec/prompt-control-debt.md | 同上（锚漂随动文件） |

并行边界：本变更与 2026-10-21-p0-p1-hardening 同文件交叠（complete.js——彼改动 completeStep 心跳 wrapper、此改 waitStep/continueStep；doctor-diagnostics.js——彼加 local_yaml_integrity 维度、此改 detectArchiveIntegrity；index.js/worktree.js 亦同文件不同函数）。函数级不冲突，git 合并面按行块分离；收口时序本变更排在 p0-p1-hardening 合入之后（若彼先收口），遇冲突以彼为准先合。
