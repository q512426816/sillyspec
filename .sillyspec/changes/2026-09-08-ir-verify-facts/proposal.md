---
author: qinyi
created_at: 2026-09-08 23:04:28
---
# 提案书（Proposal）

## 动机

verify 阶段证据链的三个弱判定门（requiredEvidence 子串自述、集成证据 literals 蹭词、facts 底稿无过期检测）与 09-05 IR 方案的 P3b 收口目标之间的差距。测试维度已下沉 CLI 实测，证据维度仍靠 agent 散文自述——门禁强度不对称；且 P3d（archive delta 回灌、增量 scan）需要 verify 域结构化数据源，当前 verify-facts.json v1 只有探针指标。

## 关键问题

1. **cannot_verify 死链**：execute 标记 cannot_verify 的任务写出 verify-required-evidence.json，verify 侧只查「verify-result.md 是否提及 task id」（includes 子串 + advisory 不阻断）——requiredEvidence 是否兑现无机器判定（task-review.js 注释自认仅提示人工复核）。
2. **集成证据蹭词**：checkIntegrationEvidence 按字面正则匹配散文（'端到端'/'docker up' 等），integration-critical 门控可被措辞绕过——高风险变更缺真实集成证据照常 PASS。
3. **facts 底稿可过期**：checkProbeConsistency 重跑探针只与 md 正文锚点对账、不与 facts 快照比对——md 被手改对齐新代码后 facts 过期无人发现，P3d 将消费过期数据。

## 变更范围

扩展 verify-facts.json 至 schemaVersion 2（conclusion/tests/requiredEvidence/runtimeEvidence/factsConsistency 五段，CLI 全权写 + 判断层槽录入固化）；requiredEvidence 升级为分类核验（代码类走 文件存在×mtime×diff 交集，运行时产物类豁免 diff）+ cannot_verify 硬门；集成证据改回执槽一致性校验（绿判据可测）；checkProbeConsistency 增 facts 基线对比维度；schema 单点新模块 verify-facts-schema.js；verify.js step2/step7 槽位指引与文档同步。文件清单 8 src 修改 + 1 新增 + 3 测试 + docs（见 design.md）。

## 不在范围内（显式清单）

- Wave 派生化、archive 收口机械化、doctor 折叠、decisions/四件套骨架预生成（各自独立后续变更，D-002）
- lint 门禁强度调整（D-004：观察期计数已落地，本变更只消费）
- 集成命令 CLI 代跑（D-003：等 commands.integration 配置入口）
- 讨论型内容 IR 化、全量替换 markdown 产物（09-05 §7）
- quick 流程改造（quick 无 verify 阶段）

## 成功标准（可验证）

- 存量变更（无槽 md / facts v1）行为不变：legacy 降级路径 + 迁移 warning，零阻断
- cannot_verify 任务：requiredEvidence 无豁免 missing → verify --done 被阻断；豁免/核验通过 → 正常完成
- integration-critical 变更：无绿回执（logPath 缺失/mtime 出窗/签名命中/exit≠0）→ ERROR
- facts 手改探针指标对齐新代码后 --done：facts 基线对比按 probe1/6=ERROR / probe3/5=WARNING 报出
- re-init（--done 回填后再 --init）：conclusion/tests/evidence 固化段保留，probes 刷新
- 全部新判定有单测覆盖（三个新测试文件）
