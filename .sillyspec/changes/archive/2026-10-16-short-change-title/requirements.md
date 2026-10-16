---
author: flow-machine-draft
created_at: 2026-10-16T13:20:04.877Z
---
# 需求规格（Requirements）— 2026-10-16-short-change-title

## 功能需求

### FR-01: 新增提炼函数：目标 20 字上限 30 字，优先在自然标点（。！？；：、，—等）处截断并剥尾部标点，无标点才硬切加 …，ASCII 小数点/千分位不误切

- 超过 30 字的长句必须返回 ≤30 字短标题：优先在自然标点（。！？；：、，…—等全角标点及语义破折号）处截断，截点取「距目标 20 字最近且落在 6..30 区间」者，截后必须剥尾部标点与悬空引号。
- 句内无可用自然截点时才允许硬切：必须取前 30 字加「…」，且必须向调用方暴露 hardCut 标记（软提示判定面）。
- ≤30 字的短句必须原样返回，仅允许剥尾部标点（句号/引号等收尾符），禁止改动句中内容。
- ASCII 句点/逗号后紧跟字母或数字时（小数 3.5、千分位 1,000、缩写 e.g.）禁止作为截点；全角标点不受此限。

#### 场景：实证坏标题——50 字硬切残句

Given --input 首行「change 文件树「刷新」同步链路三层静默失败——后端 RPC 预算 3s 短于实测 6~13.5s 触发整树重拉」（50+ 字，含全角破折号）
When 过提炼函数
Then 必须返回「change 文件树「刷新」同步链路三层静默失败」（破折号前自然截断，≤30 字，无尾部 — 残留）

#### 场景：实证坏标题——动机首句（无需提炼）

Given 动机段首句「用户报告登录的账户有时候莫名其妙被退出登录。」（21 字）
When 过提炼函数
Then 必须返回去尾句号原句，禁止截断或改写句中文字

#### 场景：无自然截点

Given 40+ 字无任何全角标点的连续中文句
When 过提炼函数
Then 必须返回前 30 字加「…」且 hardCut=true

### FR-02: 轻量道 flow start/resume/adopt 与完整流程 run initChange 的标题推导改走提炼（≤30 字），motiveFromInput 模块摘要 ≤50 口径不变

- changes.title 的新推导路径（flow start 全新/resume 补写/adopt 收编、run/auxiliary/claim 四处 initChange）必须经提炼函数落库 ≤30 字标题。
- deriveChangeTitle 既有契约（首行提取 + ≤50 硬切）必须保持逐字节不变——motiveFromInput 模块变更索引摘要与其同源，禁止被本次提炼牵连。
- 显式 --title 传值必须原样落库，禁止被提炼改写。

#### 场景：标题入口切换

Given --input 首行为 50+ 字含破折号长句
When flow start / run initChange 推导标题
Then 落库 title 必须为提炼后 ≤30 字短句（非 50 字硬切残句）

### FR-03: deriveTitleFromLinkedChange 遇纯模板 H1 回退读 proposal「## 动机」首句过提炼；既有「无 H1 无动机 → 空串」契约不变

- proposal/design 的 H1 剥模板词后为空（纯「# 提案书（Proposal）」形态）且另一文档亦无语义标题时，必须回退读 proposal「## 动机」节首个内容行（剥 markdown bullet 前缀）过提炼函数返回。
- proposal 无「动机」节、或动机节无内容行时必须仍返回空串（既有契约不变，complete.js 空串不刷新语义不变）。
- H1 破折号后语义标题在返回前必须过提炼封顶 ≤30 字（防超长 dash-desc 直落标题）。

#### 场景：纯模板 H1 动机回退

Given proposal.md 首行「# 提案书（Proposal）」，「## 动机」节首行为「用户报告登录的账户有时候莫名其妙被退出登录，怀疑会话过期策略误伤」
When deriveTitleFromLinkedChange 提取
Then 必须返回动机首句的自然断点提炼（非空、≤30 字、非变更名兜底）

#### 场景：无动机节保底

Given proposal.md 无 H1 亦无「## 动机」节
When deriveTitleFromLinkedChange 提取
Then 必须返回空串（调用方不刷新 title）

### FR-04: 提炼被硬切时 flow 启动打一行软提示建议 --title，不阻断

- flow start（全新/resume）标题推导发生硬切（hardCut=true）且非显式 --title 时，必须输出一行软提示建议重入时带 --title 给更短概括；提示不得改变退出码、不得阻断后续流程。
- 显式 --title 在场、或提炼走自然截点/短句原样时禁止输出该提示（不噪音化）。

#### 场景：软提示触发与静默

Given hardCut=true 的推导结果（非 --title）
When flow start 落标题
Then 必须输出含 --title 建议的一行提示且流程继续；Given 短句/--title 场景 Then 必须无此提示

### FR-05: 既有测试 change-title-flow / motive-from-input / change-title-backfill 全绿，新增提炼函数测试含本次实证坏标题样本

- 既有三个标题测试文件在全量回归中必须保持全部通过（既有口径回归面）。
- 新增测试必须覆盖：两条实证坏标题样本、截点距目标最近选择、硬切 hardCut、ASCII 小数/千分位保护、动机回退与空串保底。

#### 场景：回归与新增同绿

When 全量测试跑毕
Then 既有标题测试零失败，新增提炼测试零失败

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/short-change-title.test.mjs「distillShortTitle：实证样本/截点选择/硬切/小数保护」
FR-02: test/short-change-title.test.mjs「deriveShortChangeTitle 与 deriveChangeTitle 口径分治」
FR-03: test/short-change-title.test.mjs「deriveTitleFromLinkedChange：动机回退/空串保底/dash 封顶」
FR-04: test/short-change-title.test.mjs「deriveShortChangeTitleEx：hardCut 标记判定（软提示触发面）」
FR-05: test/short-change-title.test.mjs「deriveChangeTitle ≤50 既有契约回归」
