# R7 测试环境说明书（sillyspec 2-调用协议 · watcher · 机器起草 · 编辑距离路由）

> 环境组成：`sillyspec-r7.cmd`（wrapper，直跑主仓检出——**不动全局 3.29.6，不影响并行会话**）
> + `demo-project/`（ESM 小项目：lib/calc.js + test.js，测试命令 `node test.js`，已基线提交）。
> 全部命令在 `demo-project/` 目录内执行；Git Bash 里用 `cmd //c ..\sillyspec-r7.cmd ...` 或直接
> `node C:\Users\qinyi\IdeaProjects\sillyspec\src\index.js ...`。

## 场景 A · 薄跑道 happy path（协议必需调用=2）

```
..\sillyspec-r7.cmd flow start --change my-first-thin --input "给 calc 加乘法。成功标准：
- mul(2,3)=6 有测试
- 既有 add 测试不回归"
```
看点：输出「协议调用 1/2」+材料路径清单；`.sillyspec/changes/my-first-thin/` 自动落
proposal/requirements/tasks 三件**机器稿**（MACHINE-DRAFT sha256 指纹标记+`<!--AGENT:槽-->`）
+flow-state.yaml；watcher 同步拉起。

干活（正常开发）：改 `lib/calc.js` 加 `export function mul(a,b){return a*b}`、test.js 补
`assert.equal(mul(2,3),6)`，然后 **git add -A && git commit -m "feat: mul"**（先提交——
门禁快照以 HEAD+会话文件为基，含新文件的未提交态在快照内可能缺 package.json 类配置）。

```
..\sillyspec-r7.cmd flow done --change my-first-thin
```
看点：六子步逐个 done、测试门真跑 `node test.js`、末行「flow done 完成（2/2 协议调用收口）」
exit 0；change 目录移入 `changes/archive/`。**全程只有这 2 次协议调用。**

## 场景 B · watcher 观测（事件与协议解耦）

另开一个终端：
```
powershell -NoProfile -Command "Get-Content -Wait .sillyspec\.runtime\watcher-events-my-first-thin.jsonl"
```
事件三类源：产物签名（proposal.md 出现/变更、任务卡 checkbox 翻格）/git 提交（HEAD 前进）/
工件（质量扫描记录、archived 终态）。每行恒带 `"provisional":true`——平台只展示不判定。
墙钟拆账：`.sillyspec/.runtime/watcher-stage-timing-my-first-thin.json`。
已知边界：flow done 的 events 收口行读文件时 watcher 可能差一拍（3s 轮询）——收口显示
「无事件文件」但事后文件在，属观测旁路 best-effort 语义。

## 场景 C · 机器稿篡改拒收（验收侧守卫）

新开 change 后，直接编辑 proposal.md 里机器段正文（改「任务原话转写」几个字）→
`flow done` → **三态拒收**：内容哈希失配 exit 1（不归档）。删掉整段 MACHINE-DRAFT 标记再试
→ 标记缺失拒收。AGENT 槽（`<!--AGENT:槽N` 注释行下方）随便写 → 放行。

## 场景 D · amend 留痕通道 + 编辑距离路由

改机器段正文后不走 flow done，走：
```
..\sillyspec-r7.cmd flow amend-draft --change X
```
看点：重锚+ledger amendment 审计+**editRatio**（首版原文为基准，改写过半 → `route_hint: thick`
提示——advisory 定案：测绿仍可薄过）。之后 `flow done` 正常收口，末尾醒目打印 route_hint，
遥测落 `.sillyspec/.runtime/flow-telemetry.jsonl`（protocolCalls=2/editRatio/routeHint）。

## 场景 E · 失败升厚 + 断点重入（fail-closed 三句）

把 test.js 改坏（如断言 add(1,2)=4）→ `flow done`：
- 实测失败=**整单 FAIL exit≠0**，不继续 distill/归档
- 自动升厚 `tier: thick` + upgrade_reason 落 flow-state（born_face=thin 保归档不死锁）
- 修好 test.js 再跑同一条 `flow done` → 已完成子步 `artifacts(skip)` 幂等跳过，断点续到归档

## 场景 F · legacy 一行回滚

`.sillyspec/local.yaml` 末尾加：
```
flow:
  mode: legacy
```
`flow start` → 拒跑 exit 2 指路 `run <stage>`（既有全流程逐字不动）；删掉这三行即回 thin。

## 场景 G · 恢复简报

干活干一半（有 dirty 文件未提交）时再跑 `flow start --change X` → 输出恢复简报：
任务勾选/提交数/dirty 数/P2 记录/六子步标记 → 做到哪、剩什么、下一步。

## 速查

| 目的 | 命令/文件 |
|---|---|
| 事件流 | `.sillyspec/.runtime/watcher-events-<change>.jsonl` |
| 墙钟拆账 | `.sillyspec/.runtime/watcher-stage-timing-<change>.json` |
| watcher 日志/锁 | `.sillyspec/.runtime/watcher.log` / `watcher.lock`（心跳租约 30s） |
| 机器稿台账 | `.sillyspec/.runtime/draft-ledger-<change>.json`（首版原文永存） |
| 协议遥测 | `.sillyspec/.runtime/flow-telemetry.jsonl` |
| flow 状态 | `.sillyspec/changes/<X>/flow-state.yaml`（tier/born_face/baseline_commit/子步标记） |
| 关 watcher | env `SILLYSPEC_WATCHER=0`（测试自救阀；自灭三闸：归档即退/git 仓蒸发退/12h 硬帽） |
| 重置 demo | `git reset --hard 7cc3615 && rm -rf .sillyspec/.runtime .sillyspec/changes` |

显式档：`flow start --thick`（起始即厚档）/ `--with-tasks`（薄协议+生成任务卡，中间自愿
task done，收尾仍 flow done）。混跑回退：thin change 上跑 `run <stage>` → flow-state 落
legacy_fallback，flow done 拒裁并指路厚档。
