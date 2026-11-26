---
author: qinyi
created_at: 2026-11-14 22:03:09
generated_by: sillyspec-fourpiece-init
---
# 提案书（Proposal）

## 动机
scan 文档靠 agent 通读代码库全量生成，成本高 → 不常重扫 → 文档腐烂。multi-agent-platform 仓基线落后 5352 commit / 143 天，CLI 每次警告"旧快照可能未收录新模块"；约 1300 行 scan-diff/staleness/refresh/postcheck 都在治"过时"的标，根因（全量重扫太贵）未除。CodeGraph 1.6.2 本地代码索引已就绪（4067 文件 7.1s 索引实测），具备"按变化补扫"的基础设施条件。

## 关键问题
1. 全量重扫 token/耗时成本随仓库规模线性增长，大仓实际上不会重跑——scan 文档结构性腐烂。
2. 既有增量手段（scan-refresh）是引用级定点修补：检出极限=只发现带 file:line 引用的过期陈述，结构性变化（新模块/新路由/目录重组）不在其保证范围。
3. `_module-map` 的 paths 覆盖盲区无对账机制——未归属文件静默存在，模块索引完整性无检查面。

## 变更范围
- 新增 codegraph 适配层（src/scan-codegraph.js：探测三态/超时分级/Windows cmd-shim/形状映射，fail-soft）
- 新增增量计划计算层（src/scan-incremental.js：基线锚/变化集/模块归属/篇章影响映射/`_module-map` 对账/软门）
- scan 编排增量分支（stages/scan.js 四生成步骤 + run/command.js flags + run/scan-profile.js 探测输出与收口统一 bump + scan-facts.js scope 限定）
- 单测（mock 注入）+ 跨仓实测验收（multi-agent-platform 增量 vs 全量对比；无索引空仓降级零回归）

## 不在范围内（显式清单）
- 不改动 scan-refresh（命令面/行为/guard 协议）——引用级修补通道互补保留（D-001）
- 不改 scan 文档契约与消费方（7 份文档结构/frontmatter/docs-check/modules rebuild/进度库读取）
- 不做模块归属语义自动化——索引只供结构事实，新文件归属由 agent 补扫时判断（C3）
- 不引入 codegraph 安装/索引维护编排（init/index/sync 生命周期管理归用户/平台）
- 不做 scan 文档内容质量改进

## 成功标准（可验证）
- multi-agent-platform 仓实测：增量 scan 只重写受影响模块文档（对比全量产物 diff，未受影响模块文档零变化），耗时与 token 相比全量显著下降（给实测数字）
- 未装 CodeGraph 的临时空仓：scan 行为与现行版本完全一致（降级零回归）
- `_module-map` 对账报告列出真实未归属文件（与手工抽查一致）
- 既有 scan 相关测试（scan-diff/staleness/refresh/postcheck）零回归
