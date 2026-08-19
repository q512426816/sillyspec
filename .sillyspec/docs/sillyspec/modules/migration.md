---
schema_version: 1
doc_type: module-card
module_id: migration
author: qinyi
created_at: 2026-06-03T07:42:00+08:00
---

# migration

## 定位

SillySpec 的文档结构迁移与模块索引管理模块。负责：

- 将旧版 `.sillyspec/` 扁平结构迁移到统一 `.sillyspec/docs/<project>/` 目录结构
- 维护 `_module-map.yaml` 模块索引（rebuild / status / 生成 dependencies.md）
- 将旧格式模块文档卡片迁移到新格式（frontmatter + 标准节）
- 从 `design.md` 的"文件变更清单"表格解析出受影响文件路径集合

**不负责：** scan 扫描本身、文档内容生成、规范校验。

## 契约摘要

- `migrateDocs(projectDir)` — 迁移旧目录结构：`codebase/` → `scan/`、`changes/archive/` → `archive/`、`knowledge/` → `archive/knowledge-*`、`quicklog/` → `quicklog/`
- `rebuildModuleMap(cwd, { force })` — 从模块卡片 + 源码重建 `_module-map.yaml`；默认 dry-run 只预览不写 + 打印覆盖预警，`--force` 才真正覆盖（防误跑清空手动维护字段）
- `showModuleStatus(cwd)` — 展示模块索引状态表（tags/entrypoints/deps/review）
- `generateDependenciesMd(cwd)` — 从 `_module-map.yaml` 聚合生成 `dependencies.md`
- `migrateModuleDocs(cwd)` — 旧格式模块卡片 → 新格式（`schema_version` + `doc_type: module-card` frontmatter）
- `parseFileChangeList(designMdPath)` — 从 design.md 解析"文件变更清单"表格，返回 `Set<string>` 文件路径

## 关键逻辑

```
migrateDocs(projectDir)
  → 检测 .sillyspec/ 下各旧目录
  → 按类型复制到 docs/<project>/ 对应子目录（文件 copyFileSync、归档变更目录 cpSync 递归；不删除源文件，单条失败 try/catch 跳过不中断）
  → 已存在目标文件跳过，输出统计

rebuildModuleMap(cwd)
  → 扫描 modules/ 目录下所有 .md 卡片，提取 module_id
  → 合并已有 _module-map.yaml 中的字段
  → 生成新 YAML（status/doc/needs_review 骨架，tags 等需重新 scan）

parseFileChangeList(designMdPath)
  → 正则定位 "## 文件变更清单" 节
  → 截取到下一个 ## 标题
  → 逐行解析 Markdown 表格，提取第 2 列文件路径
  → 过滤空路径、注释行、.sillyspec/ 内路径
```

## 注意事项

- 迁移采用 copy 而非 move，旧文件保留在原位，需手动确认后删除
- `rebuildModuleMap` 只生成骨架字段（status/doc/needs_review），`tags/entrypoints/main_symbols/depends_on/used_by` 需要重新运行 scan 或手动补充；**默认 dry-run 不覆盖（破坏性保护），`--force` 才写入**
- `_module-map.yaml` 使用手写 YAML 解析器（非库），格式依赖固定缩进（2 空格模块名、4 空格字段、6 空格数组项）
- `parseFileChangeList` 返回相对路径，不含 `.sillyspec/` 内路径

## 变更索引

- 2026-06-03 | 初始文档
- ql-20260819-012-66fc | 清理 modules.js 死 import DB
- ql-20260819-015-65fa | modules.js rebuild 的 git rev-parse 改 execFileSync（去 shell 注入面）

## 人工备注
<!-- MANUAL_NOTES_START -->
<!-- MANUAL_NOTES_END -->
