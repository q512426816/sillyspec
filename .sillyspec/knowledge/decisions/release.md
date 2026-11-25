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

## D-release-002@v1 2026-11-23-release-33410——纯文档 + 版本面发版变更，零 src 改动。
状态：implemented
变更：2026-11-23-release-33410
原编号：D-000@v1
锚点：.sillyspec/changes/2026-11-23-release-33410/design.md
文件：package-lock.json, package.json, test/quick-retired.test.mjs
最近确认：ee95d2ab0148ee08a3bf65a4a119e5b67e73cede
理由：纯文档 + 版本面发版变更，零 src 改动。其一，清偿 2026-11-23-probe1-bracket-path-blind 的归档 advisory：core-engine.md 追加探针 1 行为变更节（该探针属 core-engine 模块，行为已变必须留档）；`_module-map.yaml` 的 core-engine.paths 补登 `test/verify-probes*.test.mjs` 同族 7 文件（与既有 probe7 测试文件同模式，消除 test 目录伪域）。其二，版本面：package.json/package-lock 3.34.9→3.34.10（用户口述 3.32.10 低于当前 3.34.9，npm 拒绝降级，按「最小版本升级」意图取最小补丁位），并同步 quick-retired R5 锚（3.34.8→3.34.10，3.34.9 发版漏同步致该测试当前红，本次顺手修复）。发版走 lint + quick-retired + verify-probes 同族实测 + npm pack dry-run 后 `npm publish`，沿用 3.34.6~3.34.9 同款发布门。

## D-release-003@v1 2026-11-25-release-3411——发版单只做版本面与发布，不改业务逻辑：用 `npm version patch --no-git-tag-version` 将 `package.json` 与
状态：implemented
变更：2026-11-25-release-3411
原编号：D-000@v1
锚点：.sillyspec/changes/2026-11-25-release-3411/design.md
文件：package-lock.json, package.json, test/quick-retired.test.mjs
最近确认：c38bf2c50d889ec02f40b302f6ffba0f7d6c44d3
理由：发版单只做版本面与发布，不改业务逻辑：用 `npm version patch --no-git-tag-version` 将 `package.json` 与 `package-lock.json` 从 3.34.10 升到 3.34.11（patch 最小升级，不产生 git tag，标签与历史由 `sillyspec push` 后的流程管理）；同步 `test/quick-retired.test.mjs` 的 R5 版本锚；跑 quick-retired 测试与 lint；提交并推送后 `npm publish`。
