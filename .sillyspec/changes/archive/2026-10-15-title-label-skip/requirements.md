---
author: flow-machine-draft
created_at: 2026-10-15T03:34:08.898Z
---
# 需求规格（Requirements）— 2026-10-15-title-label-skip

## 功能需求

### FR-01: deriveChangeTitle 对「动机与背景：」独立段头行返回次行内容；「动机与背景：xxx」同行形态剥标签取 xxx；既有白名单剥离与成功标准截断行为不变

- deriveChangeTitle 必须跳过纯段头行（≤12 字非冒号内容 + 行尾冒号，如「动机与背景：」「变更背景：」）取下一个非空行；同行形态「动机与背景：真实标题」必须剥标签取余部；既有行为（首行概括、需求/动机/背景/任务/标题白名单剥离、「成功标准：」止、≤50 截断、空输入返回 ''）必须全部保持。

#### 场景：段头行跳过

- Given input 首行为「动机与背景：」次行为「修复登录超时」
- When deriveChangeTitle(input)
- Then 返回「修复登录超时」，且「变更背景：」「详细说明：」等未登记段头行同样跳过

#### 场景：既有行为回归

- Given input「需求：加筛选」（同行标签）、「成功标准：」首行、80 字长行、空串
- When deriveChangeTitle 逐一输入
- Then 分别返回「加筛选」/''/51 字截断（50+…）/''

### FR-02: flow done 模块变更索引回写摘要与标题同源（复用 deriveChangeTitle 提取链），段头行不再入摘要

- 模块变更索引回写摘要必须经 flow-parity.js motiveFromInput（内部 deriveChangeTitle）提取；段头行不得进入摘要；提取为空时必须回退变更名（非空串）。

#### 场景：段头免疫回写

- Given 变更 --input 首行为「动机与背景：」段头、命中模块图
- When flow done 模块索引回写
- Then 摘要列写入次行概括（非「动机与背景：」）；空 input 时摘要列=变更名

### FR-03: AGENTS.md/templates/SKILL/CLI 用法串的 --input 示例首行改为一句概括（消除段头诱导）

- AGENTS.md、templates/agents-instruction.md、sillyspec-flow SKILL.md、src/flow.js 与 src/index.js 的 --input 示例/用法串必须将首行占位从「动机与背景」改为「一句中文概括（即变更标题）」形态，仓内 grep 不得残留诱导段头占位示例。

#### 场景：模板对齐

- When 对六处文件 grep「--input "<动机与背景」与「<动机与背景>
」形态
- Then 零命中（说明性提及「动机与背景」概念的散文不在此列）

### FR-04: 进度库 6 个「动机与背景：」title 与 stages.changelog.md 1 行摘要修复为真实概括

- 进度库 changes.title 中字面为「动机与背景：」的行（实测 6 行）必须逐行 UPDATE 为取自该变更归档件的真实概括（≤50 字）；stages.changelog.md 中 legacy-renumber 行摘要列必须同步修复；修复必须留 before/after 回执（落本变更目录随归档）。

#### 场景：存量清偿

- Given 进度库 6 行 title=「动机与背景：」、stages.changelog.md 1 行摘要=「动机与背景：」
- When 执行数据修复
- Then 复查 SELECT 零残留、changelog 行为真实概括、回执文件含逐行 before/after

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/change-title-flow.test.mjs「⑤ 段头行跳过与复合词剥离（动机与背景形态免疫）」
FR-02: test/motive-from-input.test.mjs「motiveFromInput：段头行免疫取次行/空提取回退变更名/与 deriveChangeTitle 同源」
FR-03: 不适用：文档与用法串措辞（纯配置/文档面），可判定式为 FR-03 正文 grep 断言，验收靠收口 scope audit 与人工复核
FR-04: 不适用：一次性数据修复操作（进度库 gitignored 不进测试面），可判定式为 FR-04 正文复查断言，回执留档为证
