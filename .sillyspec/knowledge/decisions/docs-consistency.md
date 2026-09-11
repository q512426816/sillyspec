# 决策知识 — docs-consistency

> decision-distill 从变更 decisions.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为 docs-check 机械解析契约，勿手改。

## D-002@v1 决策活跃库为文件型 knowledge/decisions/，不进 SQLite
状态：implemented
锚点：未记录
最近确认：test123
理由：文件型，与 knowledge/ 同构；progress DB 仍是进度唯一权威，不扩表
来源：2026-08-23-adopt-harness-practices

## D-003@v1 docs-check 决策规则 advisory 起步，稳定后升 error
状态：implemented
锚点：未记录
最近确认：test123
理由：起步 advisory（warn 不阻断）；dogfood 一个稳定周期后另立小变更升 error
来源：2026-08-23-adopt-harness-practices

## D-007@v1 decisions.md 记录契约扩展四字段，保纯函数提炼
状态：implemented
锚点：未记录
最近确认：test123
理由：扩展 brainstorm Step6 决策记录模板，四字段在决策产生时写入（锚点：src/…:NN、模块域：module-id、否决理由/复潮条件：rejected 必填）；decision-distill 保持纯函数机械提炼。放弃备选「archive 时 agent 辅助补推」——归档时上下文陈旧、LLM 补推易错、不可确定性测试
来源：2026-08-23-adopt-harness-practices

## D-001@v1 方案A：复用现有管道（用户批准）
状态：implemented
锚点：src/docs-debt.js:1
最近确认：8aab190
理由：锚点触碰走 docs-debt facts 注入形态（纯函数+同一注入点）；漂移检测走 doctor 既有检查项形态（同"决策待复核检查"先例）；不新增占位符体系/新步骤结构/新命令
来源：2026-08-24-decision-touch-cli-drift

## D-001@v1 : 载体=decisions.md 模块域字段增强，不新建 design.facts 文件
状态：implemented
变更：2026-09-07-ir-stage-p3c
锚点：未记录
最近确认：6c3509b
理由：种子稿原案 design.facts.yaml 不建——decisions.md 条目已含 type/question/answer/模块域/evidence（九字段+可选四字段），语义即「设计决定+影响模块+理由」；设计事实层=decisions.md 模块域字段从可选提升为推荐并加机器核验。判断层 design.md 散文不动。分析修正采纳：md 列表而非 YAML（agent 不易写坏，直进 docs-check 核验链）。

## D-002@v1 : 核验 gate=validateDecisionModuleRefs，ERROR 仅对不存在的模块 id
状态：implemented
变更：2026-09-07-ir-stage-p3c
锚点：未记录
最近确认：6c3509b
理由：用户预授权自主抉择：brainstorm「生成规范文件」步 --done gate 新增检查——decisions.md 各当前版本 D 条目模块域逐 id 核验：存在于 _module-map.yaml modules 键 或显式 NEW:<名> 前缀（规划中的新模块）→ 通过；不存在且无前缀=ERROR（模块幻觉）。design.md 文件清单×module-map paths 推导的实际模块集 vs 声明域并集差异=WARNING（声明面 vs 实改面提示）；模块域全缺失=WARNING 汇总（存量兼容不阻断）。

## D-001@v1 : 范围=提案摘果子五项，路径推断引擎与一站式 docs fix 本次不做
状态：implemented
变更：2026-09-08-docs-fix-capability
锚点：未记录
最近确认：6db00e8
理由：用户确认按「有价值子集」立项：①解析修复（括号路径/省略号模糊引用/中文顿号拆分——消假阳性）；②`docs migrate --from/--to` 确定性批量路径迁移；③snapshot/archive 豁免；④`--json` 补 candidates 候选数组；⑤报告出口统一 stdout（用户同日新痛点实证添头，见 D-005）。路径推断引擎（置信度/上下文打分）、`docs fix` 一站式循环收敛、`--interactive`、`gate --delta-only` 明确不做——稳态（基线 0 + 行号重锚已有）无用武之地，YAGNI，等第二次批量事件再认领。

## D-002@v1 : migrate 语义=确定性文本替换+替换后即校验，纯 file:line 引用面
状态：implemented
变更：2026-09-08-docs-fix-capability
锚点：未记录
最近确认：6db00e8
理由：只做用户显式给定的 `--from/--to` 前缀/字面替换（确定性、零推断），改动面=docs check 所辖 .md 文件中的引用文本（file:line 记法）；默认 dry-run 列出计划，`--apply` 才写盘；写盘后自动跑一次 docs check 报告替换后失效数（防 from/to 给反）。不碰 git 历史、不改非引用文本。

## D-003@v1 : 豁免双通道=目录约定优先 + frontmatter doc_type: snapshot
状态：implemented
变更：2026-09-08-docs-fix-capability
锚点：未记录
最近确认：6db00e8
理由：双通道：①目录约定——路径含 `archive/` 或 `finished/` 段自动豁免（含平台仓 docs/sillyspec/finished/ 先例）；②frontmatter `doc_type: snapshot` 显式标注豁免。豁免=不计入 docs check 失效数（跳过校验），`--json` 的 skipped 汇总里可见。可 `--no-exempt` 关闭（排查用）。

## D-004@v1 : 代码组织=方案A 薄新模块（migrate 复用 docs-check 提取器）
状态：implemented
变更：2026-09-08-docs-fix-capability
锚点：未记录
最近确认：6db00e8
理由：方案A（薄新模块）：解析修复/豁免/candidates 全部改在 src/docs-check.js（提取与校验同文件，改解析不动提取器位置）；新增 src/docs-migrate.js 只做「复用 docs-check 导出的提取/校验 + 确定性替换 + dry-run/--apply」，CLI 接线仿 docs gate。理由：引用记法单一来源（顿号拆分/省略号跳过等解析规则若两处实现必漂移）；与 docs-gate.js 同构（薄判定+IO 分离）；方案B 独立实现 duplication 违 D-008 单一源精神，方案C 并入 docs-check.js 使该文件职责膨胀（已 1051 行）。用户预授权依据：立项前评估即按此形态描述并获"按有价值的内容帮我立项做吧"批准；纯代码组织细节不阻塞等待。

## D-005@v1 : 报告出口统一 stdout——诊断文本走 stderr、报告走 stdout
状态：implemented
变更：2026-09-08-docs-fix-capability
锚点：未记录
最近确认：6db00e8
理由：双轨出口规则：--json 模式保持 stdout 纯 JSON（已满足，不动）；非 JSON 模式下**报告内容（✅/❌ 失效清单/重锚报告/修复回执/修复指引）统一 stdout**（机器可捕获、可管道），stderr 仅留运行时诊断（⚠️ warnings、配置错误、内部异常）。docs gate 失败输出同样归一 stdout。采纳依据：用户实测新痛点，属解析修复项添头（第 5 小项）；不采纳「统一全 stderr」——报告是主输出、管道场景 stdout 才能进下一跳。

## D-006@v1 : REF_RE 正则采用展开循环形，原子序列形 ReDoS 实证否决
状态：implemented
变更：2026-09-08-docs-fix-capability
锚点：未记录
最近确认：6db00e8
理由：否决原子序列形，采用展开循环形 `[A-Za-z0-9_.\-\/]*(?:\([A-Za-z0-9_.\-\/]+\)[A-Za-z0-9_.\-\/]*)*`。否决理由：Design Grill 实证原子序列形为经典 `(a+)+` ReDoS——对无 `:N` 后缀的长 token 指数爆炸（n=24→1.2s、n=30→73.8s/token），GitHub 源码 URL/Java FQN 类常见文本即触发挂死 docs check；「两分支首字符不相交→无灾难回溯」推理不成立（只覆盖分支间歧义，未覆盖 plain 分支跨外层迭代的划分歧义）。展开循环形每次迭代必含括号段→划分唯一→线性（Grill 已验证 6 行为用例等价、evil 用例 0.01ms）。

## D-001@v1 跨变更语义护栏的强制级别：advisory 注入系，不做硬阻断
状态：implemented
变更：2026-09-11-cross-change-decision-guard
锚点：未记录
文件：src/decision-distill.js
最近确认：358af35
理由：**方案 A——三层 advisory**：①决策条目增机械可解析「文件：」字段（存量条目用锚点路径提取兼容，零迁移）②quick 进场按候选文件（--files+脏文件）反查知识库 implemented/rejected 决策 + git log 近 7 天他者变更交付归因，命中注入 advisory、零命中静默 ③quick --done 对「他者交付的测试文件断言行被改」输出 WARNING 级点名（具体断言+交付变更+决策指针），建议理由写进 quicklog --solution。全部非阻断，单开关 semantic_guard.enabled 默认开。
