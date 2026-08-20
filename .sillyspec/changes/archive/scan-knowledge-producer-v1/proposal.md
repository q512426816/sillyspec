---
author: qinyi
created_at: 2026-06-19T11:10:00+08:00
---

# Proposal: scan-knowledge-producer-v1

## 动机

execute 阶段已实现知识库消费者（启动时读 `knowledge/INDEX.md`，收尾时审阅 `uncategorized.md`），但 scan 阶段不往 `knowledge/` 写入任何内容。生产者缺失导致知识库始终为空壳。

## 关键问题

1. execute 的「知识库审阅」步骤永远输出"无新知识" — 因为没人写
2. execute 启动时读 INDEX.md 按关键词匹配 — 但 INDEX.md 始终为空模板
3. 项目级的约定/模式/已知坑散落在各次变更中无法积累

## 变更范围

- scan 阶段新增「Extract Project Knowledge」步骤
- scan-postcheck 新增 knowledge 产物校验
- 不改 execute 阶段

## 不在范围内

- embedding / 向量检索
- 自动合并重复知识
- 知识评分 / 过期机制
- execute 自动回写新知识
- brainstorm/plan/verify 阶段写入知识库

## 成功标准（可验证）

- scan 完成后 `knowledge/` 下有分类文件非空
- INDEX.md 引用真实存在的文件和锚点
- postcheck 校验 INDEX.md 引用完整性
- execute 启动时能读到 scan 写入的知识条目
