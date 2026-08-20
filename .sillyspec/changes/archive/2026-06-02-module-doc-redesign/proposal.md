---
author: qinyi
created_at: 2026-06-02 23:25:00
---

# Proposal

## 动机

当前 sillyspec 的模块文档机制存在以下问题：
1. 模块卡片（modules/*.md）包含了结构化索引信息（paths、tags、entrypoints、depends_on 等），导致文档冗余且维护成本高
2. 结构化索引分散在多处，agent 高频读取时难以定位
3. 缺少业务流程、术语表、关注点列表等扩展文档支持

本次重构的目标是：
- 建立 `_module-map.yaml` 作为唯一的结构化索引源
- 精简模块卡片为纯粹的语义说明文档
- 新增 flows/、glossary/、concerns/、details/ 目录支持扩展文档

## 关键问题

### 痛点 1：索引信息重复维护
模块卡片中的 paths、tags、entrypoints 等字段与 YAML 索引文件重复，每次代码变更需要同步修改两处，容易遗漏。

### 痛点 2：agent 高频读取困难
agent 在执行阶段需要快速定位"哪个文件属于哪个模块"、"模块间如何依赖"，当前信息分散导致解析成本高。

### 痛点 3：扩展文档缺失
项目缺少业务流程图（flows/）、术语表（glossary.md）、关注点列表（concerns/）等对人类维护有帮助的文档。

## 变更范围

本次变更包含以下内容：
1. **重构 `_module-map.yaml` 格式**：作为唯一的结构化索引源，包含 paths、tags、aliases、entrypoints、main_symbols、depends_on、used_by
2. **精简模块卡片**：modules/*.md 只保留定位、契约摘要、关键逻辑、注意事项、人工备注
3. **新增扩展文档支持**：
   - `flows/` - 跨模块业务流程文档
   - `glossary.md` - 项目术语表
   - `concerns/` - 关注点列表（技术债务、架构风险等）
   - `details/` - 复杂模块的详细文档
4. **更新 Scan 阶段**：生成 _module-map.yaml、精简模块卡片、可选生成 flows/glossary
5. **更新 Brainstorm 阶段**：基于 _module-map.yaml 匹配模块
6. **更新 Plan/Execute 阶段**：从 _module-map.yaml 读取索引信息

## 不在范围内（显式清单）

- 不修改 sillyspec 核心代码逻辑（CLI 命令、数据库 schema 等）
- 不改变现有模块文档的目录结构（modules/*.md）
- 不强制要求项目必须有 flows/、glossary/、concerns/、details/ 目录
- 不修改 platform sync 相关逻辑

## 成功标准（可验证）

- `_module-map.yaml` 包含完整的模块索引信息（paths、tags、aliases、entrypoints、main_symbols、depends_on、used_by）
- 模块卡片精简为 5 个章节：定位、契约摘要、关键逻辑、注意事项、人工备注
- Brainstorm 阶段能基于 _module-map.yaml 的 tags/aliases 匹配模块
- Scan 阶段能生成 flows/、glossary.md（可选）
- 扩展文档目录（flows/、glossary/、concerns/、details/）支持正确创建
- 现有文档读取逻辑兼容（如果模块卡片仍有旧字段，优先使用 _module-map.yaml）
- 所有生成的文档头部包含 author 和 created_at