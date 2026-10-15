---
author: flow-machine-draft
created_at: 2026-10-15T08:31:00.324Z
---
# 需求规格（Requirements）— 2026-10-15-brainstorm-interaction-refine

## 功能需求

### FR-01: 需求确认清单逐条带来源标记（用户原话/agent 推断两态），未确认过的推断点不得混入已确认清单

- 必须：brainstorm「对话式探索与需求澄清」步的输出要求中，需求确认清单明确要求**逐条标注来源**——用户原话得来的标 `[用户]`，agent 推断的标 `[推断]`；并写明未与用户确认过的推断点不得混入已确认清单。
- 必须：该步「正常完成」的逃逸口描述与来源标记口径挂钩——存在未确认推断点时不得仅凭「我觉得清晰」判完成。

#### 场景：清单标注两态

- Given：brainstorm 阶段「对话式探索与需求澄清」步的 prompt
- When：渲染该步 prompt
- Then：输出要求含 `[用户]` 与 `[推断]` 两态标记说明，且含禁止未确认推断点混入已确认清单的表述

#### 场景：旧口径已替换

- Given：该步 prompt 渲染结果
- When：检查「已确认需求点清单」的表述
- Then：该清单口径要求逐条带来源标记，不存在无来源标记要求的旧表述

### FR-02: 对话式探索支持分块回放：每轮输出含 200-300 字回放块（猜测标为猜测）+ 一句「哪里不对或漏了什么」，步骤保持 repeatableWait 语义

- 必须：该步 prompt 要求「理解到一块就先回放一块」——回放块 200-300 字，块内凡是猜测都标为猜测（只有用户说过的话才写成用户的），回放块结尾固定问一句「哪里不对或漏了什么」，再继续问下一块。
- 必须：明确回放与追问交替进行直到对话结束，不得把回放攒到最后一次性给出。
- 必须：该步保持 `repeatableWait` 语义不变（CLI 重入后每轮输出仍含回放块 + 一个追问）。

#### 场景：分块回放交替

- Given：该步 prompt 渲染结果
- When：检查回放相关表述
- Then：回放块量级（200-300 字）与「哪里不对或漏了什么」收尾问句在场，且表述为与追问交替进行

#### 场景：重复进入仍带回放

- Given：该步 definition
- When：读取 `repeatableWait`/`maxWaitRounds` 与增量汇报要求
- Then：repeatableWait 语义未被移除，增量汇报要求覆盖「新回放块 + 新追问」

### FR-03: 进入「提出 2-3 种方案」前：P1/P2 未决项为 0 或已记录为「我的判断」落 decisions.md

- 必须：该步 D 节执行规则明确三分——P0 歧义保持逐轮逐问；P1/P2 中 agent 能自定的自行决定并按决策落盘格式记入 decisions.md（answer 标注「我的判断」）；只有「只有用户能答且答案会改变产物」的项才在收尾时**一轮问完**。
- 必须：明确收尾轮之后不再追问（不做第二轮），并给出可判定出口：进入「提出 2-3 种方案」前 P1/P2 未决项为 0 或已记录为「我的判断」。

#### 场景：三分规则在场

- Given：该步 prompt
- When：检索 Grill 出口约束
- Then：含 P0 逐轮、P1/P2 自定并标注「我的判断」、只有会改变产物的攒一轮收尾三条

#### 场景：收尾不再追问

- Given：该步 prompt
- When：检查收尾轮规则
- Then：明确「问完即进入方案讨论、不做第二轮」

### FR-04: 分段展示设计输出含「我替你做的决定」节，条目来源为 decisions.md 中 source≠user 的条目

- 必须：「分段展示设计」步的输出要求新增一节「我替你做的决定」：逐条列出本次设计中非用户决定的条目（decisions.md 中 `source` 非 user 的条目，含代码/文档查证与 agent 自定两类），每条附一句依据。
- 必须：该节与现有 HTML 原型三选一必填、变更名格式约束并列，不替代任何既有必填项。
- SHOULD：条目命中 decisions.md 时引用 D-xxx@vN 编号，便于用户回查。

#### 场景：决策节在场

- Given：「分段展示设计」步 prompt
- When：检索输出要求
- Then：含「我替你做的决定」节与 source≠user 口径

#### 场景：不冲销既有必填项

- Given：该步输出要求的完整文本
- When：逐项核对
- Then：HTML 原型三选一必填仍在场，变更名格式约束仍在场

### FR-05: Design Grill 子代理派发 prompt 含实现者视角四要素（真身份/联系不到作者/只报猜错会出事的必须被回答项/显式跳过项与 nothing important left 出口），主代理回收后分三堆处理

- 必须：Design Grill 步的子代理派发 prompt 含实现者视角四要素：①你是一位有才华的 [领域] 工程师，被交予本设计文档去制定实现计划；②你联系不到文档作者；③只报告「必须被回答、否则得靠猜、猜错会出事」的问题，每条附「为什么答案会改变产物」并按重要性排序；④显式跳过文档已留给实现者的部分、自己能决定的、措辞挑刺，没有重要问题就回答 `nothing important left`。
- 必须：主代理回收后把 builder 问题分三堆处理——文档/对话已答（补进 design.md）、minor（自行决定并在 design.md 标注为「我的判断」）、只有用户能答且改变产物（攒一轮问完）。
- 必须：该实现者视角问题清单的去向有明确契约：写进 `review.json` 的 `reviewerNotes`（现有契约字段，不新增 schema 字段）。
- 禁止：不因本次改动修改 Stage Review Gate 的 review.json 校验逻辑与既有清单项。

#### 场景：子代理四要素在场

- Given：Design Grill 步 prompt
- When：检索实现者视角段
- Then：四要素逐项在场，含 `nothing important left` 出口字面

#### 场景：三堆分拣与指出口

- Given：Design Grill 步 prompt
- When：检索主代理回收动作
- Then：含三堆分类与「一轮问完」约束，并注明清单写入 reviewerNotes

#### 场景：gate 契约不变

- Given：本变更的 diff 面
- When：检查改动文件
- Then：不修改 `src/stage-review.js`

### FR-06: brainstorm 阶段 prompt 含自欺逃逸口对照表（三条：够清晰、太简单、用户说听起来不错）

- 必须：brainstorm 阶段 prompt 含对照表（左列念头/右列现实），三条对照：①「我觉得已经够清晰了」→清晰不等于用户确认过，未确认的点进清单必须标 `[推断]`；②「这步这么简单，跳过吧」→简单变复杂的路只有一条：跳过的步骤；③「用户说『听起来不错』」→认可的是你展示过的东西，你没写出来的描述不算批准。
- 必须：对照表落点明确（该步 prompt 内），且不与现有铁律冲突。

#### 场景：三条对照在场

- Given：brainstorm 阶段各步 prompt 汇总
- When：检索自欺逃逸口对照表
- Then：三条对照逐条在场（含 `[推断]` 与「不算批准」关键短语）

### FR-07: 发现规模超出当前档位时当场说明并给出升级建议（不改客观定价机制）

- 必须：brainstorm 阶段 prompt 含一条约束：对话或设计过程中若发现本次变更规模已超出当前档位（例如早期筛查判定的轻量面变成跨模块、需 Wave 编排），必须当场向用户说明并给出升级建议，不静默按原档继续。
- 必须：明确该约束不改动客观定价机制——档位仍由三轴定价计算，agent 只能建议不能自行升降档。

#### 场景：主动说明约束在场

- Given：brainstorm 阶段 prompt
- When：检索规模重估约束
- Then：含「超出当前档位 → 当场说明 + 给升级建议」表述

#### 场景：定价机制不被绕过

- Given：同一批 prompt
- When：检查相邻表述
- Then：明确档位仍由 CLI 客观定价，agent 只建议不落值

### FR-08: 变更自身测试面跑绿（node --test 相关用例），lint 通过

- 必须：新增 `test/brainstorm-interaction-refine.test.mjs`，对 FR-01 ~ FR-07 的 prompt 产物面逐条断言。
- 必须：变更触及的既有测试（`test/brainstorm-exit-thin-default.test.mjs`、`test/brainstorm-plan-contract.test.mjs` 等）保持全绿。
- 必须：`npm run lint`（`node test/check-syntax.mjs`）通过。

#### 场景：新测试覆盖七条 FR

- Given：`test/brainstorm-interaction-refine.test.mjs`
- When：`node --test` 运行
- Then：全部用例通过，且每条 FR 至少一条断言

#### 场景：既有面零回归

- Given：当前仓库测试套件
- When：收口 CLI 亲测
- Then：无新增失败（`test/known-failures.yaml` 既有失败不计入）

## 测试绑定（每条 FR 至少一行）

FR-01: test/brainstorm-interaction-refine.test.mjs「FR-01 来源标记两态」
FR-02: test/brainstorm-interaction-refine.test.mjs「FR-02 分块回放」
FR-03: test/brainstorm-interaction-refine.test.mjs「FR-03 Grill 出口三分」
FR-04: test/brainstorm-interaction-refine.test.mjs「FR-04 我替你做的决定」
FR-05: test/brainstorm-interaction-refine.test.mjs「FR-05 实现者视角四要素与三堆分拣」
FR-06: test/brainstorm-interaction-refine.test.mjs「FR-06 自欺逃逸口表」
FR-07: test/brainstorm-interaction-refine.test.mjs「FR-07 规模超档说明」
FR-08: test/brainstorm-interaction-refine.test.mjs「FR-01~07 全部用例 + 既有 brainstorm 测试绿」（lint 面：`npm run lint`，见 design.md 风险节）
