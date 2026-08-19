---
author: qinyi
created_at: 2026-08-18T15:00:00+08:00
updated_at: 2026-08-18T16:20:00+08:00
---

# 提案书（Proposal）

## 动机

`docs/sillyspec/platform-interface-map.md` 及其他被 docs-check 覆盖的文档包含大量 `file:line` 源码引用，行号靠人工维护。源码增删改后行号漂移，`npm test` 报失效引用，人工逐行修正成本高。

关键洞察：`src/docs-check.js` 的 `suggestLines`（docs-check.js:353-362）已经为每条失效引用按 token 算出了候选行号——**正确答案已经被算出来，缺的只是写回文件这一步**。

## 关键问题

1. **修复回路断在最后一厘米**：check 能诊断 + 能建议（--suggest），但不能执行；从「建议」到「改好」之间是纯人工搬运。
2. **多 agent 并行开发加剧漂移**：每次源码变更都可能引发一批行号失效，修复是高频重复动作。
3. **此前的锚标记方案过重**：revision 1 调研的「源码注释锚标记 + 占位符生成」需要 20-30 处源码注释 + 文档占位符化 + 200-400 行新脚本，问题规模撑不起该架构（revision 2 已废弃）。

## 变更范围

- `docs check` 子命令新增 `--fix` / `--dry-run` flag；
- `src/docs-check.js` 新增 `applyFixes` 写回函数 + 失效引用 fixable/unfixable 分类；
- 新增测试文件覆盖修复行为。

## 不在范围内（显式清单）

- 不在源码加锚注释（零源码侵入）；
- 不改造文档为占位符/符号引用形态（文档保持标准 file:line）；
- 不改动 docs-check 两层校验逻辑、docs-gate ratchet 门、pre-push 链路；
- 不为纯位置引用（行内无 token）提供自动修复；
- 不在 CI/pre-push 强制跑 --fix（保持手动触发）；
- 本次为调研设计阶段，不落地实现。

## 成功标准（可验证）

- 单命中失效引用经 `--fix` 后行号更新为 token 当前所在行，`npm test` doc-ref-check 通过；
- 多命中引用不被自动修改，以候选列表形式报告；
- 零命中引用报告「需人工」，不产生误改；
- `--dry-run` 只打印不写盘；
- 无 `--fix` 时 CLI 行为与现状完全一致（回归无变化）；
- CRLF 文档修复后行结束符保持；
- 增量代码 ≤ ~150 行，零新依赖、零新脚本文件。
