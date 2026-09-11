---
schema_version: 1
doc_type: module-card
module_id: docs-consistency
author: qinyi
created_at: 2026-08-16T19:05:00+08:00
updated_at: 2026-09-08T21:56:00+08:00
---

# docs-consistency

## 定位

文档一致性四件（与 dispatch / sillyhub-mcp 同级的独立子系统）：文档行号引用校验、docs ratchet 门、模块文档欠账事实计算、scan 文档新鲜度提示。共同原则「CLI 算事实注入」——用 git / 文件系统算出确定性结论注入 prompt，advisory 不阻断、无信号零输出。

## 契约摘要

| 文件 | 职责 |
|------|------|
| `src/docs-check.js` | 文档行号引用校验核心：层1 存在性（文件存在 + 行号在界，范围引用查 end）+ 层2 关键词断言（引用行反引号代码 token 在源码窗口内命中，多候选任一全过即通过）+ 失效引用修复分类（classifyFix：token 全量候选唯一命中 → fixable，多/零命中或无 token → needs-manual）；核心逻辑纯函数无 fs 依赖可单测；校验链路只读，`--fix` 显式触发时 applyFixes 按 docLine+行内偏移定点改写行号（只改行号数字，不改引用文件名与 token，CRLF 保持，同行多引用从后往前不错位），是本模块唯一写回面。2026-08-23 起新增决策规则族 `runDecisionRules`（`src/docs-check.js:880`，async advisory）——扫 knowledge/decisions/<域>.md 的 D-xxx@vN implemented 条目做锚点存在性 + 锚定模块源码 behind 超阈值复核（`readDecisionRulesConfig` 读 local.yaml decisions.behind_threshold 缺省 10）；不进 ok/invalid 阻断链、校验链路只读零写盘、无 decisions 库/无超阈 → findings 空零输出；known_failures decisions.* 命名空间豁免（规则级/条目级伞形，与 verify-postcheck 读法逐字对齐）；消费者 = doctor 决策待复核检查步骤与 verify evidence-auto 推荐链。2026-09-08 docs-fix-capability 起：REF_RE 文件段展开循环形支持括号路径（Next.js 路由组，markdown 链接零回归；D-006 否决原子序列形 ReDoS）；含 `...` 模糊路径跳过校验计 skippedFuzzy；豁免双通道 isExemptDoc（路径段 archive/finished + frontmatter doc_type: snapshot，opts.exempt 默认开、`--no-exempt` 关，豁免文档计 skippedExempt 不进 invalid）；classifyFix tie 与带 / 路径文件不存在分支附 fix.candidates 机械候选数组（仅 --json 面）；runDocsCheck 返回增 skippedExempt/skippedFuzzy；输出降噪（2026-09-10 驾驭小结第二批③，渲染层在 index.js docs check 命令）：硬失效同 doc+行+ref 重复条目折叠为一行带 ×N、变更名提名 advisory 固定尾部分区 + 按名聚合一行（名+提及数+首处定位），invalid 集与 exit code 不动 |
| `src/docs-migrate.js` | 确定性批量路径前缀迁移（2026-09-08 docs-fix-capability）：`docs migrate --from X --to Y` 对 docs check 同源文档集的 file:line 引用做前缀替换——默认 dry-run 输出计划零写盘、`--apply` 复用 applyFixes 写盘+自动 docs check 复核、目标不存在标 unverified（防 from/to 写反）；薄模块 import 复用 docs-check 导出不复制解析正则；exit 0=dry-run 零计划或 postCheck 全绿 / 1=apply 后仍失效或 unverified>0 / 2=用法错误；无 --from/--to 落回旧结构迁移 migrate.js 兼容 |
| `src/docs-gate.js` | docs check 的 ratchet 门：失效数 ≤ 基线（`.sillyspec/docs-check-baseline`）即过、超基线拦——不管历史存量只拦增量；首次须显式 `--init-baseline`；exit 0 过 / 1 拦 / 2 配置或 IO 错误 |
| `src/docs-debt.js` | 模块文档欠账事实计算：变更触及文件按 module.paths/core_files 归属到模块，git 双时间戳算 behind 计数；结论注入 execute Wave prompt（advisory、无债零输出、git 失败降级不抛）。2026-08-23 起新增导出 `computeModuleBehind`（`src/docs-debt.js:169`，单模块 behind 计数）——与 moduleDebt 共用 behind 口径单一真相源，供决策规则族复核调用，不改现有 debt 行为 |
| `src/scan-staleness.js` | scan 文档新鲜度提示：source_commit vs HEAD 落后数生成 fresh / needs-refresh / unknown 三态结论，brainstorm 加载 scan 文档前注入一行提示（behind 只是「建议核对/重扫」的提示信号；引用失效判据归 docs-check） |
| `src/module-impact.js` | module-impact.md 归类骨架生成（`sillyspec module-impact` 命令与 plan --done 首版共用，2026-08-21 建）：_module-map.yaml paths 前缀匹配把变更文件归属模块，双输入来源——diff 来源（archive/execute 后真实改动，resolveVerifyChangedFiles worktree-aware）与声明来源（plan --done 首版，design 文件变更清单 main 段，`sourceFiles` 参数，2026-09-08 刀②）；声明来源归一化剥 `NEW:` 待建前缀 + 去重（2026-09-10 驾驭小结③，坑 module-impact-new-prefix-mismatch：与 pathMatches 比对侧剥除同源——不剥则 classifyFile 前缀匹配必失配、NEW 文件全落「未匹配」逼手动回填）；无 module-map / 无可归类文件返回 null（agent 手写兜底）；「更新结果」表按命中模块机械生成 pending 行（verify/archive 死信门目标）；卡此前漏登本文件（map paths 已归属、表格缺行，2026-09-08 补） |
| `src/decision-distill.js` | 决策提炼纯函数（2026-08-23 新增，归本模块）：`parseDecisions`（`src/decision-distill.js:98-401`）解析变更 decisions.md 的 D-xxx@vN 条目（FR-01 四字段全可选容旧格式、入选裁决 implemented/rejected）；`distillIntoKnowledge` 把入选条目幂等提炼进 knowledge/decisions/<模块域>.md 并幂等维护 INDEX decisions 路由行——rejected 优先留痕（缺否决理由/复潮条件 → needsWait 该条不写盘，步骤层转 --wait 裁决）；条目双格式解析（坑 decision-flat-list-silent-zero，2026-09-10 驾驭小结第四批②：扁平列表式 decisions.md 此前解析 0 条静默放行）——标题式 ## D-xxx 正文 - 字段：值 之外，兼容扁平式 - D-xxx@vN：标题 ｜ 状态：… ｜ 模块域：…（行内 ｜ 分段按字段白名单 FIELD_LABEL_RE 进条目，缩进子项 - 字段：值 同收，中文别名 状态/类型 补齐 applyField）；0 条但正文含 D-xxx 形态 → zeroWithContent 标记 + distillIntoKnowledge 显式 warn（不再静默）。域三级兜底（条目「模块域」→ impacts 路径与 _module-map.yaml paths/core_files 前缀匹配 → unmapped）；幂等键 = 号+变更（2026-08-28 坑 distill-cross-change-supersede：条目带「变更：<name>」限定行，同 ID 同版本重写、@vN+1 整段替换旧版注 supersedes、同变更同号只留最高版本；跨变更同号共存不互删，legacy 无变更行段只共存不触碰）；写入责任全部在本模块——archive 步骤只调用、knowledge-match/docs-check 只消费，不 import 它们也不接 DB/网络 |

## 关键逻辑

- 归属三级（docs-debt D-003）：module.paths || module.core_files → 模块卡 doc 内容中的路径字面量（v1 兼容）→ unmapped
- ratchet 语义（docs-gate）：behind 计数是代理信号不能当阈值（源码活跃不代表卡错），docs-check 失效数是直接信号（每条都是具体的错）
- 决策规则族 advisory 语义（2026-08-23，D-003）：决策 behind 复核同属「代理信号」——锚定模块源码前进超阈值只提示「决策待复核」（doctor/verify 消费），不进 docs-check ok/invalid 阻断链、不影响 docs gate 阻断行为；生产/消费对偶——decision-distill 的写入契约与 docs-check 决策条目解析字段行契约互为镜像（producer=decision-distill → consumer=规则族），改写入格式两侧同步
- 四件写侧边界（2026-08-18 platform-map-auto-anchors 起）：校验链路仍全部只读（docs-check / docs-debt / scan-staleness 无写入；docs-gate 仅读基线文件）；唯一例外是 docs check `--fix` 显式触发时 applyFixes 写回文档行号（多命中/零命中/无 token → needs-manual 保守不修，`--dry-run` 预览零写盘），无 `--fix` 时行为与旧版逐字节一致。2026-08-23 起模块含一个写侧文件 src/decision-distill.js（决策提炼落盘），但它是归档流程的独立职责（写 knowledge/decisions/ + INDEX 路由行），不属 docs-check 校验链路——校验四件仍只读

## 依赖关系

- 内部依赖：src/modules.js（parseModuleMapSimple，经调用方注入 moduleIndex）、src/git-helper.js（safeGit）
- decision-distill 的 moduleIndex 由调用方注入（archive 步骤接线）；未注入时按 knowledgeRoot 同级 docs/<项目>/modules/_module-map.yaml 尽力发现（首个命中），失败 → 域模块源码集退化为锚点文件兜底
- 外部依赖：fs、path
| 2026-09-07 | 2026-09-07-ir-stage-p3c | IR P3c：新 src/design-facts.js（建议归本模块，paths 待批量补录）——parseDecisionDomains/loadModuleMap/validateDecisionModuleRefs（复用 distill parseDecisions+modules.js parseModuleMapSimple：幻觉模块 id ERROR 带 NEW: 前缀豁免与出路提示、声明域×实改面双向 WARNING）/generateDesignSkeleton（十三章节标题逐字对齐 stage-contract-spec，决策追踪表从 decisions.md 预填）；test/design-facts.test.mjs 112 断言 |
| 2026-09-07 | 2026-09-07-ir-stage-p3d | IR P3d：新 src/archive-delta.js（collectDeltaSources 四源 fail-soft：reconcile 按 change 过滤取最新+apply-pathspec 兜底 / buildDeltaReport Before-Delta-After 三段式 + scan 刷新建议与端点基线立项提示）；design-facts deriveActualModules 加导出；test/archive-delta.test.mjs 102 断言 |
| 2026-09-08 | 2026-09-08-docs-fix-capability | 平台仓 1058→0 清理提案摘果子五项：REF_RE 展开循环形（括号路径/ReDoS 防护）+ 省略号模糊跳过 + 豁免双通道 + fix.candidates JSON + 报告出口统一 stdout（FR-5：报告走 stdout 诊断走 stderr）+ 新 src/docs-migrate.js 批量路径迁移；test/docs-fix-capability.test.mjs 16 断言 + test/docs-migrate.test.mjs 6 断言 + docs-check-fix 通道断言改造 S8 |
