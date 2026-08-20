---
author: qinyi
created_at: 2026-06-02 23:27:02
---

# task-02: 更新 Scan 阶段 Step 8/10 prompt（生成精简模块卡片）

## 目标

更新 Scan 阶段 Step 8/10 的 prompt，使其能够生成精简的模块卡片文档。

## 操作步骤

1. 打开 `src/stages/scan/08-generate-module-cards.md`
2. 按照以下格式更新 prompt：

```markdown
### ⚠️ 重要：模块卡片只负责人类语义说明
结构化索引（paths/tags/entrypoints/depends_on/used_by）已经在 _module-map.yaml 里维护。
卡片里不要重复这些信息，只写 _module-map.yaml 无法表达的语义内容。

### 操作
1. 读取 `.sillyspec/docs/sillyspec/modules/_module-map.yaml`，获取模块列表和路径
2. 检查 `.sillyspec/docs/sillyspec/modules/` 下已有的模块文档（<module>.md）
3. 列出每个模块的状态：已有文档 / 缺失
4. **必须停下来问用户**：
   - 展示模块列表及现有文档状态
   - 明确提供选项：**为缺失模块生成初始文档** / **全部重新生成（覆盖已有）** / **跳过**
5. 用户选择后执行

### 生成方法（子代理并行，只针对用户选中的模块）
**你必须为每个模块启动独立子代理执行，不要自己写文档。**

每个子代理的 prompt（**主 agent 启动前必须拼入**：
- 模块名和路径（从 _module-map.yaml 读取）
- 环境探测结果摘要（构建工具、语言框架）
- scan 文档关键信息摘要（ARCHITECTURE.md 的技术栈、CONVENTIONS.md 的代码风格要点，如已生成）
```
模块名：<module-id>
模块路径：<glob patterns>
目标文件：.sillyspec/docs/sillyspec/modules/<module-id>.md

操作：
1. 用 grep/rg 搜索模块路径范围内的源码（禁止读源码全文）
2. 提取：模块职责、对外接口、关键逻辑、注意事项
3. 按以下模板写入目标文件：

---
schema_version: 1
doc_type: module-card
module_id: <module-id>
---

# <module-id>

## 定位
（负责什么，不负责什么 — 明确边界）

## 契约摘要
（核心能力列表，具体导出符号以 _module-map.yaml 的 entrypoints/main_symbols 为准）

## 关键逻辑
（最核心的流程摘要，用 text 伪代码，不超过 3-5 行）

## 注意事项
（维护提醒、已知限制、修改时需同步检查的模块）

## 人工备注

<!-- MANUAL_NOTES_START -->

<!-- MANUAL_NOTES_END -->

规则：
- 不要编造接口或依赖，只写 grep/rg 能搜到的
- 目标长度：500-1000 字 / 80-150 行
- 如果模块特别复杂（状态机、多角色交互、复杂领域规则），可以在 modules/details/ 下生成扩展文档（如 details/<module-id>-flow.md），agent 默认不读
- 不要重复 _module-map.yaml 中的索引信息
- 不要写设计决策表、完整依赖表、变更索引长表
- 人工备注区域保持空标记，留给用户填写
```

等待所有子代理完成，验证文件是否生成且非空。
```

3. 保存文件

## 完成标准

- `src/stages/scan/08-generate-module-cards.md` 包含精简模块卡片格式说明
- prompt 明确说明模块卡片不重复 _module-map.yaml 的索引信息
- prompt 包含子代理并行生成的步骤和模板