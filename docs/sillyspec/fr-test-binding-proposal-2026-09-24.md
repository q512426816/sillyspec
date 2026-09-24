---
author: qinyi / cursor-agent
created_at: 2026-09-24
updated_at: 2026-09-24（第五轮审阅裁定并入正文；同日三件实现全落地）
status: 已落地（2026-09-24 三笔实现：P0 账本修正 5d102aee → 写侧绑定体系 3143aadc → 读侧 residual adapter 1dad1353；变更档案 2026-09-24-fr-test-bindings / 2026-09-24-fr-test-readside）
audience: 无会话上下文的审阅者
related: verify 精简（7→3，另案）、deps(auto)、探针 7、fr-index、test-ledger、R9/R13/R14 对照实验
---

# 方案评审稿：验收×测试绑定持久化 + verify 选测（加法并集）

> **落地记录（2026-09-24）**：本方案三件全部实现——①test-ledger P0（键 v2：实解命令+配置指纹+schemaVersion 2，扫射面**五处**含 quick-audit 族，commit 5d102aee）；②写侧（test-bindings 基座+探针 7 落盘+晋升+归档提升+tests CLI，变更 2026-09-24-fr-test-bindings，commit 3143aadc）；③读侧（锚点集残差+保守差集+执行矩阵+悬空硬错+披露 sidecar+账本停复用护栏，变更 2026-09-24-fr-test-readside，commit 1dad1353）。dogfood 全链实证两轮（21+15 行 candidate→active→全局锚提升）。后置项（收窄另决策/沉默红二期/D 适配器/runner profile/跨仓 repoKey）维持 §3.3/§6 裁定不变。

> **本文目的**：把「验证阶段该跑哪些测试、如何可审计」收成**自洽文稿**。读者无需阅读聊天记录。  
> **本文不是**：已落地代码；也不是与「verify 步骤 7→3」捆绑的实现。  
> **修订说明**：初稿经五轮审阅。第二轮指出「空锚点集替换现选测 → 假绿」与「探针 7 已算完只缺落盘」；第三轮指出「trace 无作用域 → 并集单调涨回全量」「悬空绑定无修复路径 → 硬错死锁」「现选测被静默重定义」；第四轮指出「**探针 7 的判定列是预填+复核，不是 CLI 单方结论**」「**动作名不是可执行集合，须补 residual adapter**」「**文件路径不是可执行测试集，须补 runner 解析**」「**现有 test-ledger 的 command 身份是错的、且只承载单结果**」「**D/orphan 的行身份未闭合**」；第五轮指出「**命令型现选测（`full`/`module-subset` 均跑命令串）不产出文件集 → 差集无机械定义，须保守向兜底**」「**沉默红比对未沿取代链 → 域文件内 superseded 死条目会误报**」「**R2 受益注记的前提是账本 FAIL→PASS 窗口模型（`ruleTestTamper`），非提交 token**」「**ledger P0 扫射面三处，`schemaVersion` 钢轨已在只需翻 2**」「**orphan `row_id` 的 acceptance-index 会随插行漂移**」。**正文已按五轮裁定改写**，旧表述（人手写 `测试：`、CAP 锚、锚点集替换选测、整包不再作默认、全库 trace 入并集、`origin: machine` 单字段、`anchor: orphan` 伪锚）作废。

---

## 0. 一句话（当前契约）

把 verify **探针 7** 已机械预填的「acceptance ↔ 测试文件」候选**经 agent 逐格复核后持久化、并归档提升**到可查询面（挂既有 FR/ql 锚，禁第四命名空间；一期不铺 D 适配器）；verify **一期**跑集 = **现选测 ∪ trace[本变更锚点集] 的残留差集**（只做加法；**现选测 = `decideVerifyTestAction` 的策略决策与既有执行分支逐字保留**，新增 residual adapter 补未覆盖的绑定文件——**差集取保守向**：仅机械可证明覆盖者（deps-auto-subset 文件集）算覆盖，命令型现选测一律全补、禁解析命令串猜覆盖面），该锚点集下 trace 为空则完全沿用现选测——**本方案不改变现选测自身的 `skip` 语义**，禁止的是「因 trace 机制导致的空跑 PASS」；先披露差集，收窄另决策。指纹复用走既有 **test-ledger**（**前置 P0：先修正其 command 身份——扫射面三处——与多段 run plan 承载，`schemaVersion` 翻 2 旧账自然失效**），不新造缓存。绑定悬空 → 硬错，**且配受认可的修复命令**（不带死锁）。

---

## 1. 背景（为何要动）

### 1.1 产品语境

SillySpec 是给 Agent 用的 CLI 流程控制器：阶段推进 + 产物门禁。完整路径含 `brainstorm → plan → execute → verify → archive`；小改走 `quick`。

验证阶段痛点不全是「有没有 verify」，而是：

1. **LLM 仪式重**（另案：步骤 7→3；**不在本方案范围**）。
2. **测试面过大且不可审计**：常按 `local.yaml` 的 `commands.test` + `test_strategy: module|full` 跑模块包/全量；只能回答「跑了」，回答不了「**谁要求这条测试**」。
3. **执行期已测过**：verify 再开大套件墙钟高（R8/R9/R13 等对照实验有实证）。
4. **deps(auto) 有价值但不完整**：发现面能捞「没人认领但真依赖」的回归； alone 漏声明面，且 runner/cwd 曾假败。

**附：受益面（第五轮补注）**：本方案的绑定是哨兵 R2（改测试凑绿，`src/watcher.js` `ruleTestTamper`）的证据基座——现状证据=「账本 FAIL→PASS ∩ 窗口内任一测试文件被改」（窗口级粗粒度，warning 档）；绑定后可升级为「**该 FR 绑定测试文件被定向改动 ∩ FR 场景正文未改 ∩ 账本 FAIL→PASS**」的 FR 级定向嫌疑，并补上现状完全缺失的规格侧半边证据。**档位不变（warning）**：测试纠错是无规格变更的合法场景，三联证据收窄误报、不消除。

### 1.2 规格与测试的三种关系

| 情况 | 审计上要说清 | 锚怎么挂（裁定后） |
|---|---|---|
| **需求规格变了** | 「为 FR-… 验收」 | **FR-…** |
| **规格没变、能力/重构驱动测变** | 「决策驱动」或「无规格锚」 | 目标态：有决策 → **D-…@vN**；无 → **`anchor: null`（可见的 orphan）**。一期 D 适配器后置，一律落 `anchor: null` + `reason: capability`（§3.1） |
| **快速修复** | 「为 ql-…」 | **ql-…**（出生即稳定） |

**禁止**再引入 `CAP-xxx`（第四 id 空间：无铸造者、无解析者、无取代链 → 垃圾抽屉）。原「kind」收成字段 `reason: spec | capability | regression`（**为什么测**），不是锚类型。

### 1.3 关键发现：半条脊骨其实更长——缺的是落盘

verify **探针 7（验收×测试覆盖矩阵）**已在机械产出「哪条 acceptance 由哪些测试承接」的**候选**：

- 归属：task 卡 `allowed_paths` 测试路径 ∪ execute-run `review.json` 的 `changedFiles`（及下游卡承接等既有口径）  
- 实现参考：`src/verify-probes.js`（探针 7 构建）；`validateAcceptanceMatrix`（`src/stage-contract.js`）对 covered/partial **硬门**要求测试锚点  
- 上游 join：task frontmatter **`requirement_ids`**；归档时 `fr-index.js` 将变更内 `### FR-NN` 铸成全局 `FR-<domain>-NNN` 写入 `knowledge/fr/`

**机械边界（第四轮裁定，勿高估）**：探针 7 的**归属列**是机械的；**判定列是 CLI 机械预填 + agent 逐格复核**——代码原文「判定列为 CLI 机械预填，agent 逐格复核改写」「关键词命中只是提示，命中≠判定」「预填≠结论：与事实不符的格子必须改写」（`src/verify-probes.js`，坑 probe7-prefill-evidence）。`validateAcceptanceMatrix` 只机械校验枚举与证据形态，**不判断语义上是否真被覆盖**。故本方案采用 `candidate → confirmed` 两级晋升（§3.2），字段以 `discovery` + `confirmed_by` 两层表达——**不得**把 CLI 预填写成 `origin: machine`，那会被审计误读为「CLI 已独立证明覆盖」。

链在 verify 当下已完整：

```
FR ← requirement_ids ← task ← 探针7归属 ← 测试文件
```

问题是：结果主要落在 **`verify-result.md`（不进归档）** → 「探针 7 是报告，不是注册表」。  
**立项成本量级**：不是新造绑定仪式，而是 **把已有计算持久化 + 归档提升**。

### 1.4 已有资产（勿重复造轮）

| 资产 | 作用 |
|---|---|
| 探针 7 + `requirement_ids` | **候选供给**（主写点；晋升 active 须 agent 确认，§3.2） |
| `fr-index` / `knowledge/fr/` | 规格活库、全局 id、最近确认、supersede |
| `knowledge/decisions/` | D-…@vN |
| QUICKLOG `ql-…` | 快修锚（稳定 id） |
| 现选测 = `decideVerifyTestAction` 原输出（未配置仓多为 `deps-auto-subset`） | **发现面 / 回落底**（本方案不重定义，见 §3.3） |
| `test-ledger` / green-cache / quality-scan 指纹 | **复用走 ledger，不新造第四指纹** |
| quick `isTestPath` / 同模块软归属 | quick 侧机械落行旁路 |

仓内已有多处文档解析点。**每新增一种独立手写格式真源 = 一对税**——存储裁定见 §3.2。

---

## 2. 目标与非目标

### 2.1 目标

1. 每条跑测（或披露行）能回溯到 **FR / ql / orphan（`anchor: null`）/ deps(现选测)**——一期；D 后置。  
2. 绑定表由 **CLI 机械写入**；agent 只纠正可疑行，不负责「提供」空表。  
3. verify **一期**不收缩默认跑集到「仅锚点」——防假绿；先 **加法并集 + 差集披露**。  
4. 真源单一解析扩展；禁止第四锚空间、第四指纹实现。
5. **作用域闭合**：并集只取「本变更锚点集」下的 trace 行，防并集随变更累积单调涨回全量。  
6. **修复面闭合**：悬空/错绑有受认可写入者（`sillyspec tests --bind/--unbind`），硬错与修复命令**同批落地**。  
7. **确认等级**：`candidate`（机械候选）与 `active`（agent 确认晋升）两层分开，审计可区分「谁发现」与「谁确认」。  
8. **可执行组合**：定义 5 种现选测动作 × trace 空/非空的执行矩阵；绑定文件须能解析到命名 runner（§3.6）。  

### 2.2 非目标

- verify 7→3 / 填槽精简（另案）。  
- 完整符号级（方法级）影响面（可后叠）。  
- 跨仓 ContractPack 全量。  
- 补 `FR_INDEX_EPOCH`（2026-09-18）前历史账。  
- 用 `known_failures` 盖 runner/选面错误。  
- 管理仓库每一个测试文件——只管 **trace 行 + 与现选测的并集关系**。  
- 改 `decideVerifyTestAction` 的缺省或策略语义（现选测**逐字保留**；收窄另决策，见 §3.3 时序）。  
- 改变现选测自身的 `skip` / `module-zero-hit-skip` 语义（「任何 verify 都不得零测试 PASS」是独立策略变更，不混进加法并集）。  
- 一期铺 D 锚适配器（`knowledge/decisions/` 是第二处解析面，按「宁可不建」纪律后置，见 §3.1）。  

---

## 3. 方案正文（裁定后）

### 3.1 锚点与行身份（仅现有命名空间）

```
一期 anchor ∈ { FR-<domain>-NNN | ql-<id> | null }
```

| 锚 | 何时用 | 一期 |
|---|---|---|
| FR | 规格驱动的验收钉 | ✅ |
| ql | 快速修复（出生即稳定） | ✅ |
| D-…@vN | 规格正文未改、决策驱动的测变 / 能力升级 | ⏸ **后置**（见下） |
| null | 机械落到测试文件但暂无锚——**必须可见**，禁止伪装成有锚 | ✅ |

**orphan 是「缺锚状态」，不是锚类型**（第四轮裁定）：落 `anchor: null` + `row_id`，**不用** `anchor: orphan`——伪锚 ID 无法唯一标识、去重、修复或审计多行。

**D 锚一期后置**：D 的存储面在 `knowledge/decisions/<域>.md`，接的是 decision-distill 而非 fr-index，属**第二处适配器**——按本方案「做不到零第二解析器 → 宁可不建」的纪律，一期不铺。一期决策驱动的测变落 `anchor: null` + `reason: capability`（可见的 orphan），待 D 适配器落地后回填。

**orphan 的执行面**：orphan 行**永不进入跑集**（无锚 → 不被任何「本变更锚点集」选中，见 §3.3）。它是纯审计面，其执行由现选测 / deps 发现面兜。上表「必须可见」指**审计可见**，非选测可见。

字段（概念最小契约）：

```
anchor: FR-… | ql-… | null   # 一期；null = orphan 状态
row_id: <change>:<task-id>:<acceptance-index>   # 行唯一身份；anchor 为 null 时必填
tests:  [相对路径…]          # 一期可寻址粒度 = 文件（见 §3.6）
reason: spec | capability | regression
state:  candidate | active   # 只有确认过的 covered/covered-service 晋升 active（§3.2）
discovery:    machine | agent   # 候选由谁发现（探针 7 预填 = machine）
confirmed_by: agent | null      # 由谁确认晋升；null = 未确认，不得 active
reconfirm:    unchanged | rebound | null   # §3.4 沉默红表态；≠ 执行证明
confirmed_at: <headHash>     # 与 FR「最近确认」同语义
change: <变更名> | <ql-id>
status: active | superseded  # 取代规则按锚类型分别定义（§3.2）
```

`origin: machine | agent` 已由 `discovery` + `confirmed_by` 两字段替代——单字段无法表达「CLI 发现、agent 确认」这一实际形态，会被审计误读为 CLI 已独立证明覆盖。

### 3.2 存储与真源（防解析对税）

**写点（机械，零 agent 供给）：**

1. **全流程**：构建探针 7 时，将矩阵行落成 trace（经 `requirement_ids` join）；verify 期身份为 `(change, FR-NN)` 局部号。  
2. **归档提升**：与 fr-index 同拍，铸全局 `FR-<domain>-NNN`，幂等键跟现有「来源变更」口径；接 supersede（FR 退役 → trace `superseded`，禁死锚）。  
3. **quick**：`--done` 资产尾部，对提交窗口测试文件机械落 `ql-…` 行（旁路已有 `isTestPath` / 同模块软归属）。

**晋升规则（candidate → active，第四轮裁定）：**

| 探针 7 判定（agent 复核后） | 落库形态 |
|---|---|
| `covered` / `covered-service` | **晋升 `state: active`**，进跑集 |
| `partial`（有候选、确认不充分） | 落 `state: candidate`，**不进跑集**（保留候选路径供审计与后续补绑） |
| `uncovered` / `non-testable` | **不落 active 绑定**（uncovered 是缺口信号；non-testable 是显式逃生门） |

未确认的预填格一律 `state: candidate` + `confirmed_by: null`——**禁止**把 CLI 预填直接当 active。

**字段级所有权（fr-index 条目内，第四轮裁定）**：活库条目头声明「机械蒸馏、勿手改」，而绑定字段由 `tests` CLI 管理——须按字段划权，否则「fr-index 是投影」与「绑定权威住在 fr-index」会在实现时打架：

| 字段类 | 权威 |
|---|---|
| 标题 / 状态 / 场景正文 / 依据决策 等 | `indexRequirements` 蒸馏生成 |
| 测试绑定字段（`tests` / `state` / `confirmed_*` / `row_id` …） | `sillyspec tests` CLI 管理的机器权威子记录 |

四条硬约束：① `indexRequirements` 重放**不得覆盖**已确认的绑定字段；② 同一来源变更重放**不得冲掉** agent 的修复；③ `tests --bind/--unbind` **原子更新**；④ FR 被 supersede 时由提升模块**同步更新**对应绑定状态（FR 有 supersede、D 有 `@vN`、ql 与 orphan 无同类链——**status 更新规则按锚类型分别定义**，不能只写一句「必须接 FR/D 取代链」）。

**真源裁定（调和四轮审阅）：**

- **唯一手写/解析扩展真源**：提升后的绑定挂在 **FR 活库条目机器字段**（及 ql 同构），扩展点落在 **fr-index 蒸馏链**（或紧邻的单一提升模块，但仍一处解析）。  
- **`knowledge/test-trace/`**：若存在，只允许是 **派生视图 / 缓存**（`sillyspec tests` 可读），**禁止**第二套手写格式、禁止第二套 supersede 逻辑。做不到零第二解析器 → **宁可不建目录**，只保留命令视图。  
- **禁止** agent 以「requirements 里手写测试：」作为主供给（可保留为纠正通道，记 `confirmed_by: agent`）。
- **提升后绑定行的唯一合法修理工**：`sillyspec tests --bind/--unbind --anchor …`（§5）。活库条目是**机器所有权**（文件头明示「条目字段行为机械解析契约，勿手改」），且 `indexRequirements` 按来源变更名幂等（已索引即整体 no-op，`src/fr-index.js`）——**没有这个命令，§3.3 的悬空硬错就是死锁**。该命令同时是上一条「agent 纠正通道」的机械载体，改动留 `confirmed_by: agent` 痕迹。

### 3.3 verify 选测：加法并集（防假绿）

**现选测定义**：`decideVerifyTestAction`（`src/verify-postcheck.js`）的**策略决策与既有执行分支逐字保留**——动作集 = `skip` / `module-subset` / `module-zero-hit-skip` / `deps-auto-subset` / `full`。本方案**不重定义**它，也**不改其缺省**；收窄留给下方时序第 4 步的另决策。（初稿曾写「整包 module/full 不再作默认」——与「只做加法」自相矛盾：配了 `modules:` 的仓今日缺省本就是 `module`，该条已作废。）

**但「逐字保留」≠「集合可直接并」**（第四轮裁定）：`decideVerifyTestAction` 返回的是**动作名**，不是标准化测试文件集合，各动作执行面互不相同。故须新增 **trace residual adapter**——把**未被现选测覆盖**的绑定文件补进实际执行计划：

| 现选测动作 | trace 非空时的执行 |
|---|---|
| `full` | 跑既有 full 命令，**再补 trace 差集**（「未覆盖」按下方保守定义：不可证明即全补） |
| `module-subset` | 跑命中的 module 命令，再补 trace 差集 |
| `deps-auto-subset` | 跑现有 deps 集合，再补 trace 差集 |
| `module-zero-hit-skip` | trace 非空 → 跑 trace；为空 → 保持 skip |
| `skip` | trace 非空 → 跑 trace；为空 → 保持 skip |

**`full` 不是 trace 的超集**，不能假设它已覆盖绑定文件：`full` 的实际含义只是跑配置的 `commands.test`，该命令未必枚举仓内每个测试文件——本仓即证：`.sillyspec/local.yaml` 的 `commands.test` 是 `npm run test:core`（2026-09-23 已收窄为核心面套件）。

**差集的机械定义（第五轮裁定，保守向）**：「trace − 现选测」只在现选测**可机械枚举文件集**时才可计算——5 动作中唯一满足的是 `deps-auto-subset`（deps 批文件集现成）；`full` 跑 `commands.test` 命令串、`module-subset` 每模块跑命令串（`modules[name] = { path, test }`，`src/verify-postcheck.js`），**都不产出文件集**。规则：**只有机械可证明被现选测覆盖的文件才算覆盖；命令型现选测一律按「不可证明覆盖」处理，本变更锚点集下的 trace 文件全部补跑**——重复跑无害（加法幂等），漏补即假绿。**禁止解析命令字符串猜覆盖面**（与 §3.6「绑定行禁存 shell command」同一纪律）。下方时序第 2 步披露的「现选测 − trace」半边同理：命令型动作只能如实披露「覆盖面不可机械枚举」。

**作用域（本方案核心，防并集单调涨回全量）**：

```
本变更锚点集 = ⋃(本变更各 task 卡 requirement_ids) ∪ 本变更 ql-id
              （可选扩展：本变更 diff 命中的既有绑定锚——一期默认关；启用须单独披露扩入锚清单并设帽）

跑集 = 现选测 ∪ trace[本变更锚点集].tests
```

只取**本变更锚点下**的 trace 行，不是全库。若按全库理解，`trace.tests` 会随变更累积单调增长，数十个变更后并集 ≈ 全量套件——本方案收益被自己的并集吃掉。join 面已现成（§1.3 链：`FR ← requirement_ids ← task ← 探针7归属`）。

| 规则 | 原因 |
|---|---|
| trace **只做加法**，不替换现选测 | 锚点集可能漏未绑定测试；从 deps 切到「仅锚点」是收窄，错是静默不验证 |
| trace 在本变更锚点集下为空 / 锚点零绑定 → **跑集 = 现选测**（现选测自身为 `skip` 则如实 skip） | 禁止「空并集 → 没跑 → PASS」假绿（与「解析器空默认值过门」同错类）；**本方案不改现选测的 skip 语义**——「任何 verify 都不得零测试 PASS」若要立是独立策略变更 |
| 现选测 = `skip` / `module-zero-hit-skip` 而 trace 非空 → **跑集 = trace.tests** | `evidence-auto` 按 `module-impact.md` 影响型可推荐跳过；trace 有绑定即视为该变更确有可验面 |
| 绑定路径不存在（改名/删）→ **硬错** | 悬空行让表成谎言，比没表更糟；**须与修复命令同批**（§3.2 / §5） |
| orphan 行 | **不进跑集**（无锚 → 不被锚点集选中）；审计可见，执行由现选测兜 |

**一期消费（强制时序）：**

1. 落盘 trace + 归档提升可用。  
2. verify **打印披露**：本变更锚点集 → 测试映射，以及 **与现选测的差集**（trace[本变更锚点集]−现选测 / 现选测−trace）。  
3. **仍按加法并集执行**（或至少按现选测执行并披露 trace 增量）。  
4. 多个变更把差集看实后，**另决策**是否收窄默认跑集——不在一期拍板。

### 3.4 闸门三档

| 档 | 时机 | 行为 |
|---|---|---|
| **写时** | 落 trace | 路径存在 + 锚可解析 = 硬错；否则不过门 |
| **verify 一期** | 跑前/报告 | 披露差集 = 报告；不因「未绑」空跑 PASS |
| **沉默红（二期）** | FR **场景正文**变了（或 acceptance 机械变了）且 trace 未更新 | **红在沉默**，逼表态（可沿用/对齐 `待复核`）；**不**红在「纯文案澄清的 FR」。**表态的机械形态 = 记一条最小确认**：`confirmed_by: agent` + `reconfirm: unchanged`（或 `rebound`）+ 顶 `confirmed_at`，测试与行内容均可不动——健康路径不被逼做无谓改动，也不产生假拦。**确认是复核声明，不是执行证明**：测试是否真过由 test-ledger 证（§3.5），两者**不得混成一个字段** |
| **收窄** | 差集实测支撑后 | 单独变更决策 |

**「场景正文变了」的比对基准**：活库条目是**有损投影**（`renderFrLines` 把 GWT 截到 80 字符、最多留 5 个场景，`src/fr-index.js`）——拿它当基准会双向出错。比对须走 `全文：` 字段指向的原文（`changes/archive/<名>/requirements.md#FR-NN`）：变更侧 requirements.md 原文 vs 来源变更原文。**且须沿取代链解析到当前活跃条目**（第五轮裁定）：superseded 条目仍保留在域文件内供取代链回溯（`src/fr-index.js`），按 id 朴素查找会命中死条目、拿退役 FR 的原文判沉默红（误报）。正确基准 = 沿 `承接`/`superseded_by` 链找到**当前活跃 FR 条目**，取其 `全文：` 指针指向的来源变更原文——与 §3.2 硬约束④「FR 被 supersede 时由提升模块同步更新绑定状态」是同一条链的读写两端。

### 3.5 指纹复用（含 P0 前置修正）

**禁止**第四套指纹实现。trace 相关复用直接走现有 **`test-ledger`**（与 quality-scan / green-cache 既有实现对齐消费，不另起炉灶）。

**但现有账本不能原样承载「现选测 + trace residual」的多段执行**，须先做最小修正（第四轮裁定，**立项 P0**）：

| 问题 | 现状 | 修正 |
|---|---|---|
| command 身份错误 | verify 门传给账本的 command 是**硬编码字面量 `'npm test'`**（**扫射面三处**：`src/run/gates.js` ×2 + `src/index.js` ×1——第五轮核验），而本仓实际是 `commands.test: npm run test:core`；且 `local.yaml` **是 gitignore 文件**，既不在 HEAD 也不进 porcelain——**改测试命令不会换键** | 用实际解析出的命令（或其指纹）参与键 |
| 单结果承载多段执行 | 账本每变更只有一条 result | 键改 `codeFingerprint + normalized aggregate run plan + envProfile`；`run plan` 至少 `[{runner, files}…]` |
| test-set 摘要过粗 | `computeTestFaceDigest` 摘的是整个 `test/` 目录 | 让**选中集合**（而非整目录）参与 test-set 摘要 |

这不是新增第四套指纹，而是**让现有账本如实描述它缓存的东西**——否则新绑定会把既有的命令身份错误一并继承。

**版本钢轨已在（第五轮核验）**：账本 `schemaVersion: 1` 已在记账与 consult 侧严格校验（版本不符 → 不复用，`src/run/test-ledger.js`），且每变更**单条覆盖写**——键算法变更只需把版本翻 **2**，旧账自然失效（不迁移）；「升级后旧缓存命中错命令」的方向性担忧实为现行 bug 本身（硬编码键欠区分，两个不同实际命令映射同一键串），修正后由严格全等 + 版本校验双保险兜住。

### 3.6 粒度：文件级（对本仓）

sillyspec 本体测试多为文件级可寻址（如 `node --test <files>` / deps 批）；`path::case` **不作一期契约承诺**（可作人类可读标签）。业务仓若 runner 稳定支持 nodeid/case，可后扩，须在该仓契约中显式声明。

**runner 解析（第四轮裁定）**：路径存在性只能证明文件没被删，**不能证明该用哪个 runner 跑**——而本仓支持 Node / Python(pytest) / 跨仓 / 多 cwd / 多 venv。一期规则：

- **复用既有推断面**：按扩展名分语言组卷（`.py` → pytest 前缀、其余 → `node --test`），pytest 前缀自模块命令推断——即 `buildDepsBatches` 现口径，不新造第二套执行配置。  
- **无法归一 → 硬错，不猜测**（缺文件 / 语言无法判定 / 跨仓 cwd 不明）。  
- **禁止**在绑定行里存任意 shell command（绑定会变成第二份不可治理的执行配置）。  
- 命名 runner profile（`local.yaml` 引用式）列为**后置扩展**，届时绑定行只引用 profile 名。

### 3.7 与「verify 7→3 / token 削减批」的关系

| 议题 | 关系 |
|---|---|
| 7→3、CLI 合并、draft、RERUN 闸等 | **另案**；多为 token/步骤削减 |
| 本方案 | **改变 verify 跑什么**（行为契约） |

**必须分变更**：混批时验收数字异常分不清「削减无效」还是「选测改了工作量」。  
（注：步进折叠若已降级，分案原则对仍在飞的纯削减批照样成立。）

并步落地时：**不得**再默认嵌入整包 quality scan；测策略以本方案为准（跑集 = 现选测 ∪ trace[本变更锚点集]，见 §3.3）。

---

## 4. 量化预期（推演，非验收合同）

绑定成熟后，整包（尤其前端全量）有望显著收敛（**收窄另决策**，见 §3.3 时序）；deps 发现面保留。  
**一期验收看**：机械落盘率、`discovery` / `confirmed_by` 分布、`candidate` 与 `active` 是否可区分、差集披露是否完整（**口径**：可枚举时出双差集；命令型现选测只要求 trace 全补清单 + 「不可枚举」声明，**不要求对称双差集**——否则实现会被逼去解析命令串）、是否出现因 trace 机制导致的空跑 PASS、悬空路径是否硬拦、**账本身份修正是否生效（改 `commands.test` 后不再误复用）**——**不**看理想秒数/美元。

---

## 5. 落地契约清单

```
写侧：
  [ ] 探针 7 构建时机械落 **candidate** 行（requirement_ids join）
  [ ] 晋升规则：仅 agent 确认的 covered/covered-service → state=active；partial → candidate；uncovered/non-testable 不落 active
  [ ] 归档提升：局部 FR-NN → 全局 id；接 supersede；幂等
  [ ] 字段级所有权：indexRequirements 重放不覆盖绑定字段；同源重放不冲掉 agent 修复；--bind 原子更新；FR supersede 同步绑定状态
  [ ] quick --done 对窗口测试文件落 ql 绑定
  [ ] discovery=machine 为主；agent 纠正记 confirmed_by=agent
  [ ] 无 CAP；一期无 D 适配器（决策驱动落 anchor:null + reason:capability）
  [ ] 行身份：anchor 为 null 时必填 row_id=<change>:<task-id>:<acceptance-index>
  [ ] sillyspec tests --bind/--unbind（提升后绑定行的唯一合法修理工；与悬空硬错同批）

读侧 / verify：
  [ ] sillyspec tests --anchor|--change（视图）
  [ ] 现选测 = decideVerifyTestAction 策略决策与既有执行分支逐字保留（不重定义缺省）
  [ ] **trace residual adapter**：5 动作 × trace 空/非空的执行矩阵（§3.3）——`full` 不假设覆盖 trace；**差集保守定义**：仅 deps-auto-subset 文件集可证覆盖，命令型全补，禁解析命令串猜覆盖面
  [ ] 作用域：本变更锚点集 = ⋃requirement_ids ∪ 本变更 ql-id；跑集 = 现选测 ∪ trace[该锚点集] 差集
  [ ] 该锚点集下 trace 空 → 完全沿用现选测（含其 skip）；现选测=skip/module-zero-hit-skip 且 trace 非空 → 跑集 = trace
  [ ] runner 解析：复用既有推断面（扩展名 + pytest 前缀）；无法归一 → 硬错；绑定行禁存 shell command
  [ ] 悬空 tests[] 路径 → 硬错（可被 --bind/--unbind 修复）
  [ ] 一期强制披露：锚点→测试映射 + 与现选测差集
  [ ] 复用走 test-ledger，且**先做 P0 修正**（command 身份·扫射面三处 / aggregate run plan / 选中集合摘要 / `schemaVersion` 翻 2 旧账自然失效）

存储：
  [ ] 真源挂 FR/ql 蒸馏面（单一解析扩展）
  [ ] knowledge/test-trace/ 仅允许派生视图，否则不做

显式不做：
  [ ] 不第四锚、不第四指纹
  [ ] 不与 7→3 / 纯 token 批同变更
  [ ] 一期不把默认跑集收窄为「仅 trace」；不改 decideVerifyTestAction 缺省
  [ ] 一期不改现选测自身的 skip 语义；不铺 D 适配器；不引入命名 runner profile
```

---

## 6. 风险与仍开放细节（实现可微调，不改主干）

1. 披露载体：**建议 JSON sidecar（真源，供 §4 统计机械可算）+ verify-result 一节（人读）**；stderr 仅提示行。  
2. orphan 行的晋升 SLA（多久必须挂上 FR/D/ql 或显式豁免）；orphan 不进跑集已定（§3.1/§3.3），故其 SLA 只影响审计面。  
3. deps / 现选测的帽参数（条数 vs 秒）——与选测并集正交，可另 quick。  
4. 探针 7 报告段与持久 trace 双显：一期可并存；**真源只认持久面**。  
5. 跨仓：沿用 repos + 契约边时，trace 行须带 `repoKey`（后置）。  
6. `--bind/--unbind` 的权限与留痕（谁可改活库绑定、是否要求带理由串、是否入 `.runtime` 审计日志）。
7. `candidate` 行的清理/晋升 SLA（长期停在 candidate 的候选路径怎么处置：超期降级 / 提示补绑 / 直接丢）。
8. 命名 runner profile 的 schema（`local.yaml` 引用式，后置；届时绑定行只存 profile 名）。
9. D 适配器落地后的回填策略（一期 `anchor: null` + `reason: capability` 的行如何批量认领到 D-…@vN）。
10. orphan 行 `row_id` 的 `<acceptance-index>` 分量在变更内 requirements.md 中途插行时会漂移（锚定行身份靠 anchor 不受影响，仅 `anchor: null` 行暴露）——裁定倾向：**行身份以首次落盘为准**，编辑致漂移的旧行视同悬空，走 `--bind/--unbind` 修复面。落地约束：**禁止易漂移纯序号作长期主键**——落盘时固化 acceptance 原文短指纹（如 `acceptance_text_hash`）参与行身份与漂移判定，`<acceptance-index>` 只作当时快照；漂移判定走指纹而非序号，防插行后 orphan 行批量假悬空、修复噪声放大。

---

## 7. 审阅结论选项（更新）

- **A. 采纳本文（第五轮收敛版）**，按「写侧先落 → 披露差集 → 加法并集（限本变更锚点集）；收窄另决」立项，且**立项范围含五项前置**：① 确认等级契约（candidate/confirmed，§1.3/§3.2）；② 可执行组合契约（residual adapter + runner 解析 + **差集保守定义**，§3.3/§3.6）；③ **test-ledger P0 修正**（command 身份三处扫射 / 多段 run plan / 选中集合摘要 / `schemaVersion` 翻 2，§3.5）；④ 数据身份闭合（row_id / anchor:null / 按锚类型取代规则 / 字段级所有权，§3.1/§3.2）；⑤ **沉默红比对沿取代链取活跃条目 `全文：` 指针**（§3.4）。附：R2 定向化受益注记随文生效（§1.1，warning 档不变）。  
- **B. 采纳主干，仅改 §6 细节 ___**。  
- **C. 不采纳**，理由：___（若仍主张「仅锚点集替换现选测」「agent 主写绑定表」「全库 trace 入并集」或「把 CLI 预填直接当 active 绑定」，须说明如何避免空表假绿 / 并集单调涨回全量 / 把预填当证明）。

---

## 8. 修订史

| 日期 | 说明 |
|---|---|
| 2026-09-24 | 初稿：FR/ql 绑定、`测试：` 行、绑定∪deps、写入闸门；禁独立 test-trace 真源 |
| 2026-09-24 | **第二轮并入**：① 供给改探针 7 机械落盘+归档提升；② 杀 CAP→D/orphan；③ 选测改为现选测∪trace（加法）防假绿；④ 先披露差集后收窄；⑤ 指纹走 test-ledger；⑥ 文件级粒度；⑦ 存储=FR 蒸馏真源，test-trace 目录仅派生 |
| 2026-09-24 | **第三轮并入**：① §3.3 补 trace **作用域**（本变更锚点集，防并集单调涨回全量）；② 删「整包不再作默认」，改「现选测 = `decideVerifyTestAction` 原输出逐字保留」并补 `skip`/`evidence-auto` 交互；③ 悬空绑定配 **`--bind/--unbind` 修复命令**（硬错不带死锁）；④ §3.4 表态形态 = 顶 `confirmed_at`，比对走 `全文：` 原文（活库条目有损）；⑤ orphan 明示不进跑集 |
| 2026-09-24 | **第四轮并入**：① §1.3 补探针 7 **机械边界**（归属列机械、判定列预填+复核，禁 `origin: machine` 误读）；② §3.1/§3.2 行身份闭合（`anchor: null` 非伪锚 + `row_id` + `candidate/active` 晋升 + `discovery`/`confirmed_by` 分层 + 字段级所有权 + 按锚类型取代规则），D 锚与 runner profile 后置；③ §3.3 补 **residual adapter 执行矩阵**（动作名不是集合；`full` 不假设覆盖 trace）；④ §3.5 补 **test-ledger P0 前置修正**（command 身份 / aggregate run plan / 选中集合摘要）；⑤ §3.6 补 **runner 解析**；⑥ §3.4 表态改最小确认记录（确认 ≠ 执行证明）；⑦ §0/§3.3 修「skip 语义」文字矛盾 |
| 2026-09-24 | **第五轮并入**：① §3.3 补**差集保守定义**（命令型现选测 `full`/`module-subset` 均跑命令串、不产出文件集 → 覆盖不可证明即全补兜底；禁解析命令串猜覆盖面；披露「现选测 − trace」半边如实标注不可枚举）；② §3.4 比对基准**沿取代链**取当前活跃条目的 `全文：` 指针（域文件内 superseded 死条目在场，朴素查找误报；与 §3.2 硬约束④同链两端）；③ §1.1 补 **R2 受益注记**（前提修正：现状=账本 FAIL→PASS ∩ 窗口测试改动，`watcher.js` `ruleTestTamper`，warning 档；绑定使其 FR 定向化 + 补规格侧证据，档位不变）；④ §3.5 P0 **扫射面三处**（`src/run/gates.js` ×2 + `src/index.js` ×1）+ `schemaVersion` 翻 2（钢轨已在，旧账自然失效不迁移）；⑤ §6 补 orphan `row_id` 的 acceptance-index 漂移注记（行身份以首次落盘为准） |
| 2026-09-24 | **立项前钉死三处（第六轮·实现约束，不扩轮）**：① §6.10 落地约束——禁止易漂移纯序号作长期主键，落盘固化 acceptance 原文短指纹参与行身份/漂移判定，index 只作快照；② §3.3 可选扩展「diff 命中的既有绑定锚」一期**默认关**，启用须单独披露扩入锚清单并设帽；③ §4 验收口径——可枚举时出双差集，命令型现选测只要求 trace 全补清单 + 「不可枚举」声明，不要求对称双差集。实现顺序：ledger P0 → candidate 落盘+晋升+`--bind/--unbind` → residual adapter+保守差集+披露 → 沉默红/D 适配器/收窄后置 |
