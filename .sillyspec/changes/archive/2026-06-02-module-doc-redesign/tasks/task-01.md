---
author: qinyi
created_at: 2026-06-02 23:27:01
---

# task-01: 更新 Scan 阶段 Step 7/10 prompt（生成 _module-map.yaml）

## 目标

更新 Scan 阶段 Step 7/10 的 prompt，使其能够生成完整的 `_module-map.yaml` 文件。

## 操作步骤

1. 打开 `src/stages/scan/07-generate-module-map.md`
2. 按照以下格式更新 prompt：

```markdown
### ⚠️ 重要：这个文件是唯一的结构化索引源
所有结构化事实（paths/tags/entrypoints/depends_on/used_by）只维护在这个文件里。
模块卡片（modules/*.md）只负责人类语义说明，不重复索引信息。

### 操作
1. 检查 `.sillyspec/docs/sillyspec/modules/_module-map.yaml` 是否已存在，已存在则跳过
2. 分析项目源码目录结构，识别模块划分：
   - 用 `find . -maxdepth 3 -type d -not -path "*/node_modules/*" -not -path "*/.git/*"` 查看目录结构
   - 每个有明确职责的独立目录识别为一个模块
   - 路径用 glob 模式
3. 用 grep/rg 分析每个模块：
   - `main_symbols`：模块导出的主要函数/类/常量（grep export / module.exports / def / class）
   - `entrypoints`：对外 API 端点或命令入口（grep route / router / @Controller / @GetMapping 等）
   - `tags`：模块相关关键词标签
   - `aliases`：模块的别名（其他开发者可能怎么称呼这个模块）
4. 分析跨模块依赖关系：
   - 用 grep import/require 分析模块间的引用链
   - 填充 depends_on（本模块依赖谁）和 used_by（谁依赖本模块）
5. 生成 `.sillyspec/docs/sillyspec/modules/_module-map.yaml`
6. 如果 modules/ 目录不存在，先创建
7. 原子写入（先写 tmp 文件再 rename）

### YAML 格式
```yaml
schema_version: 1
project: <project-name>
source_commit: <git-head-short>
generated_at: 2026-06-02 23:27:01
generator: sillyspec-scan

modules:
  <module-id>:
    status: active
    doc: modules/<module-id>.md
    paths:
      - <glob-pattern>
    tags:
      - <tag1>
      - <tag2>
    aliases:
      - <alias1>
    entrypoints:
      - <exported-symbol-or-api-endpoint>
    main_symbols:
      - <exported-class-or-function>
    depends_on:
      - <other-module-id>
    used_by:
      - <other-module-id>
    needs_review: false
    concerns: []
    review_reasons: []
```
```

3. 保存文件

## 完成标准

- `src/stages/scan/07-generate-module-map.md` 包含完整的 YAML 格式说明
- prompt 明确说明 _module-map.yaml 是唯一的结构化索引源
- prompt 包含模块识别和依赖关系分析的步骤