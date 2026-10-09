---
author: flow-machine-draft
created_at: 2026-10-09T15:09:26.255Z
---
# 需求规格（Requirements）— 2026-10-09-rejected-write-side

## 功能需求

### FR-01: brainstorm 方案选择步新增指令：用户选定后落选方案各记一条 rejected 条目（question 复用取舍问句、否决理由=当轮劣势与成本、复潮条件=劣势消解/成本反转前提）

- 「提出 2-3 种方案」步的操作清单**必须**含落选方案供料指令：用户选定方案后，每个落选方案各记一条 rejected 条目——question 复用同一取舍问句、否决理由记该方案当轮的劣势与成本、复潮条件记劣势消解或成本反转的前提。

#### 场景：主路径

- Given：brainstorm 运行至「提出 2-3 种方案」步
- When：渲染该步 prompt
- Then：操作清单第 6 条为落选方案各记 rejected 条目的完整指令（含字段要求与「埋散文进不了通道」的理由）

### FR-02: brainstorm 对账步把放弃方案列入漏网补记之列（未记 rejected 的此时补记）

- 「写设计文档」步的对账规则**必须**把放弃方案列入漏网补记：「提出方案」步的落选方案若未各记 rejected 条目（否决理由/复潮条件必填），对账时补记。

#### 场景：主路径

- Given：decisions.md 存在但落选方案未记 rejected 条目
- When：写设计文档步执行对账整理
- Then：对账指令要求按「放弃方案属漏网」补记 rejected 条目，字段不缺

### FR-03: flow 收割提示行（flow.js 槽4 console.log）与 /sillyspec:flow skill 均定性收割稿为底稿：槽4 作答含放弃方案的，收口前拆成 rejected 条目

- flow 轻量道收割面**必须**定性收割稿为底稿：flow done 槽4 收割提示行与 /sillyspec:flow skill「直接干活」节均声明——frontmatter author: flow-machine-draft 的 decisions.md 是底稿不是终稿，槽4 作答含「放弃方案」的收口前拆成独立 rejected 条目（问题=决策专属问句、否决理由=放弃理由、复潮条件=重提前提），风险与对策留主条目；无实质放弃方案则不动。

#### 场景：主路径

- Given：flow 变更目录存在收割生成的 decisions.md（author: flow-machine-draft）
- When：agent 读取 flow done 收割提示行或 /sillyspec:flow skill 指引
- Then：两处均含底稿定性与拆 rejected 条目的字段级指引

### FR-04: docs/prompt 镜像经 _extract/_sync/_verify 流水线全绿（brainstorm.md fence 与 src 逐字一致）

- docs/prompt 镜像**必须**与 src 逐字一致：src/stages/brainstorm.js 改动后，`node docs/prompt/_extract.mjs && node docs/prompt/_sync.mjs brainstorm && node docs/prompt/_verify.mjs` 流水线跑通，brainstorm 节全部 fence 与 _extracted.json 逐字相等（7/7 零未匹配）。

#### 场景：主路径

- Given：src/stages/brainstorm.js 已含 FR-01/FR-02 的 prompt 改动
- When：依次执行 _extract / _sync brainstorm / _verify
- Then：brainstorm 节 json 有 prompt 步骤数 = md fence 块数，逐字匹配零 ❌

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: 不适用：prompt 指令文本无单测断言面（锁文案即锁死演进）；行为回归由 flow done 推断测试面（brainstorm-closure-gates / brainstorm-plan-contract 等套件，本次已跑 17 例全绿）覆盖
FR-02: 不适用：同 FR-01——prompt 文本面，无独立单测面
FR-03: 不适用：console 提示文案与 skill 文档无行为断言面；flow.js 既有行为由 flow 系列套件（change-title-flow / flow-draft-binding-extract 等，本次已跑全绿）回归
FR-04: 不适用：校验器是 docs/prompt/_verify.mjs 脚本本体（本次运行 brainstorm 7/7 逐字匹配零 ❌），非 test/ 套件
