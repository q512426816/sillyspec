---
author: qinyi
created_at: 2026-09-10 22:35:00
---

# noAI / CLI 接管与 IR 能力改进路线图

> 来源：2026-09-10 三方分析合并（原始多角度分析 + 两份独立评审），事实点经仓库实测核验，分歧点裁决见 §8。
> 定位：后续 quick / 完整流程变更的依据文档（「改代码前先说明依据」——本文即依据之一），非一次性快照。
> 关联：docs/sillyspec/doc-consistency-debt.md（文档一致性债）、docs/sillyspec/prompt-control-debt.md（提示词控制债）。

## 1. 基线事实（核验后）

| 事实 | 实测值 | 依据 |
|---|---|---|
| 全流程 agent 步数 | ≈40 步（brainstorm 9 / plan 6 / execute 10+Wave / verify 8 / archive 7；quick 3） | src/stages/*.js 步骤表 |
| 每步固定开销 | 2 次 CLI 调用（run 渲染 + --done）+ agent 手打 --output 摘要 | src/run/command.js |
| 已有 noAI 步 | 8 种 _cliAction（三主阶段进度确认、scan×5、planPostcheck、doctor 诊断） | src/run/complete.js:368 |
| CLI 算事实注入 | 20+ 占位符（LOCAL_COMMANDS / GIT_DIRTY / TASKS_CHECKBOX / SCAN_FACTS / WORKTREE_META / ARCHIVE_IMPACT_AUDIT / SCOPE_AUDIT_TABLE / DOCS_DEBT / MODULE_RESOLVE_TABLE…） | src/run/prompt.js |
| CLI 亲测对账 | test 实测（含并行 WIP 归因鉴别）+ lint 硬门 + 4 机械探针 + checkProbeConsistency 防篡改 | src/run/gates.js:629 |
| 自由 markdown 解析 | 13 处解析点、4 组复刻解析器（同源漂移风险） | decision-distill / quicklog / docs-check 等 |
| 行号锚重锚提交 | 31~67 个（窄 grep「重锚」31 / 宽 grep 含「锚点」67，口径差异、量级一致），单批最多 47 处 | git log |
| run 拒绝 --json | 是（显式 exit 2） | src/run/command.js:244 |
| SS-META 机器块 | 仅 auto 模式渲染 | src/run/prompt.js:1182 |
| docs-check 缺省扫描集 | docs/ + .sillyspec/docs/，不含 .sillyspec/changes/ 与 knowledge/ | src/docs-check.js:40 的 DEFAULT_DOC_PATHS |
| 符号锚语法 | 不存在（REF_RE 仅匹配行号引用；见 §8 裁决一） | src/docs-check.js:37 |
| 结论槽契约 | verify 结论只认骨架「结论枚举：」行首锚定槽行，正文其他 PASS/FAIL 字样不参与判定 | src/stages/verify.js:218 |

## 2. 核心命题与 noAI 准入边界

**命题**：「CLI 算事实、CLI 验声明、agent 只留判断」不是风格推测，是仓库已验证的演进轨迹（verify-probes --init 机械预填、detectChangeRisk 门控、WORKTREE_META 注入都是已落地实例）。本路线图把这个模式推到剩余环节——但「推到底」有边界。

**准入边界（分水岭）**——凡承担过语义归因的步骤，不进 noAI 名单：

1. **并行 WIP 归因鉴别**：CLI 实测失败 ≠ 本变更的错（gates.js 归因提示：他者声明文件命中 dirty 集、旧基线生成产物判据）。noAI 化任何「失败才渲染给 agent」的步骤时，归因提示必须透传——只渲染测试输出不渲染归因，agent 会替并行会话背锅（2026-08-28 51 文件误导重跑事故的产品化教训）。
2. **archive 确认归档前的 diff 注视**：这是 2026-09-10 目录级 git add 事故（AGENTS.md 规则 18）的制度化回应；agent 那一眼 diff 捕获的正是 CLI pathspec 检测不到的语义夹带。
3. **评审 verdict / 否决 / 降级判断**：CLI 只验 schema 与客观证据，从不产 verdict；这条不变。

**砍步判据**：不是「这步机械吗」，而是「这步的 agent 注视点历史上拦截过 CLI 检测不到的问题吗」。每砍一步前，先从 agent-session-log 与 gate 拦截记录取证该步的拦截历史；无拦截记录且 gate 可客观判定的，才进 noAI 名单。约 40 步中有一部分正是这类刻意设计的强制注视点，「35+ 往返是纯税」的叙事不完全成立。

## 3. P0 —— 先行批（零/低新机制，小时级）

### P0-1 verify/execute 测试步 noAI 化 + verify 结论草稿预填
> ✅ execute 侧裁决为**不 noAI**（2026-09-11）：该步含 formatter 修复动作与失败归因分析（run→fix→re-run 循环步），属 §2 边界「修复循环不进名单」——CLI 不能修代码，强行 noAI 会丢修复环。verify 侧已落地（ql-20260910-018-84f4）。
> ✅ verify 侧已落地（ql-20260910-018-84f4：noAI 质量扫描步 + 指纹复用 + 归因透传 + 结论草稿 + 决策链矩阵预填）；execute 侧测试步（worktree 语境）待后续批次。

- **内容**：verify「运行测试和质量扫描」步与 execute「运行测试」步 noAI 化——CLI 亲跑 commands.test/lint → 落 .runtime/verify-runs/ → 自动盖 completed，**失败才渲染给 agent**。verify 结论槽（行首锚定枚举）由 CLI 从机械事实（test/lint 实测、探针 1/3/5/6、target_files 对账、风险门）推导草稿；探针 2/4 的机械半边（关键词 grep 命中表、D→FR→task 链路矩阵——数据全在 decisions/tasks/plan 既有解析里）同样预填，agent 只做语义裁决。
- **依据**：test/lint 本来就是 CLI 在 --done 时亲测的，agent 在这两步的角色只是「跑一遍→转述结果→手打摘要」的纯中继。
- **实施前置（三件，必须同批落地）**：
  1. **结果复用防重复跑**：noAI 步结果必须可被 --done 对账复用（带代码指纹失效检测），否则长套件（2~10 分钟）成本翻倍——从省往返变成省 30 秒、多等 10 分钟。
  2. **归因透传**：失败渲染必须带 gates.js 的并行 WIP 归因鉴别（见 §2 边界 1）。
  3. **预填不进判定链**：预填只在「test/lint 实测 + 全部机械探针 + 风险门」全绿时生成，用显式「草稿待确认」形态（非默认值）；gate 对结论槽的独立复核逻辑不动——预填改变打字成本，不改变判定链（对冲 LLM 接受预填的锚定偏差）。

### P0-2 --output 摘要由 CLI 合成

- **内容**：每个 --done 的 --output 摘要由 CLI 从 gate 结果、diff、探针数据合成，agent 不再手打。
- **依据**：agent 手打摘要是每步必命中的幻觉源；CLI 手里本来就有全部事实。
- **边界**：语义性步骤（方案选择说明、用户反馈记录）保留 agent 输入；CLI 合成的是事实性摘要（gate 通过项、测试数、diff 面）。

### P0-3 gate 预检前置进 prompt

- **内容**：「完成后执行」段落加一行引导：--done 前先跑 gate <stage> --change <c> 自检。
- **依据**：gate 失败 → rollback → agent 重做一轮是最贵的循环，而多数失败是机械的（占位符未替换 / 文件未建 / 行号失效）。gate 命令已存在（machine-interface.js envelope 契约），目前主要给 daemon 用，agent prompt 里没有引导。

### P0-4 archive 六步并两步（保留 diff 注视步）
> ✅ 全量并步已落地（6 步 → 3 步）：distill noAI 前置（ql-20260910-021-f569）+ 四语义步合并为「extract-module-impact 与归档语义收尾」（migratedFrom 按名吸收存量进度）+ 确认归档保留 diff 注视并注入完成度快照。取证结论：三处注视点（完成度暂停/文档同步异常裁决/确认 diff 注视）全部保留，只砍仪式性往返（6 次 --done → 2 次人工 + 1 次 noAI）。附带修复：archive 退出 auxiliary 完成重置（终态阶段不参与可重跑重置，保 unregister 终态供平台渲染完成度）。

- **内容**：拆成 1 个 noAI「机械归档」步（完成度报告、三重核对、范围对账、目录搬移 + DB + git add 全是 CLI 已做的事）+ 1 个 LLM「语义提炼」步（decision-distill + module 卡语义更新）。6 次 --done 往返砍掉 4 次。
- **边界**：「确认归档」前的 diff 注视步必须保留（§2 边界 2），并两步后注视点合并进语义步前的确认子动作。

## 4. P1 —— 结构批（配置级改动与单写入者）

### P1-1 docs-check 扫描集纳入 .sillyspec/changes/ 与 knowledge/
> ✅ 已落地（ql-20260910-022-9b1d：DEFAULT_DOC_PATHS 扩两根 + 存量 23 处漂移清零）。

- **内容**：DEFAULT_DOC_PATHS 扩两根（或 local.yaml docs-check.paths 配置先行）。
- **依据**：最活跃、最易产生漂移引用的变更目录与决策库目前行号引用零校验；配置级改动立刻生效，全清单性价比最高。
- **配套**：与 P1-2 成对——不先纳入扫描，符号锚迁移少一半主战场。

### P1-2 符号锚：新引用即用 + 存量增量迁移（先于 tie 消解）

- **内容**：docs-check 已支持符号锚语法（如 `src/run/stage.js::runStage`——校验时解析符号定义行，层 2 关键词断言自然满足，行漂移天然免疫）；新文档引用一律用符号锚（政策，即刻）；存量行号锚按触碰时机增量迁移（债，不搞一次性工程）。
- **依据**：config-schema.js:21 已立「引用符号名不用行号」规矩但仅此一处；31~67 个重锚提交、单批最多 47 处的漂移税是行号锚的直接成本。
- **依赖顺序**：符号锚落地后重锚从「每次代码移动」降为「仅改名时」，tie 消解需求本身数量级萎缩——tie 消解排在符号锚之后，且注意 docs-check classifyFix 的 tie「无置信度」是 D-001 刻意设计边界（层 2 多候选可能同时通过），不强行突破。

### P1-3 run --meta（SS-META 毕业 = MCP Phase 1）
> ✅ 已落地（ql-20260910-025-599e：--meta flag + SILLYSPEC_RUN_META + meta.change 字段；gate 结果嵌入未做——P0-3 已注入预检命令行）。

- **内容**：SS-META 机器块（stage/stepName/requiresUser/doneCommand）从仅 auto 模式毕业后所有模式；run <stage> --meta 输出 envelope（prompt 文本 + doneCommand + 状态 + gate 预检结果），宿主 skill/脚本直取。
- **依据**：零新机制（requiresUser 已是纯函数 src/run/prompt.js:252，SS-META 渲染已存在 src/run/prompt.js:1182）；run 拒绝 --json 的缺口（command.js:244）由此补。

### P1-4 QUICKLOG 结构化 sidecar

- **内容**：CLI 写 QUICKLOG 条目时顺手落结构化 JSON sidecar；平台推送直接用 payload，md 只给人看。
- **依据**：消灭 JS buildPushPayloadFromRaw 与平台 quicklog_parser.py「同款切分口径」的双解析对齐税（CRLF 状态行恒失败、嵌套子字段劫进 files 等事故族）。

### P1-5 decisions 单一写入者

- **内容**：decisions add/edit 命令式写入 canonical 格式（或 decisions.json 真源 + md 渲染视图），agent 不手拼格式。
- **依据**：decision-flat-list-silent-zero（扁平格式解析 0 条静默放行）与双格式兼容代码直接退役；design-facts ↔ decision-distill 复刻解析器随之消解。

### P1-6 commit --apply（限 archive 阶段内）

- **内容**：commit-suggest 已产出 message + 精确 pathspec，补 --apply 执行（显式 pathspec 的 git add + commit），**只限 archive 阶段内使用**（那里文件已验收、pathspec 已显式）。
- **依据与边界**：agent 上下文里「需人确认」是伪约束——agent 不会停下来等人类点确认；多会话仓任何通用自动 git 操作都是历史重灾区（commit 扫入预暂存并行工作、checkout 误覆盖、cleanup 删分支 ref）。不作为通用命令开放。

## 5. P2 与限定项

### P2-1 MCP server（Phase 2/3，分阶段）
> ✅ Phase 2 已落地（2026-09-11：`sillyspec mcp` 最小 stdio server，四件只读 tools——next/gate/derive/progress，子进程 --json 隔离、schema 化参数锁 flag 幻觉面；ql-20260911-011）。Phase 3（--done 状态推进走 MCP）仍留待。

- Phase 1 = P1-3（--meta）。Phase 2：next/gate/derive/progress/verify-probes 暴露为 MCP tools。Phase 3：--done 走 MCP。
- **约束（评审一）**：(a) --wait/--continue --answer 在 tool 模型里是长事务，需拆 tool 或加会话态；(b) shell 通道不能删（CI/人直用），双通道一致性是持续成本；(c) tool 与命令 1:1 映射不等于抗幻觉——真正锁死的是把 next 返回的 doneCommand 作为结构化字段供宿主强制串联。
- **定位**：周级独立工程，不与小时级 P0 混排。

### P2-2 coverage 存在性事实
> ✅ 已落地（2026-09-11：commands.coverage 显式配置触发 + lcov 产物 SF: 集 × 变更 diff 交集，渲染内建「存在性≠行为覆盖」语义边界，fail-soft；不解析任意 runner stdout）。

- **内容**：local.yaml 显式 commands.coverage 配置触发，CLI 算「变更文件 × 被测文件」交集注入。
- **语义边界（关键）**：交集只证明**存在相关测试文件**，不证明行为覆盖——注入时必须标注为「存在性」而非「已覆盖」；不自动解析 runner 输出（格式多样性是长期维护税）。

### P2-3 schema 普及与 task 真源归一
> ✅ 两半均已落地（2026-09-11）：schema 普及 = `sillyspec validate --change` 总命令（聚合 facts/task-review/stage-review/module-map 校验器 + required-evidence/endpoints 轻形状；ql-007/008，附带修复门禁快照 .sillyspec 盲区）；task 真源归一 = review.json verdict 唯一真源、`review write` 落盘即由 CLI 勾选 checkbox（autoCheck 复用）、execute/verify prompt 七处改「CLI 唯一勾选者，禁止手动勾选」（ql-010）。

- review.json / verify-required-evidence / endpoints / module-map / machine envelope 统一 JSON Schema + validate 总命令（verify-facts 是唯一有真 validator 的先例）。
- task 状态真源归一：review.json verdict（已 schema 化 + git 证据校验）为唯一真源，agent 永不手勾 checkbox，tasks.md 勾选由 CLI 渲染。
- IR 自描述：steps.output 200 字截断的全文（artifacts/*.txt、user-inputs.md）映射写进 dump；module-map 的 paths（CLI 扫描）与人工语义标注分字段，rebuild --force 不再可能清空手工内容。

### P2-4 wait/answer 直连（平台模式限定）
> 客户端面已具备（requiresUser 纯函数 + --wait-interactive TTY 直收）；平台侧问答直连属 sillyhub 服务端改造，留待。

- 平台/daemon 模式下用户有 Web UI，问答直连（requiresUser 已是纯函数）；CLI 独立模式下 agent 就是人机界面，不砍。

### P2-5 其余
> 逐项裁决（2026-09-11）：
> - next --apply ✅ 已落地（建议为 CLI 命令形态时代跑，恢复链 noAI；非命令形态不代跑）。
> - doctor --fix ✅ **已满足**（实证：--align-execute-progress / --cleanup-remnant / --cleanup-ghosts / --gc-unstamped-runs 修复子命令已存在，默认 dry-run + --confirm 落盘——比自动跑更符合多会话仓边界，无需新增 --fix 聚合）。
> - IR 自描述（dump 含 artifacts）✅ **已满足**（progress dump 已含 artifacts 清单；QUICKLOG sidecar 落地后条目另有结构化来源）。
> - 模块卡注入统一：execute 已路径化（allowed_paths 最长前缀）；brainstorm/plan 阶段 task 卡未生成、无结构化路径源可匹配——关键词匹配是该阶段唯一可用口径，**维持现状**（裁决结案）。
> - 铁律 8 消亡 ✅ 已落地（2026-09-11：三类骨架盖 generated_by provenance 戳 + 铁律收窄为「骨架优先，仅手写补文档才手填元数据」；validateMetadata 现行为保持，戳为未来只认 CLI 戳的审计依据；ql-009）。
> - module-map 字段分离 ✅ 已落地（2026-09-11：rebuild --force 改 merge 语义——existing 全字段保留、卡片补缺、骨架垫底，实例文件头的「勿跑 --force」警告退役；ql-006）。
> - 小档流程瘦身、schema 普及、task 真源归一、MCP Phase 2/3：按 §6 排期留待（MCP Phase 1 --meta 已落地 ql-20260910-025）。

- 模块卡注入统一到路径解析（brainstorm/plan 的子串匹配 → execute 的 allowed_paths 最长前缀口径）。
- 小档流程瘦身（scan profile 分档先例推广到主流程 stage：small 档合并 brainstorm 后三步等）。
- next --apply 与 doctor --fix（安全集：align-execute-progress / cleanup-remnant）。
- 铁律第 8 条（author/created_at 手写）消亡：骨架命令统一预填戳记，validateMetadata 只认 CLI 戳。

## 6. 优先级总表

| 批次 | 项 | 关键前置 / 边界 |
|---|---|---|
| P0-1 | 测试步 noAI 化 + 结论草稿预填 | 三前置同批：结果复用、归因透传、预填不进判定链 |
| P0-2 | --output 摘要 CLI 合成 | 语义性输出保留 agent，事实性摘要 CLI 合成 |
| P0-3 | gate 预检进 prompt | 无 |
| P0-4 | archive 并两步 | diff 注视步保留 |
| P1-1 | 扫描集纳入 changes/ + knowledge/ | 与 P1-2 成对 |
| P1-2 | 符号锚（新引用即用 + 增量迁移） | 先于 tie 消解；tie 的无置信度边界不强行突破 |
| P1-3 | run --meta（MCP Phase 1） | 无 |
| P1-4 | QUICKLOG 结构化 sidecar | 无 |
| P1-5 | decisions 单一写入者 | 无 |
| P1-6 | commit --apply | 限 archive 阶段内 |
| P2 | MCP Phase 2/3、coverage（存在性语义）、schema 普及、task 真源归一、wait 直连（平台限定）、其余 | 按触碰时机顺势做 |

## 7. 实施依赖与顺序

1. P0-1 三前置是准入条件，不满足不落地（重复跑会把最贵环节成本翻倍；归因缺失会让 agent 替并行会话背锅；预填进判定链会被锚定偏差污染）。
2. P1-1（扫描集）先于 / 伴随 P1-2（符号锚迁移）；P1-2 先于 tie 消解。
3. MCP 严格三阶段（--meta → tools → --done 走 MCP），shell 通道全程保留。
4. 每砍一步前取证该步拦截历史（§2 砍步判据）；凡承担语义归因的步骤（§2 三条边界）一个都不进 noAI 名单。

## 8. 三方分歧裁决记录

| 分歧 | 裁决 | 理由 |
|---|---|---|
| 评审二：「docs-check 已支持 path.js 双冒号 symbol」 | 当时**不实**（已由 P1-2 落地） | 裁决时点 docs-check.js 全文零 symbol 匹配逻辑、REF_RE 仅行号；符号锚语法已随 P1-2 新建 |
| 符号锚优先级：评审一 P1 vs 评审二 P2 | P1（新引用即用）；存量迁移按 P2 增量债 | 新引用是零成本政策 + tie 萎缩依赖符号锚先落地；存量一次性迁移确是增量债 |
| 重锚提交数 31 vs 67 | 量级 30+，口径差异 | 窄 grep「重锚」31 / 宽 grep 含「锚点」67 |
| coverage 证据强度 | 降为「存在性」事实 | 交集只证存在相关测试文件，不证行为覆盖；弱事实不标注语义就成新幻觉源 |
| commit --apply 通用 vs 限 archive | 限 archive 内 | agent 上下文「需人确认」是伪约束；多会话仓 git 自动化是历史重灾区 |
| wait 直连 | 平台模式限定 | CLI 独立模式下 agent 即人机界面，无可砍 |
| MCP 放 P0 vs 降级 | 降为分阶段（Phase 1 落 P1） | 周级工程不该挤占小时级 P0；评审一另补三条实施约束（§5 P2-1） |
| 「35+ 往返是纯税」 | 修正为「部分是刻意注视点」 | 砍步判据改为拦截历史取证（§2） |
