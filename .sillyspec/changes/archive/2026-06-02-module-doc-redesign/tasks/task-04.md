---
author: qinyi
created_at: 2026-06-02 23:27:04
---

# task-04: 更新 Brainstorm 阶段 Step 2/10 prompt（加载 _module-map.yaml 并匹配模块）

## 目标

更新 Brainstorm 阶段 Step 2/10 的 prompt，使其能够加载 _module-map.yaml 并基于 tags/aliases 匹配模块。

## 操作步骤

1. 打开 `src/stages/brainstorm/02-load-context.md`
2. 按照以下格式更新 prompt：

```markdown
### 模块匹配方法
读取 _module-map.yaml 后，根据用户描述的需求关键词，匹配相关模块：
- 需求中提到"登录""认证""token" → 匹配 tags/aliases 中含这些词的模块
- 需求中提到特定文件路径 → 匹配 paths 字段
- 匹配结果用于后续 design.md 的文件变更清单
```

3. 在加载项目信息部分添加：
```markdown
### 操作
1. 读取 CODEBASE-OVERVIEW.md + 共享规范 + 子项目上下文
2. 加载项目信息：`cat .sillyspec/projects/*.yaml 2>/dev/null`
3. 加载本地配置：`cat .sillyspec/local.yaml 2>/dev/null`
4. 询问本次需求属于哪个子项目
5. 棕地项目：读取 .sillyspec/docs/sillyspec/scan/ 下的 STRUCTURE.md、CONVENTIONS.md、ARCHITECTURE.md
6. **加载模块索引**：读取 `.sillyspec/docs/sillyspec/modules/_module-map.yaml`（如存在）
   - 这一步是高频操作，_module-map.yaml 回答"哪个文件属于哪个模块、模块之间怎么依赖"
   - 用 tags/aliases 字段做需求关键词→模块的粗匹配
   - 用 entrypoints 字段快速了解模块对外能力
7. 查看进行中的变更：`ls .sillyspec/changes/ | grep -v archive`
```

4. 保存文件

## 完成标准

- `src/stages/brainstorm/02-load-context.md` 包含 _module-map.yaml 加载步骤
- prompt 包含模块匹配方法说明（基于 tags/aliases 和 paths）