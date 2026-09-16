---
author: qinyi
created_at: 2026-09-16 03:09:52
generated_by: sillyspec-fourpiece-init
change: 2026-09-16-friction5-hardening
---

# 决策记录（Decisions）

<!-- 增量落盘：每解决一个有实现影响的问题当场追加一条（格式见 brainstorm Step 3 模板）；幂等按 D-xxx@vN 判重 -->

## D-001@v1: 集成回执双形态解析（多行 YAML 聚合，否决 YAML 重渲染迁移）
- **问题**：RECEIPT_LINE_RE 单行四字段严格正则，字段序调换/claim 含管道符/多行书写整行不命中 → 回执槽 0 条 → integration-critical 误报无绿回执（用户驾驭小结①）。
- **选项**：A 单行正则保留 + 多行 YAML 条目聚合（行首 `- claim:` 起头、缩进续行 key:value 任意序、四字段齐才命中）；B 槽段整体迁 YAML 重渲染；C 继续枚举容错变体（全角/括号）。
- **选定**：A——存量回执逐字节兼容（B 否决：破坏存量、迁移成本高）；C 已两次补丁（receipt-fullwidth-parse）证明治标，形态自由度根除靠结构化形态本身。
- **影响**：verify-facts-schema.js parseEvidenceSlots 内增量；骨架 backfillMissingEvidenceSlots 与 stages/verify.js prompt 增多行示例。

## D-002@v1: 快照生成物 copy 面声明式配置（否决快照内跑 gen 命令/lint 豁免启发式）
- **问题**：隔离快照 = HEAD + 会话文件 overlay，gitignored 生成物不进 HEAD 不在会话集 → lint/test 环境性假败（用户驾驭小结④）。
- **选项**：A local.yaml `gate_snapshot.copy` 路径清单，快照构建期 junction 主仓→快照（失败回退递归 copy）；B 快照内自动跑 commands.gen；C lint 对账按输出文本豁免缺生成物文件。
- **选定**：A——与现有 node_modules/venv junction 同机制（gate-snapshot-env-mismatch 先例），零命令注入副作用；B 否决：任意命令进临时目录执行慢且副作用不可控；C 否决：按报错文本猜缺文件是启发式，脆弱且门禁语义被稀释。
- **影响**：config-schema.js 登记新键；gate-snapshot.js createGateSnapshot overlay 段后加 copy 面；未配置零行为变化。

## D-003@v1: docs 白名单并入 allowSet（Gate1/patch 同源放行，否决违规前置滤除）
- **问题**：`.sillyspec/docs/` 模块文档是合法交付物（filterDeliverableFiles 明确保留），但 Gate1 allow 面（design §6 ∪ allowed_paths）不含未声明 docs 文件 → approved 文档同步被拦（用户驾驭小结③）。
- **选项**：A resolveApplyAllowSet mainSet 预置 `.sillyspec/docs/` 目录前缀；B classifyAllowListViolations 前置滤除 docs 文件；C 维持强制 design §6 声明。
- **选定**：A——pathMatches 目录前缀语义天然放行，且 Gate1（违规判定）与 resolvePatchFiles（patch 圈定）同源消费同一 allowSet，零静默丢失；B 否决：Gate1 放行而 patch 不含 = apply-glob-manifest 同款静默丢失坑；C 否决：维持现状摩擦。放宽面用 apply warnings 报备实际落地 docs 文件保审计。
- **影响**：worktree-apply.js resolveApplyAllowSet + applyWorktree 成功路径审计报备；docs-check 侧已有独立行号校验兜内容质量，本门只管文件归属。

## D-004@v1: feasibility 单点重复键检测（否决各消费方分散报错/生成时检测）
- **问题**：TaskCard 重复 YAML 键三套消费方口径分裂——jsYaml 消费方 throw 后 catch 静默降级（吞字段）、parseDependsOn 正则取首个、feasibility 正则逐字段全然不察（用户驾驭小结②）。
- **选项**：A validatePlanFeasibility 每卡扫描 frontmatter 顶层键（行首 `^key:`）计数 ≥2 即 error；B 各 jsYaml 消费方逐处 catch 细化报错；C taskcard 生成时检测。
- **选定**：A——plan --done 是全部任务卡必经喉舌，一处拦截下游全免疫；B 否决：分散多处、且重复卡本就该在 plan 门拦下；C 否决：CLI 自写骨架无重复，检测点错位（agent Edit 引入的重复检不到）。
- **影响**：plan-postcheck.js feasibility 增检查 0.5；jsYaml/正则消费方零改动（上游拦干净后无需动）。

## D-005@v1: probe7 advisory 锚点本地扩口径（否决 import stage-contract 复用）
- **问题**：advisory 层只认 file:line（`/:\d+\b/`），窄于 stage-contract 硬门三形态（.test. / file:line / 反引号）——`.test.` 文件名锚过硬门仍被 advisory 提示回补（用户驾驭小结⑤，行号漂移场景高频）。
- **选项**：A 本地正则扩为 file:line 或 `.test.` 文件名命中；B import matrixEvidenceHasAnchor 复用；C 维持只认 file:line。
- **选定**：A——模块头注释明示「零依赖单文件最稳」（verify-probes 是多会话高频冲突面，刻意隔离），import stage-contract 破坏该定位；B 否决；C 否决：误报持续。裸反引号不收（advisory 价值就在推动指向真实测试命中，收了反引号等于跟硬门完全同权、advisory 失去增量）。
- **影响**：probe7-anchor-check.js ANCHOR 判定 + gates.js advisory 文案同步。

## D-003@v2: docs 白名单条件加白 + declaredFace 审计口径（supersedes D-003@v1，source: design-grill M3/M5）
- **问题**：v1 的「无条件 `mainSet.add('.sillyspec/docs/')`」在 design §6 与任务卡全缺的变更上翻转空清单 fail-open 分支——hasAllowList 从 false 变 true（docs-only 单条目面）→ 非 docs 交付全 BLOCKED、resolvePatchFiles 静默收窄（apply-glob-manifest 同形态）、step3.5 hashMismatch 靶面丢失；违反 design 兼容声明「存量行为逐一不变」。
- **修正**：①条件加白——先聚合 design §6 ∪ allowed_paths，`mainSet.size > 0` 才追加白名单（空清单变更维持原 fail-open 语义：Gate1 跳过、patch 全量）；②加白前快照 `declaredFace = new Set(mainSet)`，Gate1 的 hasAllowList 判定与审计报备均以 declaredFace 为口径（审计报备 = 实际落地 docs 文件 ∉ declaredFace，避免 allowed_paths 已声明的 docs 文件被误报越权——M3 口径二义修正）。
- **影响**：worktree-apply.js resolveApplyAllowSet（内部先聚合后条件加白，hasAllowList 判定以声明面为准）；白名单条目保持尾斜杠写法 `'.sillyspec/docs/'`（step3.5 getBlobHashMap 对目录条目 inert，grill M10 实证：尾斜杠 pathspec 递归一层、Map 键≠字面条目 → continue，无新副作用）。
