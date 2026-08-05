---
author: qinyi
created_at: 2026-08-05T23:45:00
---

# 模块影响分析（Module Impact）— 工具驾驭反馈修复

> 变更：`2026-08-05-tooling-feedback-fixes`
> 数据源：git diff HEAD（worktree apply 回主仓工作区的真实变更）× design §6 文件清单 × plan tasks allowed_paths 三重交叉，以 git diff 为准。

## 模块影响矩阵

| 模块 | 影响类型 | 相关文件 | 更新内容摘要 | needs_review |
|------|----------|----------|-------------|-------------|
| worktree | 逻辑变更 / 接口变更 / 新增 | src/worktree.js, src/worktree-deps.js | doctor deps 块改调 `checkDepsFreshness` + 新增 `deps-main-drift` issue；`_doctorReprovision` 先解 junction 再 `provisionDeps(force)`；doctor `--change` 全步骤过滤；放宽 in-place 守卫。`provisionDeps` 加 `force` 选项；新增 H1 `checkDepsFreshness`（五状态） | false |
| cli-entry | 逻辑变更 | src/index.js, src/run/command.js, src/run/complete.js | index.js 解析 doctor `--change`；command.js worktree 副本漂移自动锚定主仓 spec（specBase/specRoot/specDir/pm 四件套重写 + warn + 不 exit）；complete.js outputStep 后底部 `🚀 advanced to step` 行 | false |
| runtime | 逻辑变更 | src/run/stage.js | `ensureDepsFreshness` 内联判定改调 H1 `checkDepsFreshness`（行为等价 + 新增 main-drift 触发重供） | false |
| stages | 逻辑变更 / 新增 | src/stages/plan-postcheck.js, src/stages/plan.js, src/stages/execute.js, src/stages/verify.js, src/stages/cmd-existence.js（新文件）, src/scan-postcheck.js | 新增 H2 `validateScriptCommands`（cmd-existence.js，monorepo 感知）；plan-postcheck 新增 `validateTaskCommands` 硬阻断 + acceptance best-effort grep warning；stepReviewPlan 审查清单加 acceptance/schema 核验条；execute/verify 加「长测试前台同步跑」铁律；scan-postcheck 改调 H2 维持 warning | false |

## 未匹配文件（非模块源码）

| 文件 | 类别 | 说明 |
|------|------|------|
| test/worktree-deps.test.mjs, test/worktree-doctor.test.mjs, test/cmd-existence.test.mjs, test/worktree-execute-spec-drift.test.mjs, test/plan-postcheck.test.mjs, test/plan-postcheck-crlf.test.mjs, test/run-complete-step-verify.test.mjs | 测试 | 配套单测，归上述四模块但不单列 |
| docs/sillyspec/file-lifecycle.md | 文档索引 | 仅 updated_at→2026-08-05（无新文件类型/schema/流转） |
| docs/prompt/\_extracted.json, docs/prompt/plan.md, docs/prompt/execute.md, docs/prompt/verify.md | prompt 镜像 | 源码机械提取（\_extract.mjs），同步 task-07/09 prompt 改动 |
| .claude/skills/sillyspec-plan/SKILL.md, .claude/skills/sillyspec-doctor/SKILL.md | skill 行为指导 | plan 加命令存在性检查段，doctor 加 --change/deps-main-drift |
| .sillyspec/docs/sillyspec/modules/worktree.md, stages.md, cli-entry.md | 模块文档 | 反映上述模块改动（task-10 同步） |

## 备注
- 本次变更跨 worktree / runtime / cli-entry / stages 四模块，核心是 CLI 守卫 + postcheck 校验 + 输出锚定，无 daemon/backend 跨进程、无 session/lease 状态机、无部署启动路径（design §7.5 + verify-result.md 变更风险等级 = unit-sufficient）。
- gates.js design §6 列为「修改」但实际未改（--change 文案 baseline 前 e0b6a22 已就位），故不在 git diff，不列入矩阵——design 保守预估，见 verify-result.md NOTES。
