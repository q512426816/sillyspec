---
author: qinyi
created_at: 2026-06-02 23:25:01
---

# Requirements

## 角色

| 角色 | 说明 |
|---|---|
| 开发者 | 维护 sillyspec 项目代码的开发者 |
| 用户 | 使用 sillyspec 进行项目管理的开发者 |

## 功能需求

### FR-01: 生成完整的 _module-map.yaml

Given 项目已完成 scan
When Scan 阶段执行到 Step 7/10
Then 生成 `_module-map.yaml` 包含以下字段：
- schema_version（版本号）
- project（项目名）
- source_commit（当前 git commit）
- generated_at（生成时间）
- generator（生成器标识）
- modules（模块列表，每个模块包含 status、doc、paths、tags、aliases、entrypoints、main_symbols、depends_on、used_by、needs_review、review_reasons）

### FR-02: 精简模块卡片

Given _module-map.yaml 已生成
When Scan 阶段执行到 Step 8/10
Then 生成 modules/<module-id>.md 包含以下章节：
- 定位（模块职责边界）
- 契约摘要（核心能力列表，不重复 _module-map.yaml 的 entrypoints/main_symbols）
- 关键逻辑（核心流程摘要，3-5 行 text 伪代码）
- 注意事项（维护提醒、已知限制、需同步检查的模块）
- 人工备注（空标记区域）

### FR-03: 新增 flows/ 目录支持

Given 项目存在跨模块业务流程
When Scan 阶段执行到 Step 9/10
Then 生成 flows/<flow-name>.md 包含：
- 目标（业务目的）
- 参与模块（模块 + 职责）
- 流程摘要（text 伪代码）
- 失败回滚（表格）

### FR-04: 新增 glossary.md 支持

Given 项目存在专有术语
When Scan 阶段执行到 Step 9/10
Then 生成 glossary.md 包含：
- 术语名
- 术语定义（项目内特殊含义）

### FR-05: 新增 concerns/ 和 details/ 目录支持

Given sillyspec 框架允许扩展文档
When 用户需要记录关注点或详细文档
Then 能在 concerns/ 和 details/ 目录下创建文档：
- concerns/<concern-name>.md - 技术债务、架构风险等
- details/<detail-name>.md - 复杂模块的详细文档

### FR-06: Brainstorm 基于 _module-map.yaml 匹配模块

Given _module-map.yaml 已生成
When Brainstorm 阶段加载项目上下文
Then 能基于 tags/aliases 字段匹配需求关键词到相关模块

### FR-07: Plan/Execute 从 _module-map.yaml 读取索引

Given _module-map.yaml 已生成
When Plan/Execute 阶段需要模块索引信息
Then 从 _module-map.yaml 读取 paths、entrypoints、depends_on、used_by

## 非功能需求

- 兼容性：模块卡片中的旧字段（如果有）不影响逻辑，优先使用 _module-map.yaml
- 可回退：无破坏性变更，可随时切换回旧逻辑
- 可测试：每个功能需求都有对应的验证步骤