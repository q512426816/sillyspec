---
author: flow-machine-draft
created_at: 2026-10-28T23:30:05.057Z
---
# 决策记录（Decisions）— 2026-10-29-metrics-routes

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：最大风险：**前缀误蹭/漏配**——路径段边界匹配写错会让 frontend/ 误吃 frontend-v2/ 的变更（假门红）或深路径漏命中（假跳过）。缓解：匹配算法钉死段全等语义（`file === p || file.startsWith(p.endsWith('/') ? p : p + '/')`），正反两向专测（误蹭负例 + 深路径命中正例）；解析器缩进语义随 modules 块坑史（任意非零缩进，不硬编码空格数）。 放弃的方案：① glob/通配路径——前缀集合已覆盖 monorepo 目录形态（modules 先例同口径），glob 引入 Windows 通配语义与转义复杂度，收益不成比例；② gate 并行执行——秒级 gate 串行总时长可控，并行放大资源峰值且输出交错难归因；③ 按语言扩展名自动路由（.ts→eslint、.java→PMD）——枚举开放世界违反规约 00（新语言要改 CLI），路径集合是仓主声明的中性事实；④ 路由复用 modules 块（modules.<name>.metrics 键）——modules 块语义是测试子集映射，混入指标门职责耦合两个机制的生命周期，独立段更清晰。 已知取舍：gate 命中子集注入 SILLYSPEC_CHANGE_FILES 是**该 gate 的命中文件**（非全变更面）——gate 内工具天然只看自己的域；需要全量的命令仍走单命令形态（共存）。
