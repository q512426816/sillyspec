---
author: flow-machine-draft
created_at: 2026-10-12T14:06:41.953Z
---
# 需求规格（Requirements）— 2026-10-12-fire-dogfood-retrospective

## 功能需求

### FR-01: 报告落盘 docs/analysis/fire-equipment-dogfood-复盘-2026-10-12.md，含五节：样本概况 / 调用量化（子命令分布、重试密度、读源码猜格式次数）/ 门禁有效性正面清单（评审真拦截的缺陷实录）/ 问题-处置对照表（P1~P11 与本批四变更 commit 锚）/ 校准基线与遗留项

- 报告**必须**落盘于 docs/analysis/fire-equipment-dogfood-复盘-2026-10-12.md，五节齐全（样本概况 / 调用量化 / 门禁有效性正面清单 / 问题-处置对照表 / 校准基线与遗留项），对齐仓内 R16 系列带日期分析快照体例。

#### 场景：主路径

Given 四子代理分析回执在场；When 报告落盘；Then 五节标题齐全且每节有实数据（表/时间戳/commit 锚），无空节。

### FR-02: 报告内数据全部来自四子代理取证（时间戳/计数可回溯 full.json），不做无据推断

- 报告内全部计数与时间戳**必须**可回溯至会话导出 full.json 或四子代理回执（文末附回溯指引）；**禁止**无出处的推断性数字。

#### 场景：可回溯

When 抽查报告内任一数字；Then 能在子代理回执或 full.json 取证命令中找到同值出处。

### FR-03: docs-check skip 登记（R16 同级：带日期快照行号冻结），doc-ref-check 与 lint 复绿

- local.yaml docs-check.skip **必须**登记该报告路径（R16 同级先例：带日期快照行号冻结不动）；doc-ref-check **必须**复绿（含顺带修复的 platform-interface-map 行号漂移锚）；lint **必须**复绿。

#### 场景：校验绿

When `node test/doc-ref-check.test.mjs` 与 `npm run lint`；Then 分别输出全部通过。

### FR-04: 纯文档变更：实测面按仓规自动跳过（docs gate 判定）

- 本变更仅触及 docs/ 与机器级 local.yaml（gitignored），**必须**按仓规走纯文档判定（src/test 实测自动跳过）；交付提交用显式 pathspec（报告 + 重锚文档）。

#### 场景：收口

When flow done；Then docs gate 判定纯文档跳过实测，归档完成。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: 不适用：纯文档变更——判定面为报告五节标题齐全性（flow done docs gate 扫描）
FR-02: 不适用：纯文档变更——数据出处以文末回溯指引为准（full.json + 四子代理回执）
FR-03: test/doc-ref-check.test.mjs「93 处引用全通过（含新增 skip 登记与重锚）」
FR-04: 不适用：纯文档变更——docs gate 自动跳过实测（AGENTS.md 核心规则 4）
