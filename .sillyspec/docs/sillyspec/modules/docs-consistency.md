---
schema_version: 1
doc_type: module-card
module_id: docs-consistency
author: qinyi
created_at: 2026-08-16T19:05:00+08:00
updated_at: 2026-08-24T00:40:00+08:00
---

# docs-consistency

## 定位

文档一致性四件（与 dispatch / sillyhub-mcp 同级的独立子系统）：文档行号引用校验、docs ratchet 门、模块文档欠账事实计算、scan 文档新鲜度提示。共同原则「CLI 算事实注入」——用 git / 文件系统算出确定性结论注入 prompt，advisory 不阻断、无信号零输出。

## 契约摘要

| 文件 | 职责 |
|------|------|
| `src/docs-check.js` | 文档行号引用校验核心：层1 存在性（文件存在 + 行号在界，范围引用查 end）+ 层2 关键词断言（引用行反引号代码 token 在源码窗口内命中，多候选任一全过即通过）+ 失效引用修复分类（classifyFix：token 全量候选唯一命中 → fixable，多/零命中或无 token → needs-manual）；核心逻辑纯函数无 fs 依赖可单测；校验链路只读，`--fix` 显式触发时 applyFixes 按 docLine+行内偏移定点改写行号（只改行号数字，不改引用文件名与 token，CRLF 保持，同行多引用从后往前不错位），是本模块唯一写回面。2026-08-23 起新增决策规则族 `runDecisionRules`（`src/docs-check.js:747`，async advisory）——扫 knowledge/decisions/<域>.md 的 D-xxx@vN implemented 条目做锚点存在性 + 锚定模块源码 behind 超阈值复核（`readDecisionRulesConfig` 读 local.yaml decisions.behind_threshold 缺省 10）；不进 ok/invalid 阻断链、校验链路只读零写盘、无 decisions 库/无超阈 → findings 空零输出；known_failures decisions.* 命名空间豁免（规则级/条目级伞形，与 verify-postcheck 读法逐字对齐）；消费者 = doctor 决策待复核检查步骤与 verify evidence-auto 推荐链 |
| `src/docs-gate.js` | docs check 的 ratchet 门：失效数 ≤ 基线（`.sillyspec/docs-check-baseline`）即过、超基线拦——不管历史存量只拦增量；首次须显式 `--init-baseline`；exit 0 过 / 1 拦 / 2 配置或 IO 错误 |
| `src/docs-debt.js` | 模块文档欠账事实计算：变更触及文件按 module.paths/core_files 归属到模块，git 双时间戳算 behind 计数；结论注入 execute Wave prompt（advisory、无债零输出、git 失败降级不抛）。2026-08-23 起新增导出 `computeModuleBehind`（`src/docs-debt.js:169`，单模块 behind 计数）——与 moduleDebt 共用 behind 口径单一真相源，供决策规则族复核调用，不改现有 debt 行为 |
| `src/scan-staleness.js` | scan 文档新鲜度提示：source_commit vs HEAD 落后数生成 fresh / needs-refresh / unknown 三态结论，brainstorm 加载 scan 文档前注入一行提示（behind 只是「建议核对/重扫」的提示信号；引用失效判据归 docs-check） |
| `src/decision-distill.js` | 决策提炼纯函数（2026-08-23 新增，归本模块）：`parseDecisions`（`src/decision-distill.js:98-401`）解析变更 decisions.md 的 D-xxx@vN 条目（FR-01 四字段全可选容旧格式、入选裁决 implemented/rejected）；`distillIntoKnowledge` 把入选条目幂等提炼进 knowledge/decisions/<模块域>.md 并幂等维护 INDEX decisions 路由行——rejected 优先留痕（缺否决理由/复潮条件 → needsWait 该条不写盘，步骤层转 --wait 裁决）；域三级兜底（条目「模块域」→ impacts 路径与 _module-map.yaml paths/core_files 前缀匹配 → unmapped）；幂等（同 ID 同版本重写、@vN+1 整段替换旧版注 supersedes、同号全局只留最高版本）；写入责任全部在本模块——archive 步骤只调用、knowledge-match/docs-check 只消费，不 import 它们也不接 DB/网络 |

## 关键逻辑

- 归属三级（docs-debt D-003）：module.paths || module.core_files → 模块卡 doc 内容中的路径字面量（v1 兼容）→ unmapped
- ratchet 语义（docs-gate）：behind 计数是代理信号不能当阈值（源码活跃不代表卡错），docs-check 失效数是直接信号（每条都是具体的错）
- 决策规则族 advisory 语义（2026-08-23，D-003）：决策 behind 复核同属「代理信号」——锚定模块源码前进超阈值只提示「决策待复核」（doctor/verify 消费），不进 docs-check ok/invalid 阻断链、不影响 docs gate 阻断行为；生产/消费对偶——decision-distill 的写入契约与 docs-check 决策条目解析字段行契约互为镜像（producer=decision-distill → consumer=规则族），改写入格式两侧同步
- 四件写侧边界（2026-08-18 platform-map-auto-anchors 起）：校验链路仍全部只读（docs-check / docs-debt / scan-staleness 无写入；docs-gate 仅读基线文件）；唯一例外是 docs check `--fix` 显式触发时 applyFixes 写回文档行号（多命中/零命中/无 token → needs-manual 保守不修，`--dry-run` 预览零写盘），无 `--fix` 时行为与旧版逐字节一致。2026-08-23 起模块含一个写侧文件 src/decision-distill.js（决策提炼落盘），但它是归档流程的独立职责（写 knowledge/decisions/ + INDEX 路由行），不属 docs-check 校验链路——校验四件仍只读

## 依赖关系

- 内部依赖：src/modules.js（parseModuleMapSimple，经调用方注入 moduleIndex）、src/git-helper.js（safeGit）
- decision-distill 的 moduleIndex 由调用方注入（archive 步骤接线）；未注入时按 knowledgeRoot 同级 docs/<项目>/modules/_module-map.yaml 尽力发现（首个命中），失败 → 域模块源码集退化为锚点文件兜底
- 外部依赖：fs、path
