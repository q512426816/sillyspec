---
author: qinyi
created_at: 2026-09-23 10:05:00
scale: large
---
# 设计文档（Design）— 2026-09-23-sentinel-rules

## 背景
watcher（2026-09-22-r7-protocol-surgery 切片一 / D-001）现状：detached 子进程 3s 轮询
三源（change 子树产物签名 / git HEAD / verify-quality-scan stat）→ inferEvents 纯函数
→ watcher-events-<change>.jsonl（恒 provisional:true）+ 平台 events 端点 best-effort
推送。只观测不判定，`--done` 是唯一真相。本变更在其上加 L1 哨兵规则引擎：机械可疑模式
→ advisory warning 事件（人判），并导出 L0 纯函数供下批收口拒收。依据：
round5/flip-3.31.0-proposal.md §九（评审吸收：事件恒 provisional、机制不走劝说）+
§十（落地核对）+ 会话定稿哨兵设计（任务书四规则/事件模型/水位回补/挂点约束）。

## 设计目标
1. 四规则全机械事实、输出恒 advisory（severity=warning + provisional:true），面板
   只展示不判定的原则不变（§九.5）。
2. 真相库隔离：watcher 侧零 progress db 写入（单写者纪律）。
3. 观测旁路 best-effort 语义继承：规则引擎任何异常不影响子进程主循环与协议面。
4. 纯函数化：引擎/回补/L0 断言全部可注入测试，单测零 CLI 依赖。

## 非目标（红线，全程不动）
- 不做 --done 收口接线（FR-07 函数交付即止；接线点在 verify 收口文件，下批）
- 不做 flow pause / 流程阻断（warning 永不阻断）
- 不动既有事件 kind 语义与 jsonl 既有字段（additive only）
- 不动平台端（events 端点契约不变，新字段 additive）
- 不做规则阈值配置面（导出常量，配置化后续按需）
- 不碰并行会话 A 冲突带（command.js 1727/2073 一带）

## 总体方案

### 1. 快照三源扩展（buildSnapshot，additive 字段）
既有快照 `{ts, archived, head, files, scan}` 扩展四字段（全部带注入参数，缺省走真
git/fs，注入时零外部依赖）：
- `commits: [{hash, subject}]` — `git log -20 --format=%h|%s`（`gitLogImpl` 注入）。
  假勾选证据与 test-tamper 提交证据的数据源；新旧提交差集 = `next.commits` 中
  `prev.commits` 不含的 hash（按 hash 判重，防 subject 改写误判）。
- `dirtyCode: string[]` — `git status --porcelain` 归一（复用 shared.js
  parsePorcelainPath 思路：剥引号/反斜杠转正斜杠）后剔除非代码面（`.sillyspec/`、
  `docs/`、`*.md`——同 verify-quality-scan 指纹口径 isNonCodePath），排序去重
  （`porcelainImpl` 注入）。范围漂移与 test-tamper 工作树证据源。
- `scanStatus: {status, ranAt} | null` — verify-quality-scan-<change>.json 内容读取
  （testResult.status ∈ passed/failed/skipped）；既有 `scan`（mtime/size stat）保留
  不动——stat 管"记录变了"事件，status 管规则语义（读取失败 → null，规则 fail-open）。
- `reviews: {<相对 runtime 的 review.json 路径>: mtimeMs}` —
  `.runtime/execute-runs/*/tasks/*/review.json` 有界遍历（`readdirSyncImpl` 注入；
  execute-runs 不存在 → {}）。假勾选的 review.json 证据源。
- `files` 条目扩展 `checkedTasks: ['task-01', ...]` — countCheckboxes 旁加
  extractCheckedTasks（`/- \[[xX]\]\s+(task-\d+)/g`），任务 id 行的翻格归因锚。

### 2. 规则引擎（applySentinelRules，纯函数，内嵌 watcher.js，D-001@v1）
签名：`applySentinelRules({prev, next, baseEvents, state, now = Date.now()})`
→ `{warnings, state}`。`baseEvents` = 本拍 inferEvents 输出（引擎不重复推断基础事件，
只消费）。warning 事件形态（FR-06）：
`{ts, kind:'warning', stage:null, rule, severity:'warning', detail, provisional:true}`。

**R1 fake-check**（证据口径 D-002@v1）：baseEvents 中 kind='task-done' 且文件 checkedTasks 增加时，翻格集
= `next.files[k].checkedTasks` − `prev.files[k].checkedTasks`；对每个翻格 task-NN 查
证据：区间新提交 subject 含 `task-NN`（完整 token 匹配，防 task-01 命中 task-010）或
`reviews` 中路径含 `/tasks/task-NN/` 的条目 mtime 变化。零证据 → warning（detail 列
task-NN 与证据缺失说明）。翻格行无 task id → 不入判集。

**R2 test-tamper**（状态机，state.testTamper）：拍面 `scanStatus.status==='failed'`
且未见同窗 PASS → 记 FAIL 锚（含 **FAIL 时刻测试脏面快照** `testDirtyAtFail`——脏面
是状态不是区间事件，不快照会把窗口前遗留的脏测试文件误记为窗口内改动，Grill 修正①）；
FAIL 锚在场期间：出现 `testDirtyAtFail` 之外的**新增** test/** 脏文件，或区间新提交
触及 test/**（`git log -20 --format=%h|%s --name-only` 单次调用解析出
`commits[].files`，`testTouchedCommits` 由其派生，`gitLogImpl` 同源注入）→ 置
testChanged=true；随后拍面 `status==='passed'` 且 testChanged → warning 并清锚。
FAIL→PASS 无新增测试改动不告警；skipped 不参与；新一轮 FAIL 重置状态机。

**R3 scope-drift**（声明面口径 D-004@v1）：声明面 = 任务卡 allowed_paths（tasks/task-*.md frontmatter
`allowed_paths:` 缩进列表项，容差解析：反引号/尾注剥离）∪ design.md「文件变更清单」
章节条目（`##` 仓段头与 NEW: 前缀剥离，normalizePath 归一）。两源皆空 → 跳过
（fail-open）。`dirtyCode` 逐条与声明面精确相等或 globMatch（复用 change-list.js）；
未命中集合 − state.lastDriftFiles（已告警去重）非空 → warning（detail 列新漂移文件），
state.lastDriftFiles 更新为当前未命中全集。

**R4 stall**（相位锁存 D-003@v1 + episode 去重）：state.phase ∈ early|execute；early→execute
锁存条件：baseEvents 含 kind='task-done'，或（next.files 有 tasks.md 条目且区间有新
提交）。阈值 `STALL_EARLY_MS=20min` / `STALL_EXECUTE_MS=15min`（导出常量）。判定：
`now − state.lastActivityAt > 阈值` 且 `!state.stallOpen` → warning（detail 含相位、
闲置毫秒、阈值），stallOpen=true。任意 baseEvent（非 warning）→ lastActivityAt=now、
stallOpen=false。引擎初态 lastActivityAt=首拍 ts；**重启回补场景取
max(启动时刻, 水位快照 ts)**——水位落后两小时说明 change 早已死透，首拍即应告警而非
再等 20 分钟（Grill 修正②）。

### 3. 水位回补（FR-08，D-005@v1）
- 落盘：子进程每轮 diff 后 `writeFileSync(watcher-last-snapshot-<change>.json,
  JSON.stringify(snap))`（best-effort，失败只 warn；**内容去重**——与内存中上次落盘串
  相同则跳过写，避免 3s 周期空转 IO，Grill 修正③）。
- 回补：runWatcherFromEnv 初始化 prev 时，水位文件存在且可解析 → 用之（否则现行为
  buildSnapshot 首拍）；该 prev 与首拍 diff 产出的事件全部置 `backfill:true`（ts 取
  当前拍——事件时间=观测时间），照常入 jsonl/推送；规则引擎对回补 diff 照常运行。
- 幂等锚：水位随轮前移，同水位重复回补 diff 为空 → 零事件；水位损坏/缺失 → 全新启动
  （零回归）。archived 首拍早退路径不读不写水位（无可观测对象）。

### 4. L0 纯函数（src/sentinel-assertions.js，新文件）
```
detectFakeCheckCompletion({ changeDir, tasksMd, commits, opts = {} })
  → { status: 'complete' | 'fake' | 'none', claimTotal, checked, missing: string[] }
```
- tasksMd 判集：`/^[-*] \[( |x|X)\] (task-\d+)/` 行（id 行才是可验证主张）；无 id 行
  不入判（不可验证不拒收）。
- commits：`string[] | {message|subject}[]` 归一为字符串组；证据 = subject 含完整
  token task-NN，或 `<specBase>/.runtime/execute-runs/*/tasks/<task-NN>/review.json`
  在场（specBase 由 changeDir 上推一级；readdir 探测，opts.listReviewsImpl 可注入；
  探测异常按无 review 证据——commit 证据照常判）。
- 三态：`none` = 判集空或未全勾；`complete` = 全勾且零 missing；`fake` = 全勾且
  missing 非空。纯度=无副作用、输出由参数+只读盘面决定（review 探测只读）。
- 本批不接线：src/sentinel-assertions.js 只被单测消费，收口调用点下批。

### 5. run 族挂点（FR-09，D-006@v1）
现状核对：runCommand 1367 挂点（R7 切片一）在 effectiveChange 解析后、auto 早退
（1342）之后——**`run auto` 是唯一缺口**。挂点：runAutoMode 头部（changeName 回显
之后、循环之前）加与 flow start 同款 best-effort 块：try/catch spawnWatcher(cwd,
changeName, platformOpts)，失败只 warn；changeName 为空（auto 无活跃变更，入口守卫
已拦）不 spawn。位置在 1930 行附近，避开会话 A 的 1727/2073 冲突带；git 冲突时
rebase 以 A 为先、本提交在后。

### 6. 子进程循环接线（runWatcherFromEnv）
主循环内 inferEvents 之后：
```
const { warnings, state: nextState } = applySentinelRules({
  prev, next: snap, baseEvents: events, state: sentinelState, now: Date.now() })
sentinelState = nextState
const batch = [...events, ...warnings]   // 追加/推送同一管线
```
- 空闲自退计时（IDLE_EXIT_MS）与 lastActivityAt 只认 baseEvents——warning 不是活动。
- archived 终态判定仍只看 baseEvents 的 archived 事件。
- 每轮（无论有无事件）水位快照落盘；规则引擎 try/catch 包裹，异常 warn 后继续
  （best-effort 语义，规则引擎绝不杀 watcher）。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/watcher.js | 快照四源扩展（commits/dirtyCode/scanStatus/reviews/checkedTasks）+applySentinelRules 四规则引擎+水位回补+子进程循环接线 |
| 新增 | NEW:src/sentinel-assertions.js | L0 纯函数 detectFakeCheckCompletion（本批只交付函数+单测，收口接线下批） |
| 修改 | src/run/command.js | runAutoMode 头部 spawnWatcher 最小挂点（约 10 行，避开 1727/2073 冲突带） |
| 新增 | NEW:test/sentinel-rules.test.mjs | 四规则正负例+三态+回补幂等+warning 事件形态+token 边界钉 |
| 修改 | .sillyspec/docs/sillyspec/modules/_module-map.yaml | sync 模块 paths 补录 sentinel-assertions.js |

## 接口定义
| 导出 | 签名 | 消费方 |
|---|---|---|
| applySentinelRules | `({prev, next, baseEvents, state, now?}) → {warnings, state}` | 子进程循环 / 单测 |
| createSentinelState | `(ts) → state 初值` | 子进程 / 单测 |
| detectFakeCheckCompletion | `({changeDir, tasksMd, commits, opts?}) → {status, claimTotal, checked, missing}` | 下批收口 / 单测 |
| STALL_EARLY_MS / STALL_EXECUTE_MS | 常量 20min / 15min | 引擎 / 单测 |
| WATCHER_SNAPSHOT_FILENAME | `watcher-last-snapshot-<change>.json` 生成器 | 子进程 / 单测 |

## 风险登记
| 风险 | 缓解 |
|---|---|
| 并行会话 A 改 command.js 冲突 | 挂点避 1727/2073 带；rebase 以 A 为先 |
| watcher.js 体量增长 | 引擎纯函数单段、注入同款；不拆文件（方案 B 否决理由） |
| 假阳性扰民 | 恒 advisory 人判；episode/漂移集合去重；声明面缺失 fail-open 跳过 |
| git 面调用失败（非仓/权限） | 注入 impl 返回 null/[] 时规则 fail-open，快照字段 null 化 |
| 水位文件与 archived 竞态 | archived 首拍早退不读水位；水位读取 try/catch 全新启动 |
| 旧 jsonl 消费者对新字段敏感 | additive 字段（rule/severity/backfill），平台未升级照旧 |

## 自审（Self-Review）
1. **单写者纪律核查**：引擎只 append jsonl + POST；progress db 零引用 ✓。
2. **provisional 纪律核查**：warning 事件恒 provisional:true，kind='warning' 与基础
   事件可区分；平台 ingest 只展示语义不变 ✓。
3. **幂等核查**：回补=水位消费前移，重复执行零事件；规则状态机 FAIL 锚随 PASS 清除、
   stall episode 随活动复位、漂移集合单调去重——无永久粘性状态 ✓。
4. **孤儿风险核查**：新增面全部在既有主循环内，无新计时器/新进程；水位写为
   writeFileSync（非 append）不膨胀；硬寿命帽/心跳租约语义不动 ✓。
5. **注入完整性核查**：gitLogImpl/porcelainImpl/readdirSyncImpl/readFileSyncImpl/
   statSyncImpl 全覆盖新盘面，单测零真 git 依赖（fixture 快照对象直构）✓。
6. **威胁模型核查**：agent 可写 .runtime（账本/水位/review 均可伪造）——与 R7 切片一
   同界：watcher 防的是"偷懒幻觉谎报"不是"主动协同造假"，L0 收口（下批）才是硬门 ✓。

## Design Grill 修正记录（2026-09-23，对抗自审五项全部修正入上文）
①R2 窗口语义：脏面是状态非事件——FAIL 锚必须快照 `testDirtyAtFail`，只认窗口内
**新增**测试改动，否则 FAIL 前遗留脏文件全误报（已改 R2）。
②R4 重启盲区：stall 计时锚取 max(启动时刻, 水位 ts)——水位落后即 change 早已停滞，
首拍就应告警（已改 R4）。
③水位写节流：每轮无条件 writeFileSync 是 3s 空转 IO——内容比对去重后再写（已改 §3）。
④git 调用合并：commits 的 hash/subject 与 test 触及面合并为单次
`git log -20 --format=%h|%s --name-only`，轮询新增 git 调用从 3 降到 2（log + status）。
⑤token 边界：task-01 不得误证 task-010——subject 匹配用负向前瞻 `task-01(?!\d)`
（R1/L0 同口径，测试有钉）。
另核：无 id 勾选行不入判集（R1 与 L0 一致——不可归因不告警、不可验证不拒收）；
backfill 事件恒 provisional:true（观测语义不因回补改变）。

## 生命周期契约表
| 工件 | 产生 | 消费 | 清理 |
|---|---|---|---|
| watcher-events-<change>.jsonl | 子进程（含 warning） | 面板/审计 | 既有归档 prune |
| watcher-last-snapshot-<change>.json | 子进程每轮 | 重启回补 | 归档 prune（同 events） |
| sentinel-assertions.js | 本批 | 下批收口 | — |

## 数据模型
- 快照（扩展后）：`{ts, archived, head, commits[], dirtyCode[], scan, scanStatus,
  reviews{}, files{<name>:{hash,stage,checked,total,checkedTasks[]}}}`
- 引擎状态：`{phase, lastActivityAt, stallOpen, lastDriftFiles[], testTamper:
  {failAt, testChanged}|null}`，JSON 可序列化（进程内即可，不落盘）。
- warning 事件：`{ts, kind:'warning', stage:null, rule, severity:'warning', detail,
  provisional:true[, backfill:true]}`。

## 兼容策略（brownfield 必填）
- 旧水位文件不存在 → 全新启动（现行为）；旧快照无新字段 → 引擎按空集/null 处理
  （字段缺省容错，规则 fail-open）。
- 既有 594 套件零改动；watcher.test.mjs 不动（零回归验收钉）。
- 平台 events 端点契约不变；SILLYSPEC_WATCHER=0 / SILLYSPEC_WATCHER_PUSH=0 /
  NODE_TEST_CONTEXT 护栏语义全部继承。

## 性能与安全
- 每轮新增 4 个廉价调用（log -20 / status / execute-runs 遍历 / 小 json 读），Windows
  git 调用 ~10ms 级，3s 周期无感。
- 无新端口/无新凭据；平台推送凭据读取复用既有 readWatcherPushConfig。

## 测试与验收（分层）
- 单测（test/sentinel-rules.test.mjs，纯函数 fixture）：四规则各 ≥1 正 ≥1 负；R1
  commit 证据负例 + review 证据负例 + token 完整性（task-01 不误证 task-010）；R2
  三拍序列正例 + 无测试改动负例 + src-only 改动负例；R3 声明外漂移正例 + 面内负例 +
  无声明面跳过负例 + 去重；R4 early 21min 正例 / 19min 负例、execute 16min 正例 /
  14min 负例、episode 去重、活动复位；三态 complete/fake/none + 无 id 行不入判；
  回补幂等（同水位二次零事件）+ 水位缺失全新启动；warning 事件形态（rule/severity/
  provisional）。
- 既有面：watcher.test.mjs 零回归；全量 npm test 绿；npm run lint 绿。
- module-map：sentinel-assertions.js 入 sync 模块 paths。

## 依据链
- round5/flip-3.31.0-proposal.md §九.5（事件恒 provisional，平台只展示不判定）、
  §十（落地核对与门分层）、设计原则（守卫是验收侧机制不是生成侧劝说）
- 任务书（会话定稿哨兵设计）：四规则/事件模型/L0 通道/水位回补/挂点约束与并行协调
- src/watcher.js 既有架构（快照 diff→纯函数推断→jsonl+推送，注入测试模式）
- src/change-list.js normalizePath/globMatch（声明面容差匹配复用）
- src/run/verify-quality-scan.js isNonCodePath 口径（代码面剔除复用）
- knowledge：孤儿 watcher 三闸（新增面不引入新孤儿路径）
