---
author: flow-machine-draft
created_at: 2026-10-05T02:36:34.334Z
---
# 需求规格（Requirements）— 2026-10-05-dogfood-audit-fixes

## 功能需求

### FR-01: knowledge stats/classify/inbox 三子命令的 --json 判定必须兼读 opts.json（全局旗标正道）与 args.includes('--json')（直调兜底），经 index.js 真实调度的 --json 输出结构化 JSON

src/knowledge-stats.js cmdKnowledgeStats 的 asJson 与 src/knowledge-classify.js cmdKnowledgeInbox 的 wantJson 必须改为 `args.includes('--json') || opts.json === true`——index.js 顶层吞掉全局 --json 旗标后 filteredArgs 不含该旗标（src/index.js:2424 注释、src/stages/knowledge.js:654 digest 分支注释均确认此契约，digest 已用 opts.json 为正道），opts.json 是经真实 CLI 调度到达子命令的唯一旗标载体；args.includes 保留兜底直调/测试场景。禁止只查 args。实态修正：cmdKnowledgeClassify 经核实恒输出结构化 JSON（无模式判定、84 断言直调锁定），天然满足本条 Then 承诺，不在修复面。

#### 场景：真实 CLI 调度

- Given: 任一仓库有 knowledge 目录
- When: `sillyspec knowledge stats --json` 或 `sillyspec knowledge inbox --json`（--json 被 index.js 顶层吞进 opts.json）
- Then: 输出结构化 JSON（parse 得 ok 字段），不再是人类可读文本

#### 场景：直调兜底不回归

- Given: 测试直调 cmdKnowledgeStats(dir, ['--json'], opts)（无 opts.json）
- When: 调用执行
- Then: 仍输出 JSON（args.includes 兜底路径不变）

### FR-02: flow start 起草的 design.md 模板「文件变更清单」指引必须改为独立章节写法，与 parseFileChangeList 解析面一致（照新指引书写不再触发夹带嫌疑误报）

src/flow-draft.js design.md 模板的指引行必须改为指导写独立 `## 文件变更清单` 章节（含表格），与 src/change-list.js FILE_LIST_SECTION_RE 的章节标题识别一致；禁止继续指引「在接口契约节内加表」——该写法解析器认不出，flow done 会把本变更自己的交付文件误报「提交面夹带嫌疑」（2026-10-05-knowledge-stats-freshness 实测实证）。

#### 场景：照新指引书写可被解析

- Given: flow start 起草的 design.md 模板
- When: 按模板指引填写文件变更清单（独立章节 + 表格）
- Then: parseFileChangeList 能解析出清单路径，flow done 声明面归因无夹带误报

### FR-03: 单测覆盖：三子命令 opts.json 路径断言各至少一条；stats 加经 stages/knowledge.js cmdKnowledge 调度入口的端到端 JSON 断言；模板文案新指引在场

本变更必须以自动化单测锁定：① stats/classify/inbox 三子命令各至少一条 opts.json 路径断言（不带 --json arg、opts.json:true 仍输出 JSON）；② stats 一条经 stages/knowledge.js cmdKnowledge 调度入口（模拟 index.js 转发 { specDir, json: true }）的端到端 JSON 断言；③ flow-draft 模板断言新指引文案在场、旧指引退场。

#### 场景：主路径

- Given: test/ 各 fixture
- When: 跑项目测试入口
- Then: 上述断言全部通过

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/knowledge-stats.test.mjs「Test 9: opts.json 全局旗标路径 + cmdKnowledge 调度入口端到端」
FR-01: test/knowledge-inbox.test.mjs「cmdKnowledgeInbox opts.json 路径：无 --json arg 输出 JSON」
FR-02: test/flow-draft.test.mjs「design 模板文件变更清单指引=独立章节写法」
FR-03: test/knowledge-stats.test.mjs「Test 9 断言面收口（三子命令+入口+模板同变更覆盖）」
