---
author: flow-machine-draft
created_at: 2026-11-21T16:20:49.871Z
---
# 需求规格（Requirements）— 2026-11-22-prompt-primitive-survey

## 功能需求

### FR-01: docs/sillyspec/prompt-primitives-survey.md 落盘：纪律原语候选清单，每条含原语定位（文件+行号区间）、复用点清单（哪些阶段/步骤出现）、逐字或改写重复度、抽取优先级

- 必须落盘 `docs/sillyspec/prompt-primitives-survey.md`：全量扫 `src/stages/*.js` 产出的纪律原语候选清单；每条必须含原语定位（文件+行号区间）、复用点清单、重复度（逐字重复/改写重复）、抽取优先级（高/中/低）。入册门槛：同一纪律段必须被 ≥2 个阶段或步骤承载（复用即候选）。

#### 场景：主路径

- Given 批 3b/3c 需要抽取原语与瘦身 prompt
- When 读本清单
- Then 每条候选可直接按定位（文件+行号）找到原文，按优先级排序施工

### FR-02: 清单区分「已由 templates/prompts/ 的 {{include:}} 机制承载」与「散文级重复待抽取」两类

- 清单必须区分两类：已被 `templates/prompts/` `{{include:}}` 机制承载的原语（现状盘点，标注被哪些步骤引用）与仍在各步骤 prompt 内散文级重复、待抽取的原语（增量机会）。

#### 场景：主路径

- Given 读者想知道增量抽取面在哪
- When 查清单分类列
- Then 两类不混排，待抽取类即批 3b 施工面

### FR-03: 含 include 参数化需求建议：哪些原语需要 focus/收窄参数（同一原语不同侧重形态），给出 {{include:name|focus=x}} 用法场景示例

- 必须含 include 参数化需求建议：识别哪些原语存在「同一纪律、不同侧重」的改写形态（如审查纪律在 brainstorm/execute/verify 各有收窄），必须给出 `{{include:name|focus=x}}` 的用法场景示例（每形态一条场景），供批 3b 的 `resolvePromptIncludes` 参数化改造直接引用。

#### 场景：主路径

- Given 批 3b 设计参数化语法
- When 读参数化需求节
- Then 每个需要参数的原语有具体场景示例，无须重新调研

### FR-04: 纯调研文档，不修改 src/ 与 test/

- 本变更必须只新增 `docs/sillyspec/prompt-primitives-survey.md` 与治理工件，禁止修改 src/ 与 test/ 下任何文件。

#### 场景：主路径

- Given 收口采集 diff 面
- When 冻结对账执行
- Then 交付面不含 src/、test/ 路径

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: 不适用：纯调研文档产出，无代码行为面，验收靠收口 diff 核对清单结构齐备
FR-02: 不适用：纯调研文档分类要求，验收靠收口 diff 核对两类分区
FR-03: 不适用：参数化需求建议属设计输入，验收靠收口 diff 核对场景示例在文
FR-04: 不适用：约束性条款，验收靠收口 diff 核对无 src/test 交付文件
