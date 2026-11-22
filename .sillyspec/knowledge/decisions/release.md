# 决策知识 — release

> decision-distill 从变更 decisions.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为 docs-check 机械解析契约，勿手改。

## D-release-001@v1 2026-11-22-release-3349——发版单：package.json version 单字段 bump（3.34.8→3.34.9，patch 最小升级——用户指定），随后 npm publish
状态：implemented
变更：2026-11-22-release-3349
原编号：D-000@v1
锚点：.sillyspec/changes/2026-11-22-release-3349/design.md
文件：package-lock.json, package.json
最近确认：f96196f941b2ec1550fb828b07960627ec289617
理由：发版单：package.json version 单字段 bump（3.34.8→3.34.9，patch 最小升级——用户指定），随后 npm publish。发布内容=已推送的 main 现状（词汇通道+优化三单，全部经各自变更实测门），本单零代码变更，故最小流程走完（bump→flow done→提交→推送→publish）。
