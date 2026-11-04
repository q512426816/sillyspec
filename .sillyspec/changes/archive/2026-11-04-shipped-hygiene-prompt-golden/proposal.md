---
author: flow-machine-draft
created_at: 2026-11-04T07:23:35.750Z
---
# 提案书（Proposal）— 2026-11-04-shipped-hygiene-prompt-golden

## 动机

任务原话转写：交付面卫生与提示词金档哈希锁
templates 与 .claude skills 无开发物料防入护栏（agent 会 grep 技能目录，压力测试场景会被当活指令执行——superpowers #2277 实证）；stage 提示词频繁返工却无防意外漂移面（哈希锁封闭面零语义，顺带产出体积可观测）。

成功标准：
- 新增测试保证 templates/ 与 .claude/skills/ 无开发物料文件（CREATION-LOG/压力场景/测试脚本类命名）
- 新增测试对 10 个 stage definition 的步骤提示词序列做 sha256 金档比对，意外漂移红、显式再生成通道留痕
- 新增测试全绿，既有回归面零破坏

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. 新增测试保证 templates/ 与 .claude/skills/ 无开发物料文件（CREATION-LOG/压力场景/测试脚本类命名）
2. 新增测试对 10 个 stage definition 的步骤提示词序列做 sha256 金档比对，意外漂移红、显式再生成通道留痕
3. 新增测试全绿，既有回归面零破坏

## 成功标准（可验证）

1. 新增测试保证 templates/ 与 .claude/skills/ 无开发物料文件（CREATION-LOG/压力场景/测试脚本类命名）
2. 新增测试对 10 个 stage definition 的步骤提示词序列做 sha256 金档比对，意外漂移红、显式再生成通道留痕
3. 新增测试全绿，既有回归面零破坏
