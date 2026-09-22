# 资产审计数据（2026-09-20）

机器生成，非手抄。每个数字都可复算：`node asset-audit.cjs` 重跑即得（脚本即方法）。

覆盖两仓：
- `sillyspec` = C:/Users/qinyi/IdeaProjects/sillyspec（本仓）
- `platform` = C:/Users/qinyi/IdeaProjects/multi-agent-platform（SillyHub 平台侧）

## 文件清单

| 文件 | 内容 |
|---|---|
| summary.json | 两仓全部汇总数字（唯一事实源） |
| sillyspec-archive.csv / platform-archive.csv | 归档变更逐条：名称、六件套文档齐缺 |
| sillyspec-quicklog.csv / platform-quicklog.csv | quicklog 逐条：ql-ID、时间、状态、标题 |
| sillyspec-fr.csv / platform-fr.csv | FR 需求索引逐条：来源变更、状态、最近确认 commit、commit 是否在 git 中存在 |
| sillyspec-modules.csv / platform-modules.csv | 模块文档逐文件行数 |
| sillyspec-gotchas.csv / platform-gotchas.csv | knowledge/ 下坑目/模式账本逐文件（gotchas 族+patterns/conventions/uncategorized）——**平台仓的真实坑目基础设施**（此前误按文件名找 troubleshooting.md 断言 0，已纠正） |
| sillyspec-troubleshooting.csv / platform-troubleshooting.csv | 排坑条目逐条标题（仅按 troubleshooting.md 文件名采集；平台侧真身在 gotchas 族） |
| sillyspec-knownissues.csv / platform-knownissues.csv | 已知问题账本逐条 |
| asset-audit.cjs | 生成上述一切的脚本（只读仓库，不改动任何文件） |
| extract-candidates.cjs | 从平台仓 quicklog 提取事故候选（根因含实证/坑/假红等信号） |
| platform-troubleshooting-candidates.csv | 87 条事故候选 backlog（倒序，分诊冷启动用）；mentions_test 为弱指示器 |

## 口径说明（防夸大）

- 「回归钉指标」= test 文件内容含 `回归钉|回归锁定|回归锁` 的文件数，是**指示器**不是精确计数（commit message 里的回归钉不在此列）。
- 测试文件数 = 全仓 `*.test.* / *.spec.*`，剔除 node_modules、构建产物、`.sillyspec`（运行态）、`.worktrees`（worktree 存储副本）、`.claude`（测试夹具仓）——副本不计入。
- FR「确认有效」= `最近确认` 的 commit 哈希经 `git cat-file -t` 验证真实存在；不验证场景语义本身。
- quicklog 状态按条目内 `状态：` 行原样统计。
- 归档「六件套」= proposal/requirements/design/tasks/verify-result/verify-facts.json 六文件齐备（平台仓多数走轻量档，缺属常态而非数据错误）。
- troubleshooting「编号坑目」= 标题形如 `## N.` 的条目；另有少量非编号小节。
- 本目录为分析产物，未纳入 git 跟踪，可整目录删除。

## 历史口径修正记录（防再犯）

1. v1：平台测试计 0 —— 采集面只扫根 `test/`，实际 monorepo 测试在 frontend/sillyhub-daemon 下。
2. v1：quicklog 460→459、模块文档 37→29（changelog 误计）、troubleshooting 67→66（非编号小节）。
3. v2：测试数混入 `.worktrees` 存储副本（2746 个）与 `.claude` 夹具仓（302 个），已加排除规则。
4. v3：「平台归档只 16/293 全档」为误读——212/293 五件套齐，缺的 verify-facts.json 是 2026-09-07 后新版才产的工件（版本时差非缺陷）。
5. v3：「平台无坑目账本」为误诊——真身在 `knowledge/`（sillyspec-gotchas 10 + testing-gotchas 6 + patterns 10 + uncategorized 39 = 65 条，另有 INDEX 关键词路由 74 行），按 troubleshooting.md 文件名采集致漏。
6. v4：「事故闭环薄、需补沉淀纪律」为误诊——①uncategorized.md 头部自述为设计内暂存箱（成熟后迁出分类文件+加 INDEX，INDEX 不索引本文件），39 条是流水线在制品非债务；②平台 .runtime 有 knowledge-hit-report.json / knowledge-hits.jsonl / friction-tally 与名为 knowledge-precipitation 的变更——工具的知识沉淀回路在平台仓已在跑；③候选抽样 7~24 多为一次性产品 bug（正确归宿=quicklog+测试+commit），机制坑（sillyspec CLI 坑）平台当日即登记。「蒸馏率低」是产品仓与工具仓的经济差异，非缺陷。
