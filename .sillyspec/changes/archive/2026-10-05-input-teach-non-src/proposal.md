---
author: flow-machine-draft
created_at: 2026-10-05T15:10:12.699Z
---
# 提案书（Proposal）— 2026-10-05-input-teach-non-src

## 动机

任务原话转写：2026-10-05-input-teach-copyable 独立评审 P2：src 教学可照抄化后，分号内联形态在非 src 教学面逐字存活且可整行照抄——CLAUDE.md:14、assets/command-cards/flow.md:14、assets/command-cards/run-quick.md:12（照抄必提取 0 条 exit 2，同根因失败模式）；另有描述式教学 2 处（AGENTS.md:15、.claude/skills/sillyspec-flow/SKILL.md:23）与倒推行引号内联模糊形态 2 处（AGENTS.md:13、templates/agents-instruction.md:12，为 AGENTS.md/模板源同款）。评审 P3：零残留断言为定点 6 文件扫描非递归，未来新文件回流不捕获。本变更把非 src 教学面统一为可照抄实例，断言升级为 src 递归遍历 + 非-src 面锁定。

成功标准：
- CLAUDE.md、assets/command-cards/flow.md、run-quick.md 三处逐字可照抄分号形态清零，给出含「成功标准：」独立行与「- <可验证标准>」条目行的多行实例
- AGENTS.md 与 SKILL.md 两处描述式教学升级为可照抄实例；AGENTS.md 与模板源倒推行引号内联模糊形态改为引用过门格式的表述
- 零残留断言升级为 src 目录递归遍历，新增非 src 教学面零残留与实例在场断言
- 相关测试全部通过

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. CLAUDE.md、assets/command-cards/flow.md、run-quick.md 三处逐字可照抄分号形态清零，给出含「成功标准：」独立行与「- <可验证标准>」条目行的多行实例
2. AGENTS.md 与 SKILL.md 两处描述式教学升级为可照抄实例；AGENTS.md 与模板源倒推行引号内联模糊形态改为引用过门格式的表述
3. 零残留断言升级为 src 目录递归遍历，新增非 src 教学面零残留与实例在场断言
4. 相关测试全部通过

## 成功标准（可验证）

1. CLAUDE.md、assets/command-cards/flow.md、run-quick.md 三处逐字可照抄分号形态清零，给出含「成功标准：」独立行与「- <可验证标准>」条目行的多行实例
2. AGENTS.md 与 SKILL.md 两处描述式教学升级为可照抄实例；AGENTS.md 与模板源倒推行引号内联模糊形态改为引用过门格式的表述
3. 零残留断言升级为 src 目录递归遍历，新增非 src 教学面零残留与实例在场断言
4. 相关测试全部通过
