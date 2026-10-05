---
author: flow-machine-draft
created_at: 2026-10-05T15:10:12.699Z
---
# 需求规格（Requirements）— 2026-10-05-input-teach-non-src

## 功能需求

> FR 由你撰写：每条 = `### FR-NN: 标题` + 一句带强度词的行为规定（必须=硬性；禁止=红线；
> SHOULD=建议须注理由；可以=可选）；边界情形加场景块 `#### 场景：名` + Given/When/Then 行。
> 标题行是成功标准锚（勿改写——收口做门柱对比）；正文与场景块归你。

### FR-01: CLAUDE.md、assets/command-cards/flow.md、run-quick.md 三处逐字可照抄分号形态清零，给出含「成功标准：」独立行与「- <可验证标准>」条目行的多行实例

CLAUDE.md、assets/command-cards/flow.md、assets/command-cards/run-quick.md 中禁止残留分号内联形态 `--input "<动机与背景；随后独立一行『成功标准：』；再每行一条『- <可验证标准>』>"`；三处必须给出含真实换行的可照抄多行实例（`成功标准：` 独立行 + `- <可验证标准>` 条目行），与 src 教学同口径。

#### 场景：主路径

- Given：Claude 会话读 CLAUDE.md 或命令卡（init 分发的 sillyspec:flow / sillyspec:run-quick 卡）
- When：agent 照抄卡内实例命令运行 flow start
- Then：extractSuccessCriteria 提取 ≥ 1 条成功标准，清晰度门放行

### FR-02: AGENTS.md 与 SKILL.md 两处描述式教学升级为可照抄实例；AGENTS.md 与模板源倒推行引号内联模糊形态改为引用过门格式的表述

AGENTS.md 过门格式说明行与 .claude/skills/sillyspec-flow/SKILL.md 的描述式教学必须升级为含真实换行的可照抄实例；AGENTS.md 选道表倒推行与模板源 templates/agents-instruction.md 同行的引号内联模糊形态 `--input "<已做改动的描述＋成功标准>"` 必须改为引用过门格式的表述（不再教引号内联形态）。

#### 场景：主路径

- Given：agent 从 AGENTS.md 过门格式说明或 sillyspec-flow SKILL.md 学 --input 写法
- When：照抄实例运行 flow start
- Then：提取 ≥ 1 条成功标准过门；倒推收尾场景 agent 按过门格式组织 --input（不再照抄模糊引号形态）

### FR-03: 零残留断言升级为 src 目录递归遍历，新增非 src 教学面零残留与实例在场断言

既有零残留断言必须从定点 6 文件升级为 src 目录递归遍历（评审 P3 处置——防新文件回流不捕获）；必须新增非 src 教学面断言：分号形态与倒推行模糊引号形态在 AGENTS.md/CLAUDE.md/assets/command-cards/、.claude/skills/、templates/ 零残留，逐字三处（CLAUDE.md/命令卡）与描述式两处（AGENTS.md/SKILL.md）实例组成部分在场。

#### 场景：主路径

- Given：本变更已合入
- When：向 src 新增含分号形态的文件、或向非 src 教学面回流感形态
- Then：测试失败（递归遍历与面锁定捕获）

### FR-04: 相关测试全部通过

本变更触达的测试面必须全部通过（含 input-teach-copyable 既有断言不回退）。

#### 场景：主路径

- Given：6 文件改动与测试升级已就位
- When：运行本变更测试集
- Then：全部 pass

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/input-teach-copyable.test.mjs「①b 非 src 教学面分号形态零残留（逐字三处）」
FR-02: test/input-teach-copyable.test.mjs「②b 非 src 教学面实例在场与模糊形态清零」
FR-03: test/input-teach-copyable.test.mjs「① 分号内联教学形态零残留（src 递归遍历升级）」
FR-04: test/input-teach-copyable.test.mjs 全量 + test/input-format-copy.test.mjs「② 教学点均带可照抄多行实例」
