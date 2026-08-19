---
schema_version: 1
doc_type: module-card
module_id: docs-consistency
author: qinyi
created_at: 2026-08-16T19:05:00+08:00
updated_at: 2026-08-19T09:58:49+08:00
---

# docs-consistency

## 定位

文档一致性四件（与 dispatch / sillyhub-mcp 同级的独立子系统）：文档行号引用校验、docs ratchet 门、模块文档欠账事实计算、scan 文档新鲜度提示。共同原则「CLI 算事实注入」——用 git / 文件系统算出确定性结论注入 prompt，advisory 不阻断、无信号零输出。

## 契约摘要

| 文件 | 职责 |
|------|------|
| `src/docs-check.js` | 文档行号引用校验核心：层1 存在性（文件存在 + 行号在界，范围引用查 end）+ 层2 关键词断言（引用行反引号代码 token 在源码窗口内命中，多候选任一全过即通过）+ 失效引用修复分类（classifyFix：token 全量候选唯一命中 → fixable，多/零命中或无 token → needs-manual）；核心逻辑纯函数无 fs 依赖可单测；校验链路只读，`--fix` 显式触发时 applyFixes 按 docLine+行内偏移定点改写行号（只改行号数字，不改引用文件名与 token，CRLF 保持，同行多引用从后往前不错位），是本模块唯一写回面 |
| `src/docs-gate.js` | docs check 的 ratchet 门：失效数 ≤ 基线（`.sillyspec/docs-check-baseline`）即过、超基线拦——不管历史存量只拦增量；首次须显式 `--init-baseline`；exit 0 过 / 1 拦 / 2 配置或 IO 错误 |
| `src/docs-debt.js` | 模块文档欠账事实计算：变更触及文件按 module.paths/core_files 归属到模块，git 双时间戳算 behind 计数；结论注入 execute Wave prompt（advisory、无债零输出、git 失败降级不抛） |
| `src/scan-staleness.js` | scan 文档新鲜度提示：source_commit vs HEAD 落后数生成 fresh / needs-refresh / unknown 三态结论，brainstorm 加载 scan 文档前注入一行提示（behind 只是「建议核对/重扫」的提示信号；引用失效判据归 docs-check） |

## 关键逻辑

- 归属三级（docs-debt D-003）：module.paths || module.core_files → 模块卡 doc 内容中的路径字面量（v1 兼容）→ unmapped
- ratchet 语义（docs-gate）：behind 计数是代理信号不能当阈值（源码活跃不代表卡错），docs-check 失效数是直接信号（每条都是具体的错）
- 四件写侧边界（2026-08-18 platform-map-auto-anchors 起）：校验链路仍全部只读（docs-check / docs-debt / scan-staleness 无写入；docs-gate 仅读基线文件）；唯一例外是 docs check `--fix` 显式触发时 applyFixes 写回文档行号（多命中/零命中/无 token → needs-manual 保守不修，`--dry-run` 预览零写盘），无 `--fix` 时行为与旧版逐字节一致

## 依赖关系

- 内部依赖：src/modules.js（parseModuleMapSimple，经调用方注入 moduleIndex）、src/git-helper.js（safeGit）
- 外部依赖：fs、path
