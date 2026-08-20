---
author: qinyi
created_at: 2026-06-02 23:27:08
---

# task-08: 验证所有 prompt 更新完成

## 目标

验证所有 prompt 更新完成，确保功能需求都得到满足。

## 操作步骤

### 验证 Scan 阶段

1. 打开 `src/stages/scan/07-generate-module-map.md`
2. 检查：
   - [ ] 包含 _module-map.yaml 格式说明
   - [ ] 明确说明 _module-map.yaml 是唯一的结构化索引源
   - [ ] 包含模块识别和依赖关系分析的步骤

3. 打开 `src/stages/scan/08-generate-module-cards.md`
4. 检查：
   - [ ] 包含精简模块卡片格式说明
   - [ ] 明确说明模块卡片不重复 _module-map.yaml 的索引信息
   - [ ] 包含子代理并行生成的步骤和模板

5. 打开 `src/stages/scan/09-generate-flows-glossary.md`
6. 检查：
   - [ ] 包含 flows/ 和 glossary.md 格式说明
   - [ ] 明确说明这一步是可选的
   - [ ] 包含跳过的条件判断

### 验证 Brainstorm 阶段

7. 打开 `src/stages/brainstorm/02-load-context.md`
8. 检查：
   - [ ] 包含 _module-map.yaml 加载步骤
   - [ ] 包含模块匹配方法说明（基于 tags/aliases 和 paths）

### 验证 Plan/Execute 阶段

9. 打开 `src/stages/plan/02-load-context.md`
10. 检查：
    - [ ] 包含 _module-map.yaml 加载步骤
    - [ ] 包含模块依赖分析步骤

11. 打开 `src/stages/execute/wave-template.md`
12. 检查：
    - [ ] 包含从 _module-map.yaml 读取索引的说明

### 验证示例文件

13. 打开 `.sillyspec/docs/sillyspec/modules/_module-map.example.yaml`
14. 检查：
    - [ ] 包含完整的格式示例
    - [ ] 示例包含 3 个模块
    - [ ] 每个模块包含所有字段

15. 打开 `.sillyspec/docs/sillyspec/modules/module-card.example.md`
16. 检查：
    - [ ] 包含完整的格式示例
    - [ ] 示例包含 5 个章节
    - [ ] 不包含结构化索引信息

## 完成标准

- 所有 prompt 文件更新完成
- 所有验证项都通过
- 示例文件生成完成