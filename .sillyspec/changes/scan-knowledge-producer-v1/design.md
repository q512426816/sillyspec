---
author: qinyi
created_at: 2026-06-19T11:10:00+08:00
---

# Design: scan-knowledge-producer-v1

## 背景

`.sillyspec/knowledge/` 目录在 init 时创建（INDEX.md + uncategorized.md），execute 阶段已实现消费者逻辑（启动读 INDEX.md + 收尾审阅 uncategorized.md）。但 scan 阶段不产出知识条目，知识库始终为空。

## 设计目标

- 补齐 knowledge 生产链路：scan → knowledge 落盘 → execute 能读
- 第一版保持简单：追加写入，不做去重/评分/过期

## 非目标

- embedding / 向量检索
- 自动合并重复知识
- 知识评分 / 过期机制
- execute 自动回写新知识
- brainstorm/plan/verify 阶段写入知识库

## 总体方案

在 scan 阶段步骤数组中，文档生成步骤之后、postcheck 之前，插入「Extract Project Knowledge」步骤。该步骤从 scan 产物中提取长期有效的项目知识，写入 `knowledge/` 分类文件。

### 知识分类

| 文件 | 内容 | 示例 |
|------|------|------|
| `conventions.md` | 项目约定 | 目录规范、命名规范、提交规范、测试规范 |
| `patterns.md` | 可复用模式 | 鉴权方式、错误处理方式、模块组织方式 |
| `known-issues.md` | 已知坑 | 不可直接改的模块、历史兼容问题、代理限制 |
| `uncategorized.md` | 待确认条目 | AI 不确定分类的知识 |
| `INDEX.md` | 分类索引 | 链接各文件内的锚点条目 |

### INDEX.md 格式

```markdown
# Knowledge Index

## Conventions
- [Backend module layout](conventions.md#backend-module-layout)

## Patterns
- [Scan runtime isolation](patterns.md#scan-runtime-isolation)

## Known Issues
- [GLM proxy usage metadata](known-issues.md#glm-proxy-usage-metadata)
```

### 步骤插入位置

```
scan steps:
  1. 检查项目结构
  2. 分析依赖关系
  ...
  N. 生成文档
  N+1. Extract Project Knowledge  ← 新增
  N+2. Postcheck                    ← 已有
```

### 知识写入硬规则（注入 prompt）

1. 只写未来变更会反复用到的知识
2. 不要把 scan 报告摘要塞进知识库
3. 不要重复 knowledge 文件中已有的内容
4. 不确定分类或不确定长期有效 → uncategorized.md
5. 每个正式分类条目必须更新 INDEX.md

### postcheck 校验规则

- `knowledge/INDEX.md` 必须存在
- 至少一个 categorized 文件非空（conventions/patterns/known-issues 任一）
- `uncategorized.md` 允许为空但文件必须存在
- INDEX.md 引用的文件必须真实存在
- 平台模式：禁止写到 source_root/.sillyspec/knowledge，必须写 spec_root/.sillyspec/knowledge

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | `src/stages/scan.js` | 新增 Extract Project Knowledge 步骤 |
| 修改 | `src/scan-postcheck.js` | 新增 knowledge 产物校验 |
| 新增 | `test/scan-knowledge.test.mjs` | 测试知识产物校验 |

## 兼容策略

- init 时已有 INDEX.md + uncategorized.md，新分类文件按需创建
- 未配置 knowledge 提取时不影响现有 scan 流程（步骤可选）
- 现有 execute 消费者代码不需要改动

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | AI 提取的知识质量不可控 | P1 | 硬规则约束 + uncategorized 兜底 + postcheck 校验 |
| R-02 | 首次 scan 无已有知识对比 | P2 | 首次允许 INDEX.md 不存在，后续要求存在 |
| R-03 | 平台模式路径隔离遗漏 | P1 | postcheck 显式校验 source_root 泄漏 |

## 自审

- ✅ 需求覆盖：FR-01~FR-04 完整覆盖 design 各章节
- ✅ 约束一致性：与 CONVENTIONS.md 一致（步骤定义格式、prompt 注入方式）
- ✅ 真实性：scan.js、scan-postcheck.js、execute.js 均为真实文件
- ✅ YAGNI：未包含向量化/评分/过期等复杂功能
- ✅ 非目标清晰：5 项不在范围内
- ✅ 兼容策略：现有 scan 流程不受影响
- ✅ 风险识别：3 项风险 + 应对策略
