---
name: sillyspec:knowledge
description: Agent-safe knowledge base commands for SillySpec repositories. Search, inspect, validate, refresh, and propose knowledge entries.
argument-hint: "search --query \"<text>\" --limit N | inspect --id \"<id>\" | validate | refresh | propose --title \"<title>\" [--body-file <路径>|--body \"<text>\"] --category <name>"
version: "3.19.2"
---

## 何时使用此技能

任务可能依赖项目既有知识（known issues / patterns / scan 结论 / `.sillyspec/knowledge`）时。**实现前先 search，避免重复踩坑。**

## 命令速查

所有命令输出均为 stdout 纯 JSON（`ok` 顶层字段 + 失败 `code` 错误码），以实际输出为准——参数细节跑 `sillyspec knowledge <子命令>` 无参可见用法，勿背示例。

| 命令 | 用途 | 关键参数 |
|---|---|---|
| `sillyspec knowledge search --query "<任务关键词>" --limit 5` | 任务前搜知识库（与 execute 阶段同款匹配引擎） | `--query` 必填 |
| `sillyspec knowledge inspect --id "<id>"` | 读命中条目全文 | id 形如 `patterns` / `known-issues/xxx` / `generated/xxx` |
| `sillyspec knowledge validate` | commit/archive 前校验健康度 | errors（broken_reference/empty_file 等）须先修复 |
| `sillyspec knowledge refresh` | （已退役 2026-11-07）原从 scan 文档切块生成自动知识 | 切块为零消费死区已退库——该命令现仅输出废弃提示零写盘；scan 本体由 scan 流程维护，知识沉淀走 propose → accept |
| `sillyspec knowledge propose --title "..." --category <分类> [--body-file <路径>\|--body "..."]` | 提议新知识 | 仅写 `proposed/` 供人工审核；`--from` 标来源；长中文正文用 `--body-file` 从文件读（绕开命令行传参误杀） |
| `sillyspec knowledge accept --id proposed/<slug> [--file <目标>] [--dry-run]` | 合并待审提议为正式知识 | 用户确认条目后执行；自动追加目标文件+INDEX 注册+清源；category 有效（known-issues/patterns/conventions）可省 `--file` |

zone 语义：`manual`（人工维护，可直接信任）/ `generated`（自动提取，需人工审核）/ `proposed`（待审，未合并）。

## Agent 使用指南

1. **任务前必查**：实现/改代码/排错前 `search` → 命中则 `inspect` → 遵循其中约定与避坑建议。
2. **发现新知识**：可复用模式或新坑用 `propose` 提议，不直接编辑 manual/。
3. **提交前校验**：commit/archive 前 `validate`，有 errors 先修复。
4. **扫描后**：scan 文档本体由 scan 流程直接维护（2026-11-07 起 `refresh` 已退役、`generated/` 已退库——不要再跑 refresh）。

## 禁止事项

- ❌ 不要直接编辑 `manual/` 目录——新知识走 `propose`（用户确认后 `accept` 合并）；`generated/` 已退库不存在，勿重建
- ❌ 不要用 `grep`/`cat` 直接读知识文件——用 `search`/`inspect`（同款匹配引擎，索引语义一致）
- ❌ 不要**擅自**合并 `proposed/` 条目——提议供人工审核；用户明确确认某条后用 `sillyspec knowledge accept --id proposed/<slug> [--file <目标>]` 代跑合并（先 --dry-run 预览更稳）

## 用户指令
$ARGUMENTS
