---
author: flow-machine-draft
created_at: 2026-10-16T13:44:13.048Z
---
# 需求规格（Requirements）— 2026-10-16-title-range-gate

## 功能需求

### FR-01: flow start 全新启动（非平台 writer 空目录）标题不在 10-30 字或变更名兜底时必须拒绝启动并给修复指引（--title 或首行 10-30 字概括）

- flow start 全新启动（proceedFreshEmptyDir=false）时，落库标题必须在 10-30 字区间内（按去首尾空白后的字符数计）：不满足时必须拒绝启动（exit 2），报错必须一次给全——当前标题值与实际字数、硬区间要求、两条修复路径（① --input 首行写一句 10-30 字概括，建议 ~20 字；② --title "<10-30 字中文概括>"）。
- 全新启动推导不出语义标题（--input 缺失/首行为空）时禁止退回变更名兜底：必须走同一拒绝路径强制 agent 命名。
- 拒绝必须发生在任何状态写入之前（changes 行、flow-state、watcher 均不得因被拒启动落半态）。

#### 场景：首行过短被拒

Given --input 首行「任务」（2 字）
When flow start 全新启动
Then 必须 exit 2 且报错含当前值、字数、10-30 要求与 --title/首行两条修复路径；changes 表不得新增该变更行

#### 场景：合规则原样放行

Given --input 首行 10-30 字（如 18 字概括）
When flow start 全新启动
Then 必须正常启动，标题=提炼值，行为与改动前逐字一致（除标题行措辞更新外）

### FR-02: 显式 --title 在 fresh/resume 超出 10-30 必须拒绝；平台 writer 豁免硬门仅警告

- fresh 与 resume 路径的显式 --title 传值超出 10-30 字时必须拒绝（exit 2）——显式输入是最易修正的参数面，拒绝即修正。
- 平台 writer 预建空目录启动（proceedFreshEmptyDir=true，无 agent 对话面可强制）必须豁免硬门：照旧启动，标题兜底/超界时打一行 ⚠️ 警告留痕（不阻断自动派发）。

#### 场景：--title 超长被拒

Given --title 31 字
When flow start / resume
Then 必须 exit 2 且报错含字数与修复路径

#### 场景：平台 writer 豁免

Given 预建空变更目录（平台派发形态）且无 --input
When flow start
Then 必须照旧启动（exit 0），标题=变更名兜底且打 ⚠️ 警告行

### FR-03: adopt 收编与 resume 补写不阻断但超界必须打强提示

- adopt 收编标题（头脑风暴产物 H1/动机提炼）或 resume 库空补写标题超出 10-30 字时，必须打 ⚠️ 强提示（含当前值与 `flow start --title` 修复命令），且不得阻断流程（收编/恢复是既成事实的延续面，硬断会让在途变更不可恢复）。
- resume 路径库内 title 已存在的既有行为必须不变（首写者胜，不覆盖）。

#### 场景：adopt 超界强提示

Given 头脑风暴 proposal 语义标题 5 字
When flow start 收编
Then 必须正常收编（exit 0）且输出含 ⚠️ 与 --title 修复指引的提示行

### FR-04: hardCut 软提示文案精度修正（评审 P3：判定是 6..30 内无可用截点）

- hardCut 软提示文案必须与实际判定一致：描述为「超 30 字且 6..30 字内无可用自然标点截点」，禁止再使用「无自然断点」这一与判定不符的措辞（变更①评审 P3 finding 的清偿）。

#### 场景：文案与判定一致

Given hardCut=true（标点存在但全落在 6..30 区间外）
When flow start 落标题
Then 提示行措辞必须体现「6..30 字内无可用截点」口径

### FR-05: 过门格式指引（AGENTS.md/templates）同步 10-30 要求；受影响 e2e 夹具按新契约修输入（断言不动）

- templates/agents-instruction.md 与本仓 AGENTS.md 的 --input 过门格式必须写明「首行=一句 10-30 字中文概括（建议 ~20 字）」，与硬门口径同源。
- 受硬门影响的既有 e2e 夹具必须按新契约修正 --input 首行/--title 长度（断言语义不变——夹具编码旧契约，更新输入是契约变更的落地而非改测试放水）；全量回归必须零失败。

#### 场景：夹具契约同步

Given 硬门落地后全量测试
When 全量跑毕
Then 零失败（夹具首行 <10 字的用例已延长至合区间，断言未弱化）

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/title-range-gate.test.mjs「isTitleInRange 区间判定 + fresh 拒绝判定面」
FR-02: test/title-range-gate.test.mjs「显式 --title 校验与平台 writer 豁免判定」
FR-03: test/title-range-gate.test.mjs「adopt/resume 超界强提示判定面（不阻断）」
FR-04: test/title-range-gate.test.mjs「hardCut 软提示文案口径」
FR-05: test/title-range-gate.test.mjs「夹具契约回归（标题族测试全绿）」
