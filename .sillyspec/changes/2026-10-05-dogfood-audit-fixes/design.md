---
author: flow-machine-draft
created_at: 2026-10-05T02:36:34.334Z
---
# 设计记录（Design Record）— 2026-10-05-dogfood-audit-fixes

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）？

两处 --json 判定（knowledge-stats.js cmdKnowledgeStats 的 asJson、knowledge-classify.js cmdKnowledgeInbox 的 wantJson）各改一行：`args.includes('--json') || opts.json === true`。修复面在实现文件而非 stages/knowledge.js 调度层——调度层（cmdKnowledge）已把含 .json 的 opts 原样转发（index.js:3027 `{ specDir, json }` → cmdKnowledge → 各分支 `mod.cmdXxx(dir, args.slice(1), opts)`），断点在实现文件不读 opts.json；对齐 digest 分支既有惯例（stages/knowledge.js:654 注释「opts.json 为正道，rest 兜底」）。cmdKnowledgeClassify 经核实恒输出 JSON（无模式判定），不在修复面。模板指引改 flow-draft.js:276 一行：指引从「接口契约节内加表」改为「独立 ## 文件变更清单 章节 + 表格」，与 change-list.js FILE_LIST_SECTION_RE 的章节识别面一致。

为什么不改解析器兼容节内写法：解析器是多个消费方（stage-contract/scope-audit/design-frs）共用的单一真相源，brainstorm 完整道模板本就是独立章节形态；薄模板指引是离群写法，改指引回归主流形态，影响面最小。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- cmdKnowledgeStats / cmdKnowledgeInbox 的 opts 形参新增消费 opts.json（布尔）——签名不变，行为变化：经真实 CLI `sillyspec knowledge stats --json` / `knowledge inbox --json` 从「人类可读（旗标丢失）」变为「结构化 JSON」
- flow start 起草的 design.md 模板指引行文案更新（接口契约节模板注释），对已起草变更无追溯影响
- 其余接口无变化

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/knowledge-stats.js | asJson 兼读 opts.json |
| 修改 | src/knowledge-classify.js | cmdKnowledgeInbox wantJson 兼读 opts.json |
| 修改 | src/flow-draft.js | design 模板文件变更清单指引改独立章节 |
| 修改 | test/knowledge-stats.test.mjs | Test 9：opts.json 路径 + cmdKnowledge 调度入口端到端 |
| 修改 | test/knowledge-inbox.test.mjs | cmdKnowledgeInbox opts.json 路径断言 |
| 修改 | test/flow-draft.test.mjs | 模板新指引文案断言 |

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   不适用：无事件流/时序输入面——三个判定是同步参数读取，参数在调用时刻已定。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   不适用：判定逻辑纯参数布尔求值，无共享可变状态；命令体本身的只读/写面不在本变更范围。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   不适用：无新增状态落盘；修复是判定表达式变化，中断语义与原先完全一致。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   不适用：opts.json 是进程内调用链传参（index.js→stages/knowledge.js→实现文件），无跨进程/跨仓面；模板文案是静态字符串。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：行为修复让「原先静默降级为人类可读」的调用方（若依赖旧错误行为的脚本）突然收到 JSON——属暴露既有契约而非破坏；排查过 index.js 全局解析后 filteredArgs 不含 --json，无其他调用方向实现文件传 json 的路径，影响面封闭在三个子命令。
试过放弃：改 stages/knowledge.js 调度层把 opts.json 注入 args（--json 塞回 args 数组）——污染 args 语义（args 反映用户输入而非程序状态），且 digest 已确立 opts.json 直读惯例，放弃。
