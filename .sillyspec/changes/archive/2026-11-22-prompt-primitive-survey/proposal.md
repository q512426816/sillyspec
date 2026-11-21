---
author: flow-machine-draft
created_at: 2026-11-21T16:20:49.871Z
---
# 提案书（Proposal）— 2026-11-22-prompt-primitive-survey

## 动机

任务原话转写：盘点阶段提示词可抽取纪律原语
mattpocock/skills 调研吸收路线批 3a（docs/ROADMAP.md）：批 3c 指令层/证据层分离与 execute.js 1668 行膨胀的根治前置——先全量盘点 src/stages/ 下被多个阶段/步骤复用的纪律散文段，产出可抽取原语清单与 include 参数化需求，供批 3b/3c 直接引用。纯调研文档变更，不动 src/。
成功标准：
- docs/sillyspec/prompt-primitives-survey.md 落盘：纪律原语候选清单，每条含原语定位（文件+行号区间）、复用点清单（哪些阶段/步骤出现）、逐字或改写重复度、抽取优先级
- 清单区分「已由 templates/prompts/ 的 {{include:}} 机制承载」与「散文级重复待抽取」两类
- 含 include 参数化需求建议：哪些原语需要 focus/收窄参数（同一原语不同侧重形态），给出 {{include:name|focus=x}} 用法场景示例
- 纯调研文档，不修改 src/ 与 test/

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. docs/sillyspec/prompt-primitives-survey.md 落盘：纪律原语候选清单，每条含原语定位（文件+行号区间）、复用点清单（哪些阶段/步骤出现）、逐字或改写重复度、抽取优先级
2. 清单区分「已由 templates/prompts/ 的 {{include:}} 机制承载」与「散文级重复待抽取」两类
3. 含 include 参数化需求建议：哪些原语需要 focus/收窄参数（同一原语不同侧重形态），给出 {{include:name|focus=x}} 用法场景示例
4. 纯调研文档，不修改 src/ 与 test/

## 成功标准（可验证）

1. docs/sillyspec/prompt-primitives-survey.md 落盘：纪律原语候选清单，每条含原语定位（文件+行号区间）、复用点清单（哪些阶段/步骤出现）、逐字或改写重复度、抽取优先级
2. 清单区分「已由 templates/prompts/ 的 {{include:}} 机制承载」与「散文级重复待抽取」两类
3. 含 include 参数化需求建议：哪些原语需要 focus/收窄参数（同一原语不同侧重形态），给出 {{include:name|focus=x}} 用法场景示例
4. 纯调研文档，不修改 src/ 与 test/
