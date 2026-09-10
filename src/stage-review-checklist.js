/**
 * 三 stage 审查清单单一来源（2026-09-10-review-dispatch task-01 / FR-05 / D-001@1）
 *
 * 条目从 stages/{brainstorm,plan,execute}.js 的 prompt 文本逐字迁移（2026-09-10）——
 * 文字/标点/全半角/markdown 记号零改动：下游 plan-postcheck、review-dispatch
 * worker_prompt（task-03）等可能字面引用，改写即漂移。
 * 一致性由 test/stage-review-checklist.test.mjs 钉死（内嵌迁移前快照逐条比对）。
 *
 * 条目为纯文本，不含序号/checkbox/缩进等结构性前缀（渲染层负责前缀形态）：
 * - brainstorm：前 3 条 =「交叉审查模型」三层检查（prompt 内渲染为「N. 」序号行），
 *   后 6 条 =「交叉点抽取」（渲染为「- 」列表行）；
 * - plan：渲染为「- [ ] 」checkbox 行（审查清单段）；
 * - execute：渲染为 2 空格缩进的「N. 」序号行（QA 段「以下三项始终必查」）。
 */
export const REVIEW_CHECKLISTS = {
  brainstorm: [
    '**定义层**：模糊概念是否有可测试定义。例如"高可用""异常数据""本地缓存""重试"。',
    '**一致性层**：跨章节/跨产物是否打架。例如数据流 vs 容错策略、schema vs 输入格式、非目标 vs tasks。',
    '**可行性层**：关键假设是否有来源。例如 P99 延迟、上游 SLA、缓存 TTL、数据量、权限模型、兼容旧配置。',
    '模块 A 依赖模块 B 的实体/状态/接口',
    'requirements.md 的 FR 与 design.md 的数据模型/API/状态机',
    'design.md 的容错策略与数据流、缓存、重试、回滚',
    'tasks.md 的执行范围与 design.md 的非目标',
    'decisions.md 的 D-xxx@vN 与 design.md 当前说法',
    'scan/module docs 或源码中的真实约束与 design.md 假设',
  ],
  plan: [
    'task 编号与 Wave checkbox 格式正确，execute 依赖此格式解析任务',
    'plan_level 档位与实际复杂度匹配（none/light/full 没选错）',
    '跨任务契约：task-A 的产出（接口/DTO/响应）被 task-B 消费时，consumer 是否在 TaskCard expects_from 声明所需字段、provider 是否在 provides 承诺、两边字段一致？（plan-postcheck 会硬校验，此处是独立视角复查）',
    '文件覆盖：design.md 文件变更清单中的每个源码文件，是否都被至少一个 task 的 allowed_paths 覆盖？（漏覆盖 = execute 必然漏改。跨仓变更对账口径：design 清单按「## <repo-key> 仓变更」分段、路径相对各仓根，task 卡 repo: + 同口径相对路径匹配——allowed_paths 带仓库名前缀或绝对路径 = 永不命中、对账不上）',
    '不存在 P0/P1 unresolved blocker 残留',
    '没有实现细节泄漏到 plan.md（接口签名/代码示例应在 tasks/task-NN.md）',
    '关键路径与 Wave 依赖合理（无循环依赖、无遗漏前置）',
    'Wave 分组说明：依赖方向违规（depends_on 同 Wave / 后置 Wave）在 --done 时会按拓扑**自动修复**（提案经一致性+文件面验证后落盘）；共享文件的手工分 Wave 串行是合法安全模式，不会被自动改写',
    '连带测试归属：本批改动是否会导致既有测试断言失效（改共享/被多 task 依赖源文件、改被测试精确匹配的值如 UI 文案/按钮文本/错误信息/常量/枚举字面量、改函数签名或返回结构等单文件场景）？此类 task 是否在 related_tests 声明了失效测试、且路径在 allowed_paths 内（或由独立测试 task 覆盖）？（漏声明 = execute 阶段测试债、主代理事后兜底）',
    'acceptance 字段对照实际 schema/类型源文件核验存在性与形态，不凭 design.md 文字臆断（plan-postcheck best-effort grep 会给 allowed_paths 源文件未命中的 snake_case/camelCase 标识符提 warning，此处是语义层复查；臆断 = execute 阶段返工）',
  ],
  execute: [
    '跨 task 交界（A 产出的接口/数据结构与 B 的消费是否对得上）',
    'design.md 整体对照（最终实现拼起来是否仍符合设计意图，而非仅各 task 局部合规）',
    '组装行为（全量测试/构建/启动通过——单 task 测试全绿 ≠ 组装正确）',
  ],
}
