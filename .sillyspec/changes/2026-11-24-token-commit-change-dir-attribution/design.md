---
author: flow-machine-draft
created_at: 2026-11-24T04:28:30.659Z
---
# 设计记录（Design Record）— 2026-11-24-token-commit-change-dir-attribution

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

现行规则（2026-11-08-bare-commit-attribution-narrow、2026-11-13-flow-done-patch-refreeze-skip-on-rework）把「标题含 task-NN token、未提变更名」的提交一律算作当前变更的提交——`src/flow-parity.js` 的 `detectPatchDrift` / `deliveryFaceAnchoredAfter` 用 `/task-\d+/` 分支，`src/foreign-declared.js` 的 `buildCommitAttribution` 打 `tokened` 标记、`isForeignByCommit` 对 `tokened` 恒判 own。决策 D-core-engine-049 当时的理由是「token 无变更名限定，区分不了是谁的 task」，取舍为保守 own。该前提在共享仓多会话并行下失效：每个会话都按 task token 约定提交，于是别人的提交全被算到当前变更头上——multi-agent-platform 仓 2026-11-24 实证：冻结补丁由 7 文件膨胀到 34 文件（仅 3 个属于该变更），已通过的评审被隔离作废，每次重跑再触发。

本变更在「分不清」里分出一类分得清的：实证中 5 笔被误判的提交全部触及了各自变更的目录（`.sillyspec/changes/<其变更名>/…`）。这不是巧合——task tick 给出的提交指引把该变更的 tasks.md 与 task-ticks.jsonl 侧车随交付同一提交入库，所以一笔任务提交触及哪个变更的目录，就是它属于哪个变更的提交事实。新规则：无名 task 提交按其触及的变更目录归属——触及了他变更目录且不含本变更，则不是本变更的；什么变更目录都没触及，仍然分不清，维持保守 own（2026-11-13 坑的返工提交形态由其回归 test ⑦ 守护，不得回归）。判定收敛为单一纯函数，提交级（漂移检测）与文件级（归属切分、冻结面过滤、hunk 归属）共用，防两处口径再漂。

调研中还发现同一处的第二个侧面：漂移检测的条件是「提本变更名 或 含 task token」，没有「标题未提任何变更名」这个前提——一笔标题明确写着别的变更名、又带 task token 的提交，也会被算到当前变更头上。文件级的 `buildCommitAttribution` 没有这个问题（只对无名提交看 token）。其表现是既有用例 test/thin-done-dirty-gate.test.mjs「FR-01 detectPatchDrift：全角括号交付提交判 drifted」自 2026-11-13 起在主干上即红（本变更动码前核对：四个相关测试文件 19 例，18 过 1 败）。新判定函数先看标题提没提变更名（提了按名字定），没提才看 token，该侧面随之一并修正。

「分不清」这一类的实测规模比预想大（见风险节）：平台仓另一个变更收口时，窗口内 17 笔无名 task 提交既不写变更名也不触及变更目录，冻结补丁 45 文件中只有 12 个属于该变更。用户据此选定追加作者身份补判（FR-07）：这些提交的作者全部不是该变更自身提交的作者。做法是在「分不清」这一格内再看一层提交事实——先从窗口内「标题提及本变更名」或「触及本变更目录的 task 提交」算出本变更作者集，无名 task 提交的作者不在集合内（且集合非空）即判他侧。它只作用于已经分不清的提交，不触碰具名提交与触及变更目录的提交；本变更没有任何自身提交时无从比较，维持保守。被排除的提交在收口提示里点名，漏判可见。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `src/foreign-declared.js` 新增导出：`isOwnCommitForChange({ subject, files }, changeName, changesDirPrefix)`（提交级归属单一源）、`touchedChangeDirs(files, changesDirPrefix)`（文件面触及的变更名集合）、`changesDirPrefixFor(cwd, specBase)`（变更根在仓内的相对前缀；不可得返回空串）。
- `buildCommitAttribution(logText, opts = {})` 新增可选第二参 `{ changesDirPrefix }`；文件 entry 新增 `tokenDirs: Set<string>` 与 `tokenAmbiguous: boolean`，既有 `owners / unknown / tokened` 不变。
- `isForeignByCommit(entry, currentChangeName)`：entry 带新字段时按新规则；entry 无新字段（旧调用方或手工构造）时行为不变。
- `commitAttributionForChange(cwd, specBase, currentChangeName, baselineCommit)`：签名不变，内部把变更根前缀传入 `buildCommitAttribution`。
- `detectPatchDrift`、`deliveryFaceAnchoredAfter`（`src/flow-parity.js`）：新增可选入参 `changesDirPrefix`（缺省 `.sillyspec/changes/`，空串表示禁用目录归属），返回形状不变。
- `cmdFlowDone`（`src/flow.js`）：两处调用传入变更根前缀。CLI 命令与落盘文件格式无变化。
- `src/task-tick.js` 勾选成功后回显的提交命令模板由 `(<task-NN>)` 改为 `(<变更名> <task-NN>)`——这是 CLI 输出文案的唯一变化；`git add` 清单、下一任务提示、未入库提醒与幂等分支不变。模板形态与 `parseChangeNamesFromSubject` 的括号解析同形（括号内以日期前缀变更名开头、名字后允许附注），照抄即得具名提交。
- FR-06（用户在执行断点选定「加一条提示」）：`src/foreign-declared.js` 新增导出 `listAmbiguousTokenCommits({ cwd, sinceRef, changesDirPrefix })`（窗口内「无名、带 task token、不触及任何变更目录」的提交清单，git 失败返回 null）；`cmdFlowDone` 在 patch 子步冻结面算出后、漂移检测触发时各打一条 `[归属分不清·advisory]`。纯提示：不参与任何判定、不改变评审隔离与归档结果、不阻断收口。
- FR-07（用户在平台仓变更收口受阻后选定「先加作者判定再收口」）：`src/foreign-declared.js` 新增导出 `COMMIT_LOG_ARGS`（含作者的 git log 参数：sha、作者名、邮箱、标题、文件面）、`parseCommitLog(logText)`、`isOwnByFacts({ subject, files }, changeName, changesDirPrefix)`（目录规则层，三值：own / 非 own / 分不清）、`collectOwnAuthors(commits, changeName, changesDirPrefix)`。`isOwnCommitForChange` 增可选入参 `author` 与 `ownAuthors`，在「分不清」一格内做作者补判；`buildCommitAttribution` 的 opts 增 `changeName`（提供时按该变更的作者集补判，文件 entry 增 `tokenAmbiguousForeign`）；`detectPatchDrift`、`deliveryFaceAnchoredAfter`、`listAmbiguousTokenCommits` 增可选入参 `ownAuthors`（未提供时行为与 FR-03 一致）。`cmdFlowDone` 按 baseline..HEAD 计算一次作者集并传入上述各处；提示增加「作者与本变更自身提交不同，已按他侧处理」一行。作者身份取 `姓名 <邮箱>`。
- 对现行规则的影响：收窄 FR-core-engine-275 与 D-core-engine-049 的「他侧 token 提交保守 own」——有变更目录这一提交事实时不再保守；无提交事实时维持。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

   判定只读 git log 里的既成提交，归属按单笔提交自身的文件面判定，与窗口内提交的先后、到达顺序无关。他侧提交在重跑之前落地即被识别；在重跑之后落地则由下一次重跑识别——评审是否保留另有锚定与治理面等价两条路径，与本判定正交，不因迟到提交误隔离。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

   新增逻辑为纯函数，无共享状态；flow done 调用点只多一次 git log 读取与路径计算，无新增写面。共享仓他会话的提交只被读取，不被改写。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

   变更归档后目录移入 archive/——`archive/<变更名>/…` 同样计入该变更名的触及面，带 task token 的归档提交不会落到别的变更头上。变更根不可得（spec 目录在仓外、跨盘符、非 git 仓）时前缀为空串，目录归属禁用，退化为现行保守行为且不抛错。FR-07 的作者集只在一次 flow done 内按窗口现算，不落盘、不跨次复用；变更中途换了 git 身份提交且标题不带变更名、提交又不触及变更目录时，该提交会被判他侧——这是 FR-07 披露的取舍（见风险节），由提示点名兜底。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

   规则不含项目名、语言或仓库名（规则 00）；变更根取自 specBase 而非写死 `.sillyspec`。跨仓（register-repo 登记的外部仓）的提交本就不在扫描面，行为不变。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：本变更自己的无名 task 提交若只触及了别的变更目录（同一会话代提交他变更的治理件且标题未带本变更名），会被判为他侧而不触发重冻结。补救通道现成：提交标题带上变更名即无歧义，收口的「提交面夹带嫌疑」advisory 也仍会点名。

次风险：他侧提交若既不提变更名、也不触及任何变更目录，仍然分不清，维持保守 own——补丁仍可能夹带、漂移仍可能误触发。这是现行行为的保留面，本变更不消除。实测其规模（multi-agent-platform 仓最近 300 笔提交，2026-11-24）：标题带变更名 101 笔；只带 task token 的 59 笔中，30 笔同时提交其变更目录（本变更可分清），29 笔不触及任何变更目录（仍分不清，约占一半）。落地验证：原事故 5 笔误判提交全部转为他侧；冻结点之后新落的 16 笔里有 1 笔（标题只带 task-01、未同提交其变更目录）仍被保守判为本变更。用「他变更的声明清单」判定这类提交可解该例，但与决策 2026-09-25-sentinel-evidence-freeze（提交面不按他侧声明切分——我提交的就是我的，陈旧声明抢不走）相抵，本变更不采用。针对其来源，本变更同时让 task tick 回显的提交命令模板带上变更名（用户在批准断点选定）：此后照抄模板的提交按名字归属，保留面只余手写标题且不碰变更目录的提交。quick 变更名（`quick-xxxxxxxx`）不符合变更名解析的日期前缀模式——模板照常带名，归属仍走 task token 路径，不劣化。

FR-07 的取舍（用户选定）：本变更自己的提交若换了 git 身份（跨会话交接、人或工具用另一身份提交），且标题不带变更名、提交又不触及变更目录，会被作者补判排除——该提交不触发重冻结、其文件不进冻结面。成立条件三者同时满足才发生；提交照 task tick 模板带上变更名即免疫。失败形态是静默漏收，故排除的提交必须在收口提示里点名。平台仓实测该取舍的收益：一个变更窗口内 17 笔他侧「分不清」提交（作者为 `agent <agent@sillyhub>` 4 笔、另一位开发者 13 笔）全部可判他侧，冻结补丁由 45 文件回到约 12 个交付文件加文档。

放弃方案：

- 「无名 task 提交必须触及本变更目录或 design 声明面才算 own」——会让 2026-11-13 坑回归：返工提交常态只带 task token、只触及源文件，test ⑦ 即其守护。且「按声明清单归属」触碰否决决策 sentinel-evidence-freeze⑤ 的禁区（陈旧声明抢已提交文件）。
- 「按 task 编号与本变更任务清单比对」——task-01/02 在各变更间普遍重合，返工提交的编号也不固定，区分不了。
- 「无条件按作者归属」（首轮放弃）——同一变更的提交作者不保证唯一（跨会话交接、人与工具混用身份），作为通用归属依据不可靠。FR-07 把它降为「分不清」一格内的补判：只在窗口内已有本变更自身提交、且待判提交的作者与之不同时才排除，其余一律保守。
- 「用他变更的声明清单判定分不清的提交」——与决策 2026-09-25-sentinel-evidence-freeze 相抵（提交面不按他侧声明切分），且变更归档后声明不可见。
- 「硬性要求所有提交标题带变更名」——波及全部仓的提交约定与哨兵证据协议，是更大的设计；本变更先在不改协议的前提下，用已有的提交事实收窄。

## 文件变更清单

| 操作 | 路径 | 说明 |
| --- | --- | --- |
| 修改 | src/foreign-declared.js | 新增 isOwnCommitForChange / touchedChangeDirs / changesDirPrefixFor；buildCommitAttribution 增 tokenDirs 与 tokenAmbiguous；isForeignByCommit 收窄；commitAttributionForChange 传入变更根前缀 |
| 修改 | src/flow-parity.js | detectPatchDrift 与 deliveryFaceAnchoredAfter 改用 isOwnCommitForChange，新增可选入参 changesDirPrefix |
| 修改 | src/flow.js | cmdFlowDone 两处调用传入变更根前缀 |
| 修改 | test/commit-attribution-split.test.mjs | 新增 ④（纯函数归属）⑤（变更根前缀解析）⑥（并行会话集成） |
| 修改 | test/flowdone-disposition-drift.test.mjs | 新增 ⑧（提交级漂移）⑨（flow done 端到端） |
| 修改 | src/task-tick.js | 勾选回显的提交命令模板带上变更名 |
| 修改 | test/task-tick.test.mjs | ⑧ 的模板断言按新形态更新，并补「模板可解析出变更名」断言 |
| 修改 | src/foreign-declared.js（FR-06） | 新增 listAmbiguousTokenCommits |
| 修改 | src/flow.js（FR-06） | patch 子步与漂移分支各打一条「归属分不清」advisory |
| 修改 | test/flowdone-disposition-drift.test.mjs（FR-06） | 新增 ⑩（分不清形态：漂移照旧并点名提示） |
| 修改 | test/commit-attribution-split.test.mjs（FR-06） | 新增 ⑦（listAmbiguousTokenCommits 纯函数面） |
| 修改 | src/foreign-declared.js（FR-07） | 新增 COMMIT_LOG_ARGS / parseCommitLog / isOwnByFacts / collectOwnAuthors；isOwnCommitForChange 增 author 与 ownAuthors 入参；buildCommitAttribution 增 changeName 选项与 tokenAmbiguousForeign；listAmbiguousTokenCommits 增 ownAuthors 入参与 byAuthorExcluded 标记 |
| 修改 | src/flow-parity.js（FR-07） | detectPatchDrift 与 deliveryFaceAnchoredAfter 改用含作者的 git log 与 parseCommitLog，增可选入参 ownAuthors |
| 修改 | src/flow.js（FR-07） | cmdFlowDone 按 baseline..HEAD 计算本变更作者集并传入漂移检测、交付面锚定与两处提示；提示增加「已按他侧处理」一行 |
| 修改 | test/flowdone-disposition-drift.test.mjs（FR-07） | 新增 ⑪（提交级作者补判三形态）⑫（端到端：他作者分不清提交不漂移） |
| 修改 | test/commit-attribution-split.test.mjs（FR-07） | 新增 ⑧（文件级作者补判） |
