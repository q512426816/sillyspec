---
author: zcode-quick-asset-tail
created_at: 2026-09-20 19:35:00
scale: large
---

# 设计文档（Design）— 2026-09-20-quick-asset-tail

## 背景

autocompact 对撞实证：薄通道（brainstorm→linked quick）速度/token 已追平 OpenSpec（39.5min/17.2M vs 25min/33.3M），但**零资产产出**——四件套躺在僵尸目录（current_stage 卡 brainstorm），FR/决策永不进 knowledge；纯 quick 482 条存量的根因知识躺在 QUICKLOG 流水账里。资产义务不能随仪式定价：机器能从已付信息榨取的不向 agent 再要一个字。

## 设计目标

1. 薄通道在 quick --done 单点闭合资产+终态（蒸馏 + lite 归档），agent 零新增命令。
2. 纯 quick 三机械件（FR needs_review 标记 / changelog 边车追加 / 根因 classify 命令提示），零写作义务。
3. fail-open 全链：任何资产面故障不拦 quick 完成。

## 非目标

- L3 声明义务（needs_review 是信号非门禁）。
- 纯 quick 的 FR 产出（有决策的改动该走完整流程，quick 出口门禁已分级升级）。
- module-impact/ROADMAP/delta 进薄通道（重件留重通道）。
- 多 quick 同变更的 FR 幂等升级（按变更名 no-op，限制文档化）。

## 拆分判断

单变更承载三件（接线面同在 quick --done 收尾段，拆则对账困难）；scale=large（跨 fr-index/complete-handlers/shared/prompt 四模块+行为契约变更）。

## 总体方案

**接线主点**：`run/shared.js` quick 审计块（钩子#1 try 块内升级）+ `run/complete.js` quick 收尾段（quicklog 落盘前后插蒸馏调用）。

**① 薄通道蒸馏尾**（complete-handlers.js 新导出 `distillLinkedChangeAssets({pm, cwd, specBase, changeName, platformOpts})`）：门禁 action!=='fail' 且 guard.linkedChanges 含真变更（非 quick-<hex>）时：decision-distill（archive-distill.js 同款调用）→ fr-index.indexRequirements（幂等）→ liteArchiveChange（新导出：assertChangeOwnership → archiveDestDirName 约定命名 → rename 到 changes/archive/ → pm.unregisterChange → 打印）。requirements.md 与 decisions.md 均缺失时零打扰跳过。

**② FR needs_review**（fr-index.js 新导出 `markFrNeedsReview(knowledgeRoot, frIds, refNote)`）：钩子#1 命中的 active FR 条目写/更新「待复核：<ref>」行（splitKnowledgeSections 节往返保留）；`readActiveFrDigest` 返回体加 `needsReview: string|null`；`run/prompt.js` ①c 注入行对 needsReview 非空条目追加 ⚠️ 标注。承接翻链时**在 indexRequirements 翻链就地补丁的 filter 中显式清理**该行（现有 filter 只清 superseded_by/取代链/退役理由——需追加待复核行；renderFrLines 仅渲染新条目不参与翻链，S2 审查阻断①）。

**③ 纯 quick 机械件**：a) changelog 边车追加（complete.js quick 收尾：changedFiles×moduleIndex join，`<module>.changelog.md` 存在才 append `- ql-id | 摘要`，多模块多行）b) 根因 classify 提示（--cause 原文 × knowledge/INDEX.md 关键词粗匹配，命中打一行 `sillyspec knowledge classify --ql <id> --file <命中文件>` 确切命令）。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/run/complete-handlers.js | 新导出 distillLinkedChangeAssets + liteArchiveChange（蒸馏编排+轻归档） |
| 修改 | src/run/shared.js | 钩子#1 块升级：needs_review 标记调用（touchedDomains 命中处） |
| 修改 | src/fr-index.js | 新导出 markFrNeedsReview；readActiveFrDigest 加 needsReview 透传；renderFrLines 状态行清理时同步清待复核行 |
| 修改 | src/run/prompt.js | ①c FR 注入行 needsReview ⚠️ 标注 |
| 修改 | src/run/complete-handlers.js | quick 收尾段接线（handleQuickStageCompletion 内，S2 审查勘误：物理接线点在此，complete.js 仅委托）：蒸馏调用（门禁后）+ changelog 追加 + classify 提示 |
| 新增 | NEW:test/quick-asset-tail.test.mjs | 蒸馏尾触发/跳过/幂等 + needs_review 写读清 + changelog 追加 + classify 提示 |

数据流：quick --done → 门禁 pass → linked 变更 requirements/decisions → knowledge/fr + knowledge/decisions（资产）→ 目录归 archive/ + DB unregister（终态）；纯 quick → touchedDomains → fr 条目待复核行 → 下次 brainstorm 注入可见。

## 接口定义

```js
// complete-handlers.js
export async function distillLinkedChangeAssets({ pm, cwd, specBase, changeName, platformOpts = {} })
// → { distilled: boolean, frCount: number, decisionCount: number, archived: boolean, warnings: string[] }
export async function liteArchiveChange({ pm, cwd, specBase, changeName, platformOpts = {} })
// → { archivedTo: string } | { skipped: string }（所有权拒/目录缺失）

// fr-index.js
export function markFrNeedsReview(knowledgeRoot, frIds, refNote)
// → { marked: number, warnings: string[] }（按全局 id 跨域定位条目；幂等=行已含同 ref 则跳过）
```

## 生命周期契约表

本设计不涉及生命周期契约——蒸馏/标记/归档均为 quick `--done` 收尾内的同步文件+DB 操作，无 session/lease/heartbeat 语义（所有权 assert 复用既有 assertChangeOwnership 判定，不引入新状态）。

## 数据模型

DB 无 schema 变更（unregisterChange 既有路径）；knowledge/fr 条目新增可选行「待复核：<ref>」（机械解析契约：非固定字段，digest 按行前缀读）。

## 兼容策略（brownfield 必填）

- 纯 quick 无 linked 变更 → 蒸馏尾零打扰（guard.linkedChanges 过滤 quick-<hex> 后为空即跳过）。
- linked 变更无 requirements.md 且无 decisions.md → 跳过（quick/scale:small 无索引义务语义对齐 fr-index 既有跳过）。
- 旧边车不存在 → changelog 追加静默跳过。
- fail-open：三件任何异常 warn 留痕不拦 quick 完成。
- 既有钩子#1 遥测保留（needs_review 是其升级不是替换）。

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | 蒸馏未实现设计（quick 废弃后） | P2 | D-002：门禁后才蒸馏；废弃 quick 永不 --done |
| R-02 | needs_review 误标（触达≠行为变更） | P2 | advisory 信号人裁；注入行明示"待复核非失效" |
| R-03 | lite 归档 rename 成功但 unregister 失败（永久 desync） | P2 | 复用 findAlreadyArchivedDir 自愈口径：lite 实现内目录已在 archive/ 时走自愈 unregister 路径（与重路径 586-604 同款），不留永久 {skipped} |
| R-04 | 多 quick 同变更 FR 幂等 no-op 漏更新 | P3 | 文档化限制；fr-index 既有幂等键不变 |
| R-05 | 蒸馏使 quick --done 变慢 | P3 | 纯函数秒级实测；打印蒸馏摘要可见 |

## 决策追踪

| 决策 | 覆盖点 | 状态 |
|---|---|---|
| D-001@v1 | FR-01 / 总体方案① | 已落实 |
| D-002@v1 | FR-01 / 风险 R-01 | 已落实 |
| D-003@v1 | FR-02 / 总体方案② | 已落实 |
| D-004@v1 | FR-01 / 总体方案① | 已落实 |
| D-005@v1 | FR-03 / 总体方案③ | 已落实 |

## 自审

- [x] 章节齐全
- [x] frontmatter 字段齐全
- [x] 引用所有当前版本 D-xxx@vN
- [x] 生命周期豁免短语在节内
- [x] UI 原型跳过（纯 CLI 逻辑）
- [x] 无存疑项
