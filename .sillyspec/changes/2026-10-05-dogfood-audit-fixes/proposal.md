---
author: flow-machine-draft
created_at: 2026-10-05T02:36:34.334Z
---
# 提案书（Proposal）— 2026-10-05-dogfood-audit-fixes

## 动机

任务原话转写：动机：对轻量变更流程做了一次全链路实测（2026-10-05-knowledge-stats-freshness，已归档），发现两处可即刻修复的缺陷：① knowledge stats/classify/inbox 三个子命令的 --json 判定只查 args.includes('--json')，而 --json 是全局旗标、index.js 顶层吞掉（src/stages/knowledge.js:654 digest 分支注释与 src/index.js:2424 注释均确认），经真实 CLI 调用时旗标永远到不了子命令——sillyspec knowledge stats --json 实测输出人类可读格式，单测直调函数绿但端到端断链（测试面与 CLI 调用面盲区）；② flow start 起草的 design.md 模板指引（src/flow-draft.js:276）让把「文件变更清单」表写在「接口契约」节内，而 flow done 收口的声明面解析器（src/change-list.js:97 FILE_LIST_SECTION_RE）只认独立 ## 文件变更清单 章节——照指引写会被误报「提交面夹带嫌疑」，把本变更自己的交付文件指认为并行会话在途交付。其余实测发现（归档原子提交残缺、patch 过期不重算）锚在 src/flow.js，该文件当前有并行会话在途修改，本轮不触碰。改动面：src/knowledge-stats.js + src/knowledge-classify.js（--json 判定兼读 opts.json，对齐 digest 惯例）+ src/flow-draft.js（模板指引改独立章节）+ 对应测试。
成功标准：
- knowledge stats/classify/inbox 三子命令的 --json 判定必须兼读 opts.json（全局旗标正道）与 args.includes('--json')（直调兜底），经 index.js 真实调度的 --json 输出结构化 JSON
- flow start 起草的 design.md 模板「文件变更清单」指引必须改为独立章节写法，与 parseFileChangeList 解析面一致（照新指引书写不再触发夹带嫌疑误报）
- 单测覆盖：三子命令 opts.json 路径断言各至少一条；stats 加经 stages/knowledge.js cmdKnowledge 调度入口的端到端 JSON 断言；模板文案新指引在场

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. knowledge stats/classify/inbox 三子命令的 --json 判定必须兼读 opts.json（全局旗标正道）与 args.includes('--json')（直调兜底），经 index.js 真实调度的 --json 输出结构化 JSON
2. flow start 起草的 design.md 模板「文件变更清单」指引必须改为独立章节写法，与 parseFileChangeList 解析面一致（照新指引书写不再触发夹带嫌疑误报）
3. 单测覆盖：三子命令 opts.json 路径断言各至少一条；stats 加经 stages/knowledge.js cmdKnowledge 调度入口的端到端 JSON 断言；模板文案新指引在场

## 成功标准（可验证）

1. knowledge stats/classify/inbox 三子命令的 --json 判定必须兼读 opts.json（全局旗标正道）与 args.includes('--json')（直调兜底），经 index.js 真实调度的 --json 输出结构化 JSON
2. flow start 起草的 design.md 模板「文件变更清单」指引必须改为独立章节写法，与 parseFileChangeList 解析面一致（照新指引书写不再触发夹带嫌疑误报）
3. 单测覆盖：三子命令 opts.json 路径断言各至少一条；stats 加经 stages/knowledge.js cmdKnowledge 调度入口的端到端 JSON 断言；模板文案新指引在场
