# auto-flow-optimization — 任务清单

author: qinyi
created_at: 2026-06-26 12:00

> 本文档只列任务，不列优先级。优先级参见 design.md §8。

## P0 任务

### T-001: brainstorm artifact-first 改造
- 修改 `src/stages/brainstorm.js` 的 step prompt
- 去掉"请确认"相关指令
- 加入 artifact-first 写作规则（直接写文件，对话只输出摘要）
- 将步骤从 ~6 步合并为 ~4 步
- 产物目录结构：`brainstorm/design.md`、`brainstorm/decisions.md`、`brainstorm/gaps.md`、`brainstorm/assumptions.md`
- 参考：brainstorm-contract.md

### T-002: brainstorm next-action.json 生成
- 在 brainstorm 步骤中新增 next-action.json 生成规范
- 定义 status / has_blocking_questions / decision_level / questions / auto_decisions 字段
- 参考：brainstorm-contract.md §3

### T-003: brainstorm 自动决策 checklist
- 实现 AC-001 ~ AC-010 的检查逻辑（可在 step prompt 中描述，不一定要硬编码）
- AUTO_DECIDED 决策必须引用 checklist 项
- 参考：brainstorm-contract.md §4

### T-004: next-action.json 驱动推进
- 修改 `src/run.js`：brainstorm 完成后读取 next-action.json
- `has_blocking_questions === false` → 自动进入 plan
- `has_blocking_questions === true` → wait 用户，输出 questions
- 用户回答后更新 next-action.json，重新检查

### T-005: risk-profile.json 扩展
- 扩展 `src/change-risk-profile.js`，从现有 integration-critical 升级为 P0/P1/P2 三级
- 新增文件路径检测
- 新增 git diff 检测
- 新增 brainstorm 产物检测
- 产出结构化的 risk-profile.json
- 参考：risk-gates.md

## P1 任务

### T-006: sillyspec run auto 入口
- 新增 `src/stages/auto.js`
- auto 模式编排：classify → scan-check → brainstorm → plan-postcheck → plan → execute → verify → apply → archive → summary
- 参考：design.md §4.1

### T-007: classify-change 分类器
- 新增 `src/classify-change.js`
- 基于需求描述关键词 + 用户显式指定 → quick / auto / full
- 参考：design.md §5

### T-008: 阶段自动推进
- auto.js 中各阶段完成后的自动推进逻辑
- plan → execute → verify → archive 的自动衔接
- 每个衔接点检查 risk-profile 和 next-action.json

### T-009: summary 输出格式化
- auto 模式最终输出结构化 summary
- 参考：decisions.md D-009

## P2 任务

### T-010: brainstorm-postcheck 实现
- 新增 `src/brainstorm-postcheck.js`
- 校验 brainstorm 产物完整性
- FAIL → 回退到 brainstorm
- 参考：plan-postcheck.md

### T-011: worktree apply 风险矩阵
- apply 决策基于 risk-profile.json 而非 diff 阈值
- 参考：risk-gates.md §5

### T-012: verify 通过后自动 archive
- auto 模式中，verify 通过且 apply 完成后自动触发 archive
- archive 不再需要用户手动执行（在 auto 模式下）

### T-013: sillyspec run full 入口
- full 模式编排，相比 auto 使用 deep scan + worktree + 更强验证

### T-014: local.yaml 配置扩展
- 新增 protected_files 配置
- 新增 auto_mode 配置（默认分类 + force patterns）
