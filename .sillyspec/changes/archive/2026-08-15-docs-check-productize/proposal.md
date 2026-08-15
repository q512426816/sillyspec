---
author: qinyi
created_at: 2026-08-15 16:10:00
change: 2026-08-15-docs-check-productize
---

# 提案（Proposal）

## 问题

SillySpec 号称"文档为本"，但文档内 `file:line` 引用的有效性校验目前只存在于 dogfood 仓的一个私有测试（`test/doc-ref-check.test.mjs`，白名单仅 1 份文档）。用户项目（如 sillyhub）文档大量过期/错误（doc-consistency-debt.md 实证：前端 72% 源文件无登记、lib-changes.md 描述的 API 已删除），却没有任何工具能确定性发现"文档引用的代码位置已失效"。

## 方案

产品化为独立 CLI 子命令 `sillyspec docs check`：扫描文档内 file:line 引用，两层校验（存在性 + 候选解析 / 关键词断言可配），无效引用 exit 1，可进 CI。配置走 local.yaml `docs-check` 段。

## 不在范围内

- 语义校验（引用内容是否相关）——软判定推 sillyhub/人类（design D-004）
- `.sillyspec/docs/` 模块卡扫描（modules 子命令管辖，design D-002）
- doctor/verify 阶段集成（design D-001 已裁决独立命令）
