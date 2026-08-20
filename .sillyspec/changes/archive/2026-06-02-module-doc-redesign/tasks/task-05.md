---
author: qinyi
created_at: 2026-06-02 23:27:05
---

# task-05: 更新 Plan/Execute 阶段 prompt（从 _module-map.yaml 读取索引）

## 目标

更新 Plan 和 Execute 阶段的 prompt，使其能够从 _module-map.yaml 读取索引信息。

## 操作步骤

### Plan 阶段

1. 打开 `src/stages/plan/02-load-context.md`
2. 在模块文档加载部分添加：
```markdown
### 模块文档加载
5. 读取 `.sillyspec/docs/sillyspec/modules/_module-map.yaml`（不存在则跳过以下步骤）
6. 根据 design.md 的文件变更清单匹配 _module-map.yaml 中的模块
7. 读取匹配到的 `.sillyspec/docs/sillyspec/modules/<module>.md`
8. 将模块文档作为制定计划的上下文，确保计划符合模块当前设计
9. **利用模块依赖关系辅助分析**：
   - 用 depends_on 判断哪些模块会被间接影响
   - 用 used_by 判断变更会不会影响下游模块
   - 将依赖关系纳入 Wave 分组决策（依赖同一模块的任务尽量同 Wave）
   - 如果变更涉及多个有依赖关系的模块，在 plan.md 的任务总表中标注模块依赖
```
3. 保存文件

### Execute 阶段

1. 打开 `src/stages/execute/wave-template.md`
2. 在需要读取模块索引的地方添加：
```markdown
从 _module-map.yaml 读取模块索引信息：
- paths：确定文件属于哪个模块
- entrypoints：快速定位对外能力
- depends_on/used_by：判断模块间依赖关系
```
3. 保存文件

## 完成标准

- `src/stages/plan/02-load-context.md` 包含 _module-map.yaml 加载和模块依赖分析步骤
- `src/stages/execute/wave-template.md` 包含从 _module-map.yaml 读取索引的说明
- prompt 明确说明 _module-map.yaml 是索引信息的唯一来源