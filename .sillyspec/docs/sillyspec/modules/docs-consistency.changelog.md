---
schema_version: 1
doc_type: module-changelog
module_id: docs-consistency
author: qinyi
created_at: 2026-08-24T00:40:00+08:00
updated_at: 2026-08-24T00:40:00+08:00
---

# docs-consistency 变更索引（changelog sidecar）

> 模块卡的变更索引历史条目迁出至此（卡正文保持精简，降低子代理读取税）；新条目追加到表尾，勿堆回卡正文。

| 日期 | 变更名 | 摘要 |
|------|--------|------|
| 2026-08-23 | 2026-08-23-adopt-harness-practices | docs-check 新增决策规则族 runDecisionRules（async advisory：implemented 条目锚点存在性 + 锚定模块源码 behind 超阈值复核，decisions.behind_threshold 缺省 10；known_failures 新增 decisions.* 命名空间豁免，规则级/条目级伞形；不进 ok/invalid 阻断链、只读零写盘、无信号零输出）+ readDecisionRulesConfig；docs-debt 新导出 computeModuleBehind（单模块 behind 计数，与 moduleDebt 共用口径单一真相源，不改现有行为）；**新增源文件 src/decision-distill.js 归属本模块**（决策提炼纯函数：parseDecisions + distillIntoKnowledge，rejected 优先留痕/needsWait/域三级兜底/幂等），paths 已补进 _module-map.yaml。消费者：doctor 决策待复核步骤、verify evidence-auto 推荐链、archive decision-distill 步骤。 |
- 2026-09-07-endpoint-baseline | archive-delta 第五源：endpointBaseline（fail-soft）+ 现算同口径 × diffEndpointSets → After「### 端点基线提示」四态（增删表/无增删/无基线降级/现算不可得）；门控与标题不动。
- ql-20260908-008 | 新增 autoReanchorDocRefs（--fix 主链路编程化封装：fixable 命中 → applyFixes → 同口径复跑回执），quick --done 检出引用失效时自动重锚并落「🔧 行号漂移已自动重锚」审计行；歧义/零命中仍留人工（无 --force 红线不变） |
- ql-20260908-010 | generateModuleImpactSkeleton 增声明来源入口（sourceFiles+origin 参数，plan --done 首版用 design 文件变更清单——代码未写无 diff；diff 来源语义不变）；卡补 module-impact.js 契约行（此前 map 已归属但表格漏登）
- 2026-09-11-cross-change-decision-guard | decision-distill 增「文件：」字段契约：applyField/FIELD_LABEL_RE 增「文件|files」标签（parseListValue 切分 + 逐项 POSIX 归一），renderBlockLines 锚点行后条件渲染「文件：」行（仅非空才渲染）——存量决策无该字段零迁移；决策→文件映射经 knowledge-match matchDecisionsByFiles 进 quick 语义护栏反查链。
| 2026-10-13 | 2026-10-13-proto-reuse-register | fire-equipment 实证暴露规则缝隙：用户已提供可复跑 HTML 原型时，brainstorm 原型分级无「复 |
| 2026-10-13 | 2026-10-13-proto-real-code | 用户实证：brainstorm 生成的原型是手绘假 HTML，与实际前端代码栈不搭。根因是规则自相矛盾：ui-visua |
| 2026-10-14 | 2026-10-14-scale-large-evidence | 镜像误判根治（用户批准的方案原文）：给 brainstorm Step 8 的 large 判据加反判据——「跨多端/多 |
| 2026-10-14 | 2026-10-14-supersedes-mislink-and-change-display | docs-check parseDecisionEntries 加法字段 change（「变更：」行读入）+ docs-debt 触碰事实行渲染变更名限定（decisionChangeQualifier）——触碰条目同号可区分 |
| 2026-10-14 | 2026-10-14-decision-id-p2-hardening | docs-check：parseDecisionEntries 增「来源：」兜底 + isDecisionExempt 域限定键 decisions.<域>/<id>[.<kind>]（裸键兼容、导出、emit 传域——一条裸键豁免全库同号的潜伏面收窄）；decision-distill：splitKnowledgeSections 来源回退（带来源 legacy 段参与同变更匹配，重蒸馏在位更新收敛） |
| 2026-10-14 | 2026-10-14-decision-global-id-epoch | 决策号 epoch 全局化（写面）：decision-distill 新蒸馏条目发全局号 D-<域>-NNN@vN（域前缀全域 max+1 只增不复用、批内递增防撞号）+「原编号：」溯源字段（变更后/锚点前）；幂等谓词扩展（号或原编号）、多域扇出单一身份（迁域不换号）、跨文件清理同谓词；存量 legacy 零触碰（真实库副本演练 700+ 节段逐字节不变）；docs-check 标题双形态 |
| 2026-10-14 | 2026-10-14-decision-legacy-renumber | 存量决策号一次性迁移（用户裁决翻「不回填」旧案）：src/decision-renumber.js 迁移工具（planRenumber/applyRenumberPlan 纯函数 + knowledge renumber --dry-run/--apply CLI）；真实库执行 701 legacy 节段→597 全局号（fanout 75 组单一身份、epoch 零触碰 1）；docs-check 读原编号 + isDecisionExempt 认原编号（消费仓旧裸键兼容） |
| 2026-10-15 | 2026-10-15-module-path-glob-match | 用户实测发现（平台仓）：FR 沉淀持续落 auto-* 伪域（7 个域 92 条全是近两天新变更）、… |
| 2026-10-15 | 2026-10-15-ui-proto-form-config | 四例原型形态偏档（fire-equipment/deploy-release-notes/knowl… |
| 2026-10-15 | 2026-10-15-decision-anchor-backfill | 效果评估实证（用户问「新变更图谱为何不关联代码」）：决策↔代码的图谱边唯一来源是条目「锚点：」字段，… |
| 2026-10-18 | 2026-10-18-runtime-relayout | runtime 目录分层重排与归档回收 |
| 2026-10-20 | 2026-10-20-cli-worktree-cwd-anchor | CLI worktree 内跑自动锚定主仓根 |
| 2026-10-20 | 2026-10-20-decision-caliber-unify | 决策类型状态口径单一源统一 |
| 2026-10-20 | 2026-10-20-distill-abnormal-upgrade-fix | 修复蒸馏异态升厚触发器死代码 |
| 2026-10-20 | 2026-10-20-proto-provenance-hardline | dsh 会话 sess_a6c2804d 实证（用户裁决：平台仓不应单独做事，一切由工具引导驾驭）：… |
| 2026-10-21 | 2026-10-21-brainstorm-proto-worktree | 头脑风暴原型期早进工作树协议 |
| 2026-10-21 | 2026-10-21-known-failures-unescape | known_failures 三读侧 YAML 反转义对称 |
