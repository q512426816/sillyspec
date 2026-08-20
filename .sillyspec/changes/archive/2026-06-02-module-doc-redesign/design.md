---
author: qinyi
created_at: 2026-06-02 23:25:02
---

# Design

## 架构决策

### 决策 1：_module-map.yaml 作为唯一结构化索引源

**理由**：
- YAML 易于解析，适合 agent 高频读取
- 单一数据源避免维护成本高
- 结构化信息与语义信息分离

**文件格式**：
```yaml
schema_version: 1
project: <project-name>
source_commit: <git-head-short>
generated_at: 2026-06-02 23:25:02
generator: sillyspec-scan

modules:
  <module-id>:
    status: active
    doc: modules/<module-id>.md
    paths:
      - <glob-pattern>
    tags:
      - <tag>
    aliases:
      - <alias>
    entrypoints:
      - <exported-symbol>
    main_symbols:
      - <class-or-function>
    depends_on:
      - <module-id>
    used_by:
      - <module-id>
    needs_review: false
    concerns: []
    review_reasons: []
```

### 决策 2：模块卡片精简为语义说明

**理由**：
- 结构化索引已在 _module-map.yaml，模块卡片不应重复
- 人类需要的是"这个模块做什么"、"有什么注意事项"，不是路径列表

**文件格式**：
```markdown
---
schema_version: 1
doc_type: module-card
module_id: <module-id>
---

# <module-id>

## 定位
负责 X，不负责 Y（明确边界）

## 契约摘要
核心能力 A、B、C

## 关键逻辑
step1 → step2 → step3

## 注意事项
- 修改此模块时需同步检查模块 D

## 人工备注
<!-- MANUAL_NOTES_START -->

<!-- MANUAL_NOTES_END -->
```

### 决策 3：扩展文档目录可选

**理由**：
- 不是所有项目都需要 flows/、glossary/、concerns/、details/
- Scan 阶段 Step 9/10 设为可选，跳过时不生成

## 文件变更清单

### 新增文件
- `.sillyspec/docs/sillyspec/modules/_module-map.yaml`（已存在，重构格式）
- `.sillyspec/docs/sillyspec/flows/<flow-name>.md`（可选）
- `.sillyspec/docs/sillyspec/glossary.md`（可选）
- `.sillyspec/docs/sillyspec/concerns/<concern-name>.md`（可选）
- `.sillyspec/docs/sillyspec/details/<detail-name>.md`（可选）

### 修改文件
- `.sillyspec/docs/sillyspec/modules/<module-id>.md`（精简格式）
- `src/stages/scan/*.md`（更新 prompt，新增 Step 7/10、8/10、9/10）
- `src/stages/brainstorm/*.md`（更新 Step 2/10，加载 _module-map.yaml）

### 不修改文件
- `src/index.js`（核心逻辑不变）
- `.sillyspec/.runtime/sillyspec.db`（schema 不变）

## 数据模型

无数据模型变更（YAML 文件格式变更，不影响数据库 schema）

## API 设计

无 API 设计变更（CLI 命令不变）

## 兼容策略

- 如果模块卡片中仍有旧字段（paths、tags 等），优先使用 _module-map.yaml
- 旧流程：读取模块卡片解析索引 → 新流程：直接读取 _module-map.yaml
- Scan 阶段 Step 7/10 生成新的 _module-map.yaml 后，后续阶段自动使用新格式

## 风险登记

| 风险 | 影响 | 概率 | 缓解措施 |
|---|---|---|---|
| _module-map.yaml 生成失败 | agent 无法匹配模块 | 低 | 添加容错逻辑，回退到旧方法 |
| 模块卡片格式不兼容 | 旧文档无法使用 | 低 | 保留旧字段，优先级低于 _module-map.yaml |
| flows/ 生成不准确 | 误导业务理解 | 中 | flows/ 为可选，Scan 提示"跳过" |

## 自审

✅ 文档是核心资产，所有文档头部包含 author 和 created_at
✅ 模块卡片精简为语义说明，不重复 _module-map.yaml 的信息
✅ _module-map.yaml 是唯一的结构化索引源
✅ 扩展文档目录（flows/、glossary/、concerns/、details/）为可选
✅ Brainstorm 阶段基于 _module-map.yaml 的 tags/aliases 匹配模块
✅ Plan/Execute 阶段从 _module-map.yaml 读取索引信息