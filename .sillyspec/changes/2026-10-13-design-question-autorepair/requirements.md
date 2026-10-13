---
author: flow-machine-draft
created_at: 2026-10-13T01:38:53.883Z
---
# 需求规格（Requirements）— 2026-10-13-design-question-autorepair

## 功能需求

### FR-01: design 四问问题行漂移（节标题在场）时 flow done 工件校验不再拒收：机器按 ledger 锚逐字回填问题行并出 advisory 留痕，重跑校验通过

- 系统 MUST 在 verifyThinDocsV2 检测到 design 问题行不在场且其节标题在场时，按锚（ledger.anchor.designQuestions，缺省回退 DESIGN_QUESTIONS）逐字回填该问题行后落盘继续校验，禁止再以此情形出 violations；每次回填 MUST 记入返回值 repairs 列表（含节名与原文），禁止静默修复零留痕。

#### 场景：主路径

Given 已作答的 v2 变更 design.md 中某问题行被整文件重写改述（节标题与作答保留）
When flow done 工件校验（verifyThinDocsV2）执行
Then design.md 中该问题行已被锚内原文逐字替换/插入，violations 不含「问题文本被改写」，repairs 含对应留痕条目，重跑校验 violations 为空且 repairs 为空

### FR-02: 回填零数据丢失：改述行按字符 bigram 相似度定位原位替换（阈值以上才替换），定位不到时插在节首，绝不删除 agent 书写的答案行

- 回填 MUST 以字符 bigram Jaccard 相似度（去空白）在该节节体内定位改述行，仅最高相似度 ≥0.5 且不在排除集（任何锚问题行/标题/本轮回填已用行）时原位替换；否则 MUST 在节标题后插入锚原文（附空行分隔）；两条路径均禁止改动或删除节内其他任何行（agent 答案行原样保留）。

#### 场景：高相似改述原位替换

Given 节内问题行被轻度改述（如插入/替换个别词，bigram 相似度 ≥0.5）
When 回填执行
Then 该行被锚原文原位替换，节内其余行（含答案与低相似改述）字节不变

#### 场景：低相似/删除改述节首插入

Given 节内问题行被删除或改述到相似度 <0.5
When 回填执行
Then 锚原文插入节标题之后，原节内所有行保留在场，无任何行被删除

### FR-03: 仍拒收的场景（节被删/节未作答/回填后仍缺）文案带锚内问题完整原文，不再 30 字截断

- 仍拒收的场景（节被删/节未作答/回填写盘失败降级）的 violations 文案 MUST 携带锚内问题完整原文（整句不截断），禁止 slice(0,30) 截断形态出现在问题引用面。

#### 场景：节被删拒收文案

Given design.md 某节整体被删（标题缺失）
When verifyThinDocsV2 执行
Then violations 含该节被删条目且内嵌该节全部问题的完整原文（可整段照抄恢复）

### FR-04: 回填幂等：对已恢复文件重跑 verifyThinDocsV2 零二次改写、零新增 advisory

- 对已完成回填的 design.md 重跑校验 MUST 幂等：文件内容零二次改写（字节不变）、repairs 与 advisories 零新增。

#### 场景：重跑幂等

Given 一次校验已完成回填并通过
When 再次调用 verifyThinDocsV2
Then design.md 字节不变，返回值 repairs/advisories 均为空

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/thin-docs-v2.test.mjs「① 四问单一源：起草含常量逐字；问题被改写 → 拒收」（改写为回填语义）＋「⑦ 问题行漂移机器回填：boundaries 四问全改述 → 回填过门零拒收」
FR-02: test/thin-docs-v2.test.mjs「⑦ 高相似原位替换/低相似节首插入双路径断言（答案行保留）」
FR-03: test/thin-docs-v2.test.mjs「⑦ 节被删文案含问题完整原文（无 30 字截断）断言」
FR-04: test/thin-docs-v2.test.mjs「⑦ 重跑幂等：二次调用零改写零 repairs/advisories」
