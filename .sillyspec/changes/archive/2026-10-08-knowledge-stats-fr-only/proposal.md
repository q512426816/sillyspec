---
author: flow-machine-draft
created_at: 2026-10-08T01:25:54.557Z
---
# 提案书（Proposal）— 2026-10-08-knowledge-stats-fr-only

## 动机

任务原话转写：给 knowledge stats 加 --fr-only flag：只输出 FR 索引统计段（跳过命中矩阵和 conventions 段），便于 CI/L3 裁决脚本快速读取 frRotSuspect/frSupersede 等键而不解析全量输出。

成功标准：
- --fr-only 在场时输出仅含 FR 索引段（人类模式一段 markdown / --json 模式仅 frIndex 键）
- 不带 flag 行为零变化（字节一致）
- --json + --fr-only 组合可用且 envelope 不变（只过滤 data 键内容）
- 测试覆盖三态（无 flag/--fr-only/--fr-only --json）

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. --fr-only 在场时输出仅含 FR 索引段（人类模式一段 markdown / --json 模式仅 frIndex 键）
2. 不带 flag 行为零变化（字节一致）
3. --json + --fr-only 组合可用且 envelope 不变（只过滤 data 键内容）
4. 测试覆盖三态（无 flag/--fr-only/--fr-only --json）

## 成功标准（可验证）

1. --fr-only 在场时输出仅含 FR 索引段（人类模式一段 markdown / --json 模式仅 frIndex 键）
2. 不带 flag 行为零变化（字节一致）
3. --json + --fr-only 组合可用且 envelope 不变（只过滤 data 键内容）
4. 测试覆盖三态（无 flag/--fr-only/--fr-only --json）
