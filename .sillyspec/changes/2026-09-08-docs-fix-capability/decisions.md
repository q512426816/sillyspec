---
author: qinyi
created_at: 2026-09-08 08:37:19
---

# 决策记录（Decisions）

## D-001@v1: 范围=提案摘果子五项，路径推断引擎与一站式 docs fix 本次不做
- type: boundary
- priority: P0
- status: accepted
- source: user
- question: 平台仓 2026-09-07 提案（1058→0 清理复盘）8 项改进，落地多少？
- answer: 用户确认按「有价值子集」立项：①解析修复（括号路径/省略号模糊引用/中文顿号拆分——消假阳性）；②`docs migrate --from/--to` 确定性批量路径迁移；③snapshot/archive 豁免；④`--json` 补 candidates 候选数组；⑤报告出口统一 stdout（用户同日新痛点实证添头，见 D-005）。路径推断引擎（置信度/上下文打分）、`docs fix` 一站式循环收敛、`--interactive`、`gate --delta-only` 明确不做——稳态（基线 0 + 行号重锚已有）无用武之地，YAGNI，等第二次批量事件再认领。
- normalized_requirement: 本次变更仅含上述五项；不得引入置信度打分、交互式确认、新门控语义。
- impacts: [FR-1, FR-2, FR-3, FR-4, FR-5]
- evidence: 用户 2026-09-08 会话批准（"按有价值的内容帮我立项做吧"）；提案文件 multi-agent-platform docs/sillyspec/2026-09-07-docs-check-fix-improvement-proposal.md 评审结论（2026-09-08 已写回文档）与本仓评估对账。
- 模块域: docs-consistency

## D-002@v1: migrate 语义=确定性文本替换+替换后即校验，纯 file:line 引用面
- type: architecture
- priority: P0
- status: accepted
- source: user
- question: `docs migrate` 的修复语义与安全边界？
- answer: 只做用户显式给定的 `--from/--to` 前缀/字面替换（确定性、零推断），改动面=docs check 所辖 .md 文件中的引用文本（file:line 记法）；默认 dry-run 列出计划，`--apply` 才写盘；写盘后自动跑一次 docs check 报告替换后失效数（防 from/to 给反）。不碰 git 历史、不改非引用文本。
- normalized_requirement: 无 --apply 不写任何文件；--apply 后输出替换计数与 docs check 结果。
- impacts: [FR-2]
- evidence: 平台仓提案 P2-7（docs migrate 补全）+ 本仓评估「确定性大头是已知改名规则，不需要推断引擎」。
- 模块域: docs-consistency

## D-003@v1: 豁免双通道=目录约定优先 + frontmatter doc_type: snapshot
- type: architecture
- priority: P1
- status: accepted
- source: user
- question: snapshot/archive 文档豁免怎么识别？
- answer: 双通道：①目录约定——路径含 `archive/` 或 `finished/` 段自动豁免（含平台仓 docs/sillyspec/finished/ 先例）；②frontmatter `doc_type: snapshot` 显式标注豁免。豁免=不计入 docs check 失效数（跳过校验），`--json` 的 skipped 汇总里可见。可 `--no-exempt` 关闭（排查用）。
- normalized_requirement: 豁免文件不进 invalid 计数；summary 有 skipped_exempt 计数；--no-exempt 时全部照常校验。
- impacts: [FR-3]
- evidence: 提案 P1-6（文档类型标注）原文双方案（frontmatter + 目录约定）全采纳。
- 模块域: docs-consistency

## D-004@v1: 代码组织=方案A 薄新模块（migrate 复用 docs-check 提取器）
- type: architecture
- priority: P1
- status: accepted
- source: user
- question: docs migrate 与既有 docs-check 的代码组织——独立全量实现 / 薄模块复用 / 并入 docs-check 参数？
- answer: 方案A（薄新模块）：解析修复/豁免/candidates 全部改在 src/docs-check.js（提取与校验同文件，改解析不动提取器位置）；新增 src/docs-migrate.js 只做「复用 docs-check 导出的提取/校验 + 确定性替换 + dry-run/--apply」，CLI 接线仿 docs gate。理由：引用记法单一来源（顿号拆分/省略号跳过等解析规则若两处实现必漂移）；与 docs-gate.js 同构（薄判定+IO 分离）；方案B 独立实现 duplication 违 D-008 单一源精神，方案C 并入 docs-check.js 使该文件职责膨胀（已 1051 行）。用户预授权依据：立项前评估即按此形态描述并获"按有价值的内容帮我立项做吧"批准；纯代码组织细节不阻塞等待。
- normalized_requirement: 解析/豁免规则只存在于 src/docs-check.js；docs-migrate.js 通过 import 复用，不复制提取正则。
- impacts: [task-1, task-2]
- evidence: 用户立项批准轮（2026-09-08）；对比方案 B（docs-migrate 独立全量实现）/C（docs migrate 作为 docs-check 子参数，0 新文件）。
- 模块域: docs-consistency

## D-005@v1: 报告出口统一 stdout——诊断文本走 stderr、报告走 stdout
- type: compatibility
- priority: P1
- status: accepted
- source: user
- question: docs check 失败报告走 stderr，脚本 capture_output 只读 stdout 拿空（用户 2026-09-08 实证踩坑），怎么处理？
- answer: 双轨出口规则：--json 模式保持 stdout 纯 JSON（已满足，不动）；非 JSON 模式下**报告内容（✅/❌ 失效清单/重锚报告/修复回执/修复指引）统一 stdout**（机器可捕获、可管道），stderr 仅留运行时诊断（⚠️ warnings、配置错误、内部异常）。docs gate 失败输出同样归一 stdout。采纳依据：用户实测新痛点，属解析修复项添头（第 5 小项）；不采纳「统一全 stderr」——报告是主输出、管道场景 stdout 才能进下一跳。
- normalized_requirement: docs check 失败时 stdout 捕获可得失效清单；--json 输出逐字节兼容；exit code 语义不变。
- impacts: [FR-5]
- evidence: 用户 2026-09-08 消息（gate 拦两次真债、--fix 一把梭、stderr 出口踩坑实证）。
- 模块域: docs-consistency

## D-006@v1: REF_RE 正则采用展开循环形，原子序列形 ReDoS 实证否决
- type: architecture
- priority: P0
- status: accepted
- source: design-grill
- question: 括号路径支持的 REF_RE 正则形态——初稿原子序列 `(?:[A-Za-z0-9_.\-\/]+|\([A-Za-z0-9_.\-\/]+\))+` 是否可行？
- answer: 否决原子序列形，采用展开循环形 `[A-Za-z0-9_.\-\/]*(?:\([A-Za-z0-9_.\-\/]+\)[A-Za-z0-9_.\-\/]*)*`。否决理由：Design Grill 实证原子序列形为经典 `(a+)+` ReDoS——对无 `:N` 后缀的长 token 指数爆炸（n=24→1.2s、n=30→73.8s/token），GitHub 源码 URL/Java FQN 类常见文本即触发挂死 docs check；「两分支首字符不相交→无灾难回溯」推理不成立（只覆盖分支间歧义，未覆盖 plain 分支跨外层迭代的划分歧义）。展开循环形每次迭代必含括号段→划分唯一→线性（Grill 已验证 6 行为用例等价、evil 用例 0.01ms）。
- normalized_requirement: REF_RE 文件段必须用展开循环形；任何正则变更须先过回溯压测（长 token 无 :N 用例）。
- impacts: [FR-1, task-1]
- evidence: Design Grill review.json（brainstorm-review-2026-09-08-084339）checklist 首项 fail + node 实证记录。
- 否决理由: 原子序列形嵌套量词结构 ReDoS 实证（n=30 73.8s/token）
- 复潮条件: 仅当替代形态经独立压测证明同样线性且行为等价
- 模块域: docs-consistency
