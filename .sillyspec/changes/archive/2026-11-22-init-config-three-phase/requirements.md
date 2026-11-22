---
author: flow-machine-draft
created_at: 2026-11-22T16:46:33.395Z
---
# 需求规格（Requirements）— 2026-11-22-init-config-three-phase

> 来源：ROADMAP 批 5②（mattpocock setup skill 三段式：先探测后问/每问带推荐一词接受/已定跳过）+ 单 A 感知 1（推荐的价值建立在探测深度上——Q1 无依据推荐被识破实证）。与批 1 提问分型纪律协同。

## 功能需求

### FR-01: init skill（.claude/skills/sillyspec-init/SKILL.md）问询改三段式：先探测（能自查的不问——工作区模式/已有配置/用户输入中已给的答案）→ 意图问开放+决策问带推荐与依据（与 brainstorm 分型同源）→ 已定项跳过并回放确认

- init skill Step 3 深度提问**必须**前置「探测三查」：①工作区模式/目录现状（既有 Step 1/2 已查的不重复）；②用户输入（$ARGUMENTS）中已给出的答案逐项抽取；③目标问题的答案若可由仓内事实自答则**必须**自查（不问用户能查到的东西）。意图类问题（项目本质/核心功能）**必须**保持开放式（禁附选项——分型纪律）；决策类问题（技术选型/存储介质类）**必须**带推荐+一手依据锚（与 brainstorm.js 提问分型协议同源，2026-11-22-recommend-anchor-recorrect 刚立）。已确定项**必须**跳过问询并在收尾回放清单中标注「[已定] 来源」。

#### 场景：主路径
Given 用户输入已含技术栈偏好 / When Step 3 提问 / Then 技术偏好问跳过，回放清单标「[已定] 用户输入」，后续步骤直接采用。

#### 场景：决策问带依据
Given 触发技术选型（Step 4）/ When 推荐 / Then 推荐附「依据：」（版本事实/生态状态/仓内探测结果），无依据时降级开放问并声明。

### FR-02: config skill（.claude/skills/sillyspec-config/SKILL.md）同款三段式：先探测 local.yaml 既有键与仓现状，已配置项跳过问，决策问带推荐与依据

- config skill 操作流程（既有「看现状/对决策表/取值」探测骨架保留）**必须**补两段纪律：①已配置键（config cat 已显示的既有值）非用户主动要求**禁止**重新问询，仅在值需变更时向用户确认；②需用户决策的键（决策表触发但仓内事实取不到值的）**必须**带推荐+一手依据（探测到的仓库结构事实即依据）再问。

#### 场景：已配置跳过
Given local.yaml 已有 commands.test / When config 引导 / Then 不重问该键；用户未提及变更则整段跳过。

#### 场景：决策问带依据
Given 决策表触发 lint 键且仓内探测到 lint 脚本 / When 询问 / Then 推荐「取 package.json 的 lint 脚本」并附依据（探测事实），用户一词可接受。

### FR-03: 既有「一次只问一个」与 AskUserQuestion 交互规范保留不变

- init skill 的「一次只问一个问题」绝对规则与 AskUserQuestion 交互规范、config skill 的操作流程骨架**必须**逐字保留——三段式是问询前置与形态的增量，不替换既有规范。

#### 场景：规范保留
Given 改后两份 SKILL.md / When 审读 / Then「一次只问一个」「AskUserQuestion」「绝对规则」段全部在场。

### FR-04: 纯 skill 文本改动（不触 src/test），文本规范审读验收

- 本变更**必须**只改两份 SKILL.md 文本，**禁止**触及 src/test（纯提示词文本改动）；机器测试面**必须**记「不适用：理由=无机器可测行为面（金档只锁 stages prompt，不锁 .claude/skills）」，验收**必须**走对照 FR 清单的文本规范审读。

#### 场景：审读验收
Given 两份 SKILL.md 改后文本 / When 逐条对照 FR-01/02/03 审读 / Then 探测三查/分型问询/已定跳过/规范保留全部在场。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例」`；空行/待填在 flow done 拒收）

FR-01: 不适用：纯 skill 文本改动，验收=审读（探测三查/意图问开放/决策问带依据锚/已定跳过回放——四要素在场）
FR-02: 不适用：纯 skill 文本改动，验收=审读（已配置跳过/决策问带依据两纪律在场）
FR-03: 不适用：纯 skill 文本改动，验收=审读（「一次只问一个」与 AskUserQuestion 规范逐字保留）
FR-04: 不适用：本条即验收方式声明（无机器测试面）
