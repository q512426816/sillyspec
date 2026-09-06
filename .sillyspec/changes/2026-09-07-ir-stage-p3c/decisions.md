---
author: qinyi
created_at: 2026-09-07T04:20:00+08:00
---

# 决策记录（Decisions）

## D-001@v1: 载体=decisions.md 模块域字段增强，不新建 design.facts 文件
- type: architecture
- priority: P0
- status: accepted
- source: docs
- question: 设计事实层（设计决定+影响模块+理由）的载体？
- answer: 种子稿原案 design.facts.yaml 不建——decisions.md 条目已含 type/question/answer/模块域/evidence（九字段+可选四字段），语义即「设计决定+影响模块+理由」；设计事实层=decisions.md 模块域字段从可选提升为推荐并加机器核验。判断层 design.md 散文不动。分析修正采纳：md 列表而非 YAML（agent 不易写坏，直进 docs-check 核验链）。
- normalized_requirement: 不新增设计侧 facts 文件；机器核验作用于 decisions.md 模块域字段
- impacts: [FR-01]
- 模块域: docs-consistency, stages, runtime
- evidence: docs/sillyspec/archify-ir-stage-proposal-2026-09-05.md §1；decision-distill.js:46/:226（模块域解析与三级兜底已存在）

## D-002@v1: 核验 gate=validateDecisionModuleRefs，ERROR 仅对不存在的模块 id
- type: architecture
- priority: P0
- status: accepted
- source: user
- question: 机器核验的门禁语义？
- answer: 用户预授权自主抉择：brainstorm「生成规范文件」步 --done gate 新增检查——decisions.md 各当前版本 D 条目模块域逐 id 核验：存在于 _module-map.yaml modules 键 或显式 NEW:<名> 前缀（规划中的新模块）→ 通过；不存在且无前缀=ERROR（模块幻觉）。design.md 文件清单×module-map paths 推导的实际模块集 vs 声明域并集差异=WARNING（声明面 vs 实改面提示）；模块域全缺失=WARNING 汇总（存量兼容不阻断）。
- normalized_requirement: ERROR 仅限「不存在的模块 id 且无 NEW: 前缀」；其余 WARNING；gate 挂 brainstorm 末步
- impacts: [FR-01]
- 模块域: runtime, docs-consistency
- evidence: 种子稿 §1「消灭设计了不存在的模块这类幻觉」；用户连续推进预授权（2026-09-07）

## D-003@v1: 方案A 三件套——核验 gate + design-init 骨架 + _facts 注入
- type: architecture
- priority: P0
- status: accepted
- source: user
- question: P3c 实现形态？
- answer: 方案A：①validateDecisionModuleRefs（纯函数+brainstorm 末步 gate 接线，D-002 语义）②design-init CLI 命令（design.md 十三章节骨架：决策追踪表从 decisions.md 当前版本 D 条目预填、文件变更清单表骨架；Step 6 prompt 卸责为填骨架、不强制——存量手写路径保留）③brainstorm Step2 注入 docs/<project>/scan/_facts.md（存在时全文注入，红线同 scan：禁止重新 grep 底稿覆盖的机械事实）。拒绝方案B（新 YAML 载体：agent 手写前科、与 decisions.md 双写漂移）。
- normalized_requirement: 三件套独立交付可分层落地；design-init 不强制（存量 agent 手写 design.md 仍过门）
- impacts: [FR-01, FR-02, FR-03]
- 模块域: runtime, stages, cli-entry
- evidence: 方案选择轮（预授权）；scan facts 红线先例（stages/scan.js prompt）

## D-004@v1: Grill 修正——NEW: 生产端指引/步骤级接线/签名统一/书写钉死
- type: consistency
- priority: P1
- status: accepted
- source: design-grill
- question: 审查 2 中 gap + 4 低 gap 如何修？
- answer: ①G1 NEW: 生产端：stages/brainstorm.js:360 模块域指引补 NEW: 写法（入文件清单）+ ERROR 出路提示；②G2 接线钉死步骤级钩子链 complete.js:281（warnMissingUiPrototype 同点位 exit 1 先例）非阶段级 rollback；③G3 签名统一（validateDecisionModuleRefs 无 designFileList 外参、parseDecisionDomains 收文本）；④G4 NEW: 冒号后不加空格钉死（带空格=书写错误 ERROR 并提示正确写法）；⑤G5 highestByNumber 未导出→design-facts 同款实现+双源一致性测试；⑥自观测说明：本变更自身将触发「声明域 docs-consistency 无实改」WARNING——R-02 首个观测样本，符合预期。
- normalized_requirement: 新模块决策必须有合法出路（NEW: 指引+提示）；接线点位与签名以本条为准
- impacts: [FR-01]
- 模块域: stages, runtime
- evidence: .sillyspec/.runtime/stage-reviews/brainstorm-review-p3c/review.json
