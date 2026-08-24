# 决策知识 — stages

> decision-distill 从变更 decisions.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为 docs-check 机械解析契约，勿手改。

## D-006@v1 防复潮注入挂 brainstorm Step2（knowledge-match 扩展），不新建步骤
状态：implemented
锚点：未记录
最近确认：test123
理由：扩展 knowledge-match 扫描 knowledge/decisions/，Step2 加载上下文时命中即注入否决理由与复潮条件；不加新步骤、不动 Step3+
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

## D-002@v1 doctor 漂移检测优先并入既有 step
状态：implemented
锚点：src/stages/doctor.js:1
最近确认：8aab190
理由：优先并入既有检查段（决策待复核检查同段或汇总报告前），避免 doctor 步骤数再动（上一变更六步化已连带改 6 个测试）
来源：2026-08-24-decision-touch-cli-drift

## D-003@v1 决策触碰注入必须覆盖 Wave 步 prompt
状态：implemented
锚点：src/run/prompt.js:502
最近确认：8aab190
理由：双渲染点：既有第 4 步注入（重入/reset 场景）+ Wave 步 prompt 追加渲染（buildWavePrompt 复用同一 facts 计算，changedFiles=porcelain ∪ baseline..HEAD），无新占位符
来源：2026-08-24-decision-touch-cli-drift
supersedes：无（修订 design 初稿注入时机）

## D-004@v1 CLI 漂移检测双轨：git 比较 + version 兜底
状态：implemented
锚点：src/stages/doctor.js:331
最近确认：8aab190
理由：git 轨（有 .git 时 commit+归一化 remote 同源比较）+ version 兜底轨（package.json version 双仓比较）；同 version 不同 commit 的热改残余盲区显式声明
来源：2026-08-24-decision-touch-cli-drift
