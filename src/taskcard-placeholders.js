/**
 * taskcard-placeholders.js — TaskCard 骨架占位符标记清单（叶子模块，无 import）。
 *
 * 坑 taskcard-placeholder-slip（2026-08-24 用户实证：task-03/04/06/07 留成空骨架直到人工
 * 审计才发现——validatePlanFeasibility 只查字段存在性/非空，占位值全过）。标记是
 * buildTaskcardSkeleton 生成的封闭集合，精确匹配零误伤；独立成叶子模块供骨架生成
 * （taskcard.js）与 plan-postcheck 校验两侧同源 import——放 taskcard.js 会与
 * plan-postcheck → taskcard → stages/plan → stages/index 形成 ESM 循环（TDZ 实证）。
 *
 * verify 字段的 `cd frontend && pnpm exec tsc --noEmit` 刻意不收——它可能是真实命令
 * （前端项目 tsc 检查），拦了反而误伤；其余标记不可能出现在已填充卡里。
 */
export const TASKCARD_PLACEHOLDERS = [
  { field: 'requirement_ids', marker: 'FR-XX' },
  { field: 'decision_ids', marker: 'D-XXX' },
  { field: 'allowed_paths', marker: 'src/example/file.ts' },
  { field: 'goal', marker: '一句话说明这个 task' },
  { field: 'implementation', marker: '具体步骤 1' },
  { field: 'acceptance', marker: '可验证的验收条件 1' },
  { field: 'constraints', marker: '边界约束 1' },
]
