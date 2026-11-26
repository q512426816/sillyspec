---
author: t
created_at: 2026-11-26 09:58:05
---

# 决策记录

## D-001@v1 机器段保留面收窄为测试实测门+PID 回收
- type: scope
- source: user
- 状态：accepted
- 问题：verify 机器段六件（质量扫描实测 / 探针预填 / 验收×覆盖矩阵 / handover+db 声明门 / 集成证据门 / PID 回收）迁 archive 时保留哪些？
- 决策：仅保留测试实测门（archive 前置 CLI 亲跑 commands.test，失败阻断归档）与 PID 回收（读 `verify-services-<change>.pids` 击杀进程树）；其余随阶段删除。
- 理由：用户裁决——verify 历史零 FAIL、无拦截账，保留最小面即可；PID 回收是防服务泄漏的事故护栏不可丢。
- 替代：全保留机器段（与「没拦过真实问题」动机矛盾）；全删（丢防泄漏护栏）。

## D-002@v1 verify.mode 开关随阶段删除
- type: architecture
- source: user
- 状态：accepted
- 问题：上一变更引入的 `verify.mode: skip` 仓级开关在阶段删除后如何处置？
- 决策：`src/verify-mode.js` 与 config-schema 键随阶段一并删除；存量 local.yaml 读到该键忽略不报错（零摩擦）。
- 理由：阶段删除后开关失去作用对象。
- 故障面：存量 local.yaml 残留 verify.mode 键——无消费者读到忽略，零故障面。
- 退役判据：若后续 archive 前置门需要仓级开关，按新键重新设计（不复用本键语义）。
- 替代：保留键改作 archive 门开关（多一个配置面，无用户诉求）。

## D-003@v1 发版延后与后续改进合并
- type: process
- source: user
- 状态：accepted
- 问题：删除 verify 阶段（完整流程五阶段→四阶段）是否立即发 npm 版本？
- 决策：本变更合仓不发版；版本号策略（建议 major 4.x）留到发版批次统一裁定。
- 理由：用户原话「不急发布新版，我得做更多的改进项再一起发布」。
- 替代：立即 major 4.0.0（用户否决）；minor（掩盖破坏性变更）。

## D-004@v1 在途 verify 变更走 legacy 完成路径
- type: compatibility
- source: user
- 状态：accepted
- 问题：升级时进度库停在 verify 阶段的在途变更（完整流程用户）怎么兼容？
- 决策：doctor / 阶段入口检测到 verify 阶段在途时提供一次性 legacy 完成路径（自动补盖完成戳进 archive，或指路手工收尾），不静默断流。
- 理由：直接断会留死变更且用户体验差。
- 替代：直接断（doctor 提示用户自理）。

## D-005@v1 机器门内嵌 archive 首步（方案A）
- type: architecture
- source: user
- 状态：accepted
- 问题：机器门（测试实测+PID 回收）挂载架构选哪种？
- 决策：archive 步骤表头部插 noAI 步「收口实测门」——复用 `verify-quality-scan` 的 runner 与指纹缓存承载测试实测；PID 回收挂 archive 收尾；不新增 CLI 命令面。
- 理由：复用 noAI 步与 completeStageGates 既有管线零新概念；改动集中（~30-35 文件）。
- 故障面：noAI 步执行异常（runner 挂起/超时）——沿用 verify-quality-scan 既有超时与指纹落盘机制，失败不盖 completed 可重入。
- 退役判据：若 pre-push/CI 需要脱离阶段机独立调用收口门（见 D-006 复潮条件），本内嵌形态升级为命令门。
- 替代：方案 B 独立命令门（见 D-006 rejected）。
- 证据：方案选择轮用户确认（2026-11-26 会话）。

## D-006@v1 独立命令门 gate close（方案B 落选）
- type: architecture
- source: user
- 状态：rejected
- 问题：同 D-005 取舍问题。
- 决策：不采用——当前无第二调用方（pre-push/flow done 均可后续再加），抽象先行；新增 CLI 注册+帮助+文档面约 5 文件；门失败回滚语义需脱离阶段管线重接。
- 故障面：命令门与阶段机解耦后，绕过 `run archive` 直接调命令会绕过归档事务——这正是被否决的失败模式之一。
- 退役判据：与本条 rejected 语义相同（见复潮条件）。
- 复潮条件：pre-push/CI 产生真实独立的收口门诉求且 noAI 步管线无法承载时，以 D-006@v2 重提。

## D-007@v1 完整流程验收范式降级为与轻量道同强
- type: scope
- source: user
- 状态：accepted
- 问题：C3 删除 verify 全部语义验收面（风险判级门 / PASS 封顶四条件 / 集成证据门 / 探针 1-10 / 覆盖矩阵 / Runtime Evidence / design 一致性 / smoke 纪律）后，archive 前置门只剩 CLI 跑 commands.test + lint——完整流程验收强度与轻量快道 flow done 实测门等同，这个降级是否刻意？
- 决策：确认刻意——完整流程独特价值从此＝plan 任务编排 + archive 文档同步/蒸馏，不再含「更强验收」；登记风险 R5 防后来人误判为疏漏。
- 理由：用户裁决（2026-11-26 设计审查轮原话「你 C3 已经选了这条路，我不翻案」）。
- 替代：保留语义验收面（违反 C3，与关停动机矛盾）。

## D-008@v1 收口实测门「机制留、本仓关」——测试责任归 CI
- type: scope
- source: user
- 状态：accepted
- 问题：收口实测门（CLI 亲跑 commands.test）在本仓「巨慢且被 CI 兜底稀释」，是删机制 / 缩面 / 保留？
- 决策：机制保留（服务无 CI 仓的兜底防谎报能力，AGENTS 00 条开放世界约束禁止为单仓删死）；本仓用 `unavailable → 归 pre-push/CI` 逃逸机制关闭收口亲跑（与 commands.lint 同款套路），留痕归 CI。PID 回收随之一并关/删——登记源头在 verify prompt，删阶段后无写入方，留则死码空转。
- 修订：本决策 refinements D-001（"archive 前置 CLI 亲跑失败阻断"→本仓为关闭态）与 D-005（"内嵌 archive 首步的门"本仓配置为关闭）：机制形态不变，本仓落点从「阻断」变「关闭留痕」。
- 理由/证据：788 份归档 verify-result 中可识别结论的 89 份里 88 份 PASS/PASS-with-notes、仅 1 份 FAIL、70 份（8.9%）含 `<待填` 骨架未填即归档——文书层零拦截力；CLI 亲跑是同一改动生命周期第 2-3 次测试执行（execute 自跑→收口亲跑→CI 全量），且直接依赖面字符串口径（deps-symbol-narrow）保守多跑致巨慢；本仓 pre-push 已于 2026-10-16 将全量测试移交 CI（本地并发假红连拦五次），CI 为全量硬门，本地亲跑仅「提前发现」、边际价值被稀释。
- 故障面：本仓关掉收口亲跑后，agent 谎报「测试绿」仅由 CI 兜底——反馈延迟到 push/CI；靠 execute 阶段「写测试跑测试」纪律 + plan 测试绑定提前暴露。
- 退役判据：CI 可靠性下降（红灯漏放合并）或出现本地必须绿的强场景时，撤销 unavailable 即恢复本仓收口亲跑。
- 替代：彻底删机制代码（违反 AGENTS 00 条，无 CI 仓裸奔）；缩到变更自测（仍保留一次本地亲跑，未解「被 CI 兜底稀释」的性价比问题）。

## D-009@v1 执行期裁决：预填注 advisory 随探针族删+死码清理归删除调用者
- type: scope
- source: design-grill
- 状态：accepted
- 问题：task-04 执行发现两处计划外耦合——①brainstorm/plan 预填注 advisory（gates.js:822-830）消费 verify-probes 的 runProbe10PrefillNoteClearance（不在十签名清单）；②删调用后 verify-postcheck/verify-quality-scan 产生 3 项死码 export 触发 check-syntax 硬门。
- 决策：①预填注检测（advisory 档+error 档）随探针族整体删除——error 收口门本就挂 verify 已随阶段删，advisory 单飞价值低，「预填≠结论」防呆由 draft-ledger 与卡片骨架注释承载；②死码清理责任归删除调用者任务卡（renderVerifyTestAttribution 因内部消费仅 de-export，去留 task-02 更名挂载时再定）。
- 影响 task：task-04（已并入）、task-02（renderVerifyTestAttribution 去留）。
- 替代：预填注检测迁保留面（与 C3 全删口径矛盾）；死码留待后续卡（lint 硬门当轮即红）。

## D-010@v1 执行期裁决：摩擦信号消费点 verify 收尾→archive 收尾
- type: scope
- source: design-grill
- 状态：accepted
- 问题：complete.js 两处摩擦信号消费（consumeFrictionHint + ledger 滚动）挂 verify 收尾；verify 退役后完整流程变更的 friction tally 永不被消费/滚动进台账。
- 决策：两处消费点改挂 archive 收尾（归档是新收口点，收口义务随阶段迁移而非删除）。
- 影响 task：task-05（已并入）。
- 替代：删除消费点（摩擦台账机制在完整流程上断链——与 AGENTS 00 开放世界约束冲突）。

## D-011@v1 执行期裁决：verify-draft.js 随探针族整删+quality-scan 的 draft 残留归 task-02
- type: scope
- source: design-grill
- 状态：accepted
- 问题：task-06 删 verify-probes 命令族后 verify-draft.js 的 6 个 export 全部零引用（verify-result.md 填槽制 draft 机制，消费方只有 verify-probes --draft）；verify-quality-scan.js 的 evaluateConclusionDraft/renderVerifyTestAttribution 同为 draft/verify 收尾配套但归 task-02 更名面。
- 决策：verify-draft.js 在 task-07 随探针族整删（design 清单原列「核对」，升级为删除）；verify-quality-scan.js 的 draft 配套函数（evaluateConclusionDraft、renderVerifyTestAttribution）去留在 task-02 更名挂载时一并清理（D-009 延伸）。
- 影响 task：task-07（已并入）、task-02。
- 替代：保留 verify-draft 作独立模块（零消费者的死模块）。

