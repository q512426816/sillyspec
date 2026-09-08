---
author: qinyi
created_at: 2026-09-08 23:04:28
---
# 需求规格（Requirements）

## 角色

| 角色 | 说明 |
|---|---|
| agent（执行/验证） | 在 verify-result.md 槽段填写证据状态与回执声明（判断层录入） |
| CLI（门禁） | 解析槽段、核验事实、固化 facts、阻断不合格完成 |
| P3d 消费方（后续变更） | 从 verify-facts.json v2 读取结构化证据数据 |

## 功能需求

### FR-01: facts v2 schema 与写入链路
覆盖决策：D-001@v2, D-005@v2
Given 变更存在 verify-facts.json（v1 或不存在）
When `sillyspec verify-probes --change <c> --init`
Then facts 落 schemaVersion 2：probes 段刷新，conclusion/tests/requiredEvidence/runtimeEvidence 空段占位；md 骨架含「证据账」「集成验证回执」两槽段（占位不含枚举词）

Given facts 已含回填固化段（--done 之后）
When 再次 --init
Then 分段合并：probes/generatedAt 刷新，conclusion/tests/evidence 固化段保留（不抹）

Given verify-result.md 已存在且缺槽段
When --init
Then 仅追加缺失槽段骨架（不触碰既有正文），二跑零改动（幂等）

### FR-02: requiredEvidence 分类核验
覆盖决策：D-001@v2
Given verify-required-evidence.json 存在（execute 有 cannot_verify 任务）
When verify --done
Then 每个 item 在 md 证据账槽匹配 task 行，按 verifiedFiles 分类核验：代码/测试类路径核 存在×mtime(≥execute completed_at)×git diff 交集；运行时产物类（.runtime/日志/文档）核 存在×mtime（diff 交集豁免）；返回 items[].verification{filesExist,mtimeOk,diffHit,pathClass}

Given verifiedFiles 中代码类文件与 git diff 零交集
Then 核验失败 → ERROR（不再子串提及即过）

Given md 无证据账槽（存量格式）
Then 降级 legacy 子串对账 + 迁移 warning，行为等同现状

### FR-03: cannot_verify 硬门
覆盖决策：D-002@v1
Given 证据账存在 status=missing 且无（豁免：<理由>）后缀
When verify --done
Then 阻断完成（rollback，同 test 门失败语义）

Given missing 带豁免后缀，或全部 satisfied/partial 核验通过
Then 正常完成

### FR-04: 集成回执一致性校验
覆盖决策：D-003@v1
Given 变更被判 integration-critical/deployment-critical
When verify --done
Then 读「集成验证回执」槽：每条核 logPath 存在 × mtime ∈ verify 窗口 × 日志尾 200 行失败签名（噪声剔除：行首匹配 + 剔除「0 errors」类良性行）× exitCode===0；全绿才算在场证据

Given 无绿回执且无 frontmatter risk_level 豁免
Then ERROR（判据从字面变结构）
Given md 无回执槽（存量）
Then legacy literals 回退 + warning

### FR-05: facts 基线对比
覆盖决策：D-001@v2
Given checkProbeConsistency --done 全量重跑探针
When 对比重跑指标 vs facts 快照
Then 不一致按分级报告：probe1/6=ERROR、probe3/5=WARNING（继承 HEAD-advance 降级语义）；结论固化 factsConsistency 段

### FR-06: 槽位指引与 schema 单点
覆盖决策：D-005@v2
Given verify.js step2（evidence 检查）/step7（报告结构）
When 本变更落地
Then 两步 prompt 含槽位填写说明（三选一语义/verifiedFiles 精确路径/豁免写法/回执四字段）；FACTS_SCHEMA_VERSION/EVIDENCE_STATUS/EXEMPTION_RE/classifyVerifiedFile/validateFactsV2 单点于 src/verify-facts-schema.js，四方 import 同源；docs/prompt 镜像与模块卡同步

## 非功能需求

- 兼容性：存量 md/facts v1/无 evidence 需求变更全部走 legacy 或 skipped，行为不变（见 design 兼容策略三条）
- 可回退：槽段缺失即回退现状路径；facts v1 读侧双版本兼容
- 可测试：三判定门（分类核验/回执绿判据/基线对比分级）全部有 GWT 级单测（三个新测试文件）
- 执行次序：backfill（md 槽段）→ runValidators → verify 块（test 实测 → tests 二次回填 → 硬门/基线对比）

## 决策覆盖矩阵

| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v2 | FR-01, FR-02, FR-05 | 双层写入模型与单向约束边界（slot-backfill 段例外成文） |
| D-002@v1 | FR-03（范围圈定） | 本变更只做 verify 域，其余 P3 大件独立变更 |
| D-003@v1 | FR-04 | 回执槽中间档，不代跑 |
| D-004@v1 | （非目标） | lint 强度不动，本变更零涉及 |
| D-005@v2 | FR-01, FR-06 | 命名沿用 + schema 单点独立模块 |

（D-001@v1/D-005@v1 已被 v2 supersede，矩阵只列当前版本。）
