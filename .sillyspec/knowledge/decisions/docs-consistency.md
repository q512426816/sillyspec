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
