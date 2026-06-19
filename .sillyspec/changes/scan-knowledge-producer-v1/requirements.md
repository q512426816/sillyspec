---
author: qinyi
created_at: 2026-06-19T11:10:00+08:00
---

# Requirements: scan-knowledge-producer-v1

## 角色

| 角色 | 说明 |
|---|---|
| AI Agent | 执行 scan 步骤时提取知识并写入文件 |
| 开发者 | 人工审阅 uncategorized.md 中的待确认条目 |

## 功能需求

### FR-01: knowledge 文件结构
Given init 时已创建 `knowledge/INDEX.md` 和 `knowledge/uncategorized.md`
When scan 执行 Extract Project Knowledge 步骤
Then 应按需创建 `conventions.md`、`patterns.md`、`known-issues.md`

### FR-02: Extract Project Knowledge 步骤
Given scan 文档生成步骤已完成
When 进入 Extract Project Knowledge 步骤
Then 从 scan 产物中提取长期有效、跨变更复用的项目知识
And 写入 `knowledge/` 下对应分类文件
And 更新 INDEX.md 索引

### FR-03: 知识写入硬规则
Given scan 步骤 prompt 包含知识写入规则
When AI Agent 执行知识提取
Then 只写未来变更会反复用到的知识
And 不重复已有内容
And 不确定分类或长期有效性的条目写入 uncategorized.md
And 每个正式分类条目更新 INDEX.md

### FR-04: postcheck 校验 knowledge 产物
Given scan 完成 knowledge 提取
When postcheck 执行
Then INDEX.md 必须存在
And 至少一个 categorized 文件非空
And INDEX.md 引用的文件必须真实存在
And uncategorized.md 允许为空但文件必须存在
And 平台模式禁止写到 source_root/.sillyspec/knowledge

## 非功能需求

- NFR-01: 第一版只追加，不做复杂去重
- NFR-02: 不改 execute 阶段代码（消费者已就绪）
- NFR-03: 不增加 embedding/向量化依赖
