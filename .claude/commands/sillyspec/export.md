---
description: 导出成功方案为可复用模板
argument-hint: "<change-name> [--to <path>]"
---

## 核心约束（必须遵守）
- ❌ 修改任何文件（只读）

## 参数解析
`$ARGUMENTS`：变更名 + 可选 `--to` 输出路径（默认 `~/.sillyspec/templates/<change-name>/`）

---

## 流程

1. **读取变更文件：** `cat .sillyspec/changes/$ARGUMENTS/{proposal,design}.md specs/requirements.md 2>/dev/null`。不存在则报错。
2. **清理为通用模板：** 移除项目特定信息，保留通用设计方案，添加 `notes.md` 使用建议。
3. **导出：** `mkdir -p ~/.sillyspec/templates/<change-name>` 并复制文件。
4. **确认：** 展示摘要和模板路径。

### 最后说：

> ✅ 已导出到 `~/.sillyspec/templates/<change-name>/`
> 其他项目使用：`/sillyspec:brainstorm` → AI 自动发现并建议复用
