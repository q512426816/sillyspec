# auto-flow-optimization — 关键设计决策

author: qinyi
created_at: 2026-06-26 12:00

## D-001: 不使用数值 confidence

**决策：** 不使用 `0.52` / `0.86` 这样的数值 confidence 评分。
**改为：**
- `decision_level`: `high` / `medium` / `low`（枚举）
- `has_blocking_questions`: `true` / `false`（布尔，推进判断的唯一依据）
- `blocking_reasons`: `string[]`（阻塞原因的可读描述）

**原因：**
agent 对自身判断的置信度不可靠。0.52 和 0.86 之间没有实际可操作的区别——无论写 0.52 还是 0.86，用户都要看具体问题。数值精度是虚假的，会给用户错误的确定感。

**替代方案：** 枚举 + 布尔。推进判断只看 `has_blocking_questions`，不看数字。

**影响：** next-action.json 结构；risk-profile.json 不含 confidence 字段。

---

## D-002: 自动决策必须基于 checklist

**决策：** agent 不能凭"我觉得影响不大"自动决策。必须逐条检查可执行的 checklist（AC-001 ~ AC-010）。

**checklist 内容（全部 ✅ 才可 AUTO_DECIDED）：**
```
AC-001: 未修改公共 API
AC-002: 未修改数据库 schema
AC-003: 未涉及鉴权/权限
AC-004: 未扩大 allowed_paths
AC-005: 未引入新外部依赖
AC-006: 未修改核心模块
AC-007: 已有项目约定可复用
AC-008: 不影响向后兼容
AC-009: 不涉及数据迁移
AC-010: 单模块范围内可完成
```

**原因：**
"影响不大"是主观判断。checklist 是客观规则，可审计、可调试、可扩展。
如果 agent 跳过 checklist 直接标记 AUTO_DECIDED，plan-postcheck 应标记为 FAIL。

**影响：** brainstorm-contract.md 的自动决策规则；decisions.md 中 AUTO_DECIDED 必须引用 AC-xxx。

---

## D-003: plan 必须校验 brainstorm 产物

**决策：** plan 阶段开始前，必须通过 plan-postcheck 校验 brainstorm 产物。如果产物不完整或存在未解决的 BLOCKER gaps，不能继续 execute。

**校验结果：**
- PASS → 继续 plan
- WARN → 继续 plan，但在 plan.md 中记录 warning 并分配补齐任务
- FAIL → 回退到 brainstorm 补齐（最多 2 次重试）

**原因：**
brainstorm 改为全自动后，质量保证不能只靠 agent 的自觉。需要在下一个阶段（plan）加一个结构性校验，形成闭环。plan 是第一个需要"读懂" brainstorm 产物的阶段，最适合做校验。

**影响：** 新增 `src/brainstorm-postcheck.js`；auto.js 编排逻辑；plan.js 初始化逻辑。

---

## D-004: worktree auto apply 不使用 diff 数量阈值

**决策：** 不用"diff < N 行就自动 apply"这种简单阈值。

**改为基于风险矩阵：**
```
判断因素：
- touched files 类型（是否 P0 触发文件）
- 是否命中公共模块
- 是否入口文件（index.ts / main.ts）
- 是否 schema/migration/config
- 是否删除/rename 操作
- verify 结果
- allowed_paths 命中情况
- protected files 是否被修改

综合以上因素计算 risk-profile.json，
基于 risk-profile.level 决定 apply 行为。
```

**原因：**
改一个 200 行的大函数和改 200 个文件各一行，前者风险高得多。diff 数量不等于风险。风险矩阵虽然复杂一点，但每次判断结果可审计。

**影响：** risk-gates.md 的 apply 决策规则；change-risk-profile.js 扩展。

---

## D-005: 用户确认只针对业务阻塞和 P0 风险

**决策：** 用户确认从"每个阶段切换"改为"只在以下情况触发"：

```
触发用户确认：
1. brainstorm 有 blocking questions（需求不清晰或需要业务决策）
2. P0 风险变更（删除数据、改 DB、改鉴权、改支付等）
3. verify 失败后仍要继续
4. agent 遇到无法自行判断的情况

不触发用户确认：
- 阶段切换（brainstorm → plan → execute → verify → archive）
- P1/P2 风险变更
- brainstorm 的自动决策
- plan 的任务拆分
- execute 的代码实现
- verify 通过后的 apply（非 P0 时）
```

**原因：**
用户被决策疲劳折磨。确认应该是有价值的——用户真的需要做决定的时候才问。流程节点的确认是噪音，不是信号。

**影响：** run.js 的 wait 逻辑；auto.js 编排逻辑；各 stage 的 prompt。

---

## D-006: 阶段隐藏不删除

**决策：** 内部保留 scan / brainstorm / plan / execute / verify / archive 完整链路。从用户视角折叠为 auto 模式的一个命令。

**原因：**
SillySpec 的价值就在这条链路。删了就成普通 coding agent。阶段之间的校验和产物传递是核心能力。

**实现方式：**
- auto 模式在 `src/stages/auto.js` 中编排各阶段
- 各阶段的 step prompt 和产物校验逻辑不变
- auto.js 负责阶段间自动推进 + wait 逻辑

---

## D-007: 现有 quick 模式保持不变

**决策：** `sillyspec run quick` 不做任何改动。auto 模式是新入口。

**原因：**
quick 是成熟稳定的功能，用户已经熟悉。auto 是新场景。不要为了统一而破坏已有功能。

auto 模式的 classify-change 步骤可能在检测到极小变更时建议降级到 quick，但不自动切换。

---

## D-008: risk-profile.json 由 CLI 生成

**决策：** `risk-profile.json` 由 CLI（`change-risk-profile.js` 扩展）根据文件路径、diff 内容、brainstorm 产物自动生成，不由 agent 手写。

**原因：**
风险判断应该是可复现的。agent 手写容易不一致。CLI 基于固定规则生成，每次结果相同。

**agent 负责生成：** design.md, decisions.md, gaps.md, assumptions.md, next-action.json
**CLI 负责生成：** risk-profile.json

---

## D-009: summary 输出结构化

**决策：** auto 模式的最终 summary 使用固定格式，包含以下信息：

```
✅ 需求：<用户原始需求>
📝 设计：<几个决策，几个待确认>
📋 任务：<几个任务>
🔧 实现：<几个文件修改>
✅ 验证：<通过/失败，什么测试>
📦 应用：<已自动应用/等待确认>
📄 影响模块：<模块列表>
⚠️ 风险：<P0/P1/P2> + 触发规则
```

**原因：**
用户需要快速了解发生了什么。结构化格式便于扫描，也便于工具解析。

---

## D-010: auto 模式的 classify-change 可被覆盖

**决策：** auto 模式自动分类变更规模（quick/auto/full），但用户可以：
1. 显式指定 `sillyspec run auto --mode full`
2. 或在 `.sillyspec/local.yaml` 中配置默认模式

**原因：**
自动分类可能不准。用户对自己的变更规模有更好的判断。

**配置：**
```yaml
auto_mode:
  default_classify: "auto"  # auto / quick / full
  # 以下规则会覆盖 classify-change 的关键词匹配
  force_full_patterns:
    - "数据库"
    - "迁移"
    - "鉴权"
  force_quick_patterns:
    - "fix typo"
    - "更新文案"
```
