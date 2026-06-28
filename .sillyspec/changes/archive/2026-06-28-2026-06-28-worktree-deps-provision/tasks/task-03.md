---
id: task-03
title: local.yaml commands.install/typecheck + scan-postcheck 适配
author: qinyi
created_at: 2026-06-28 17:09:17
priority: P1
depends_on: []
blocks: []
requirement_ids: [FR-02]
decision_ids: [D-004@v1]
allowed_paths:
  - src/scan-postcheck.js
goal: >
  让 local.yaml 支持 commands.install/typecheck，并修正 scan-postcheck 不要对直接 PM 调用命令做 npm-script 校验。
implementation:
  - 在 src/scan-postcheck.js（~116-143 local.yaml 校验段）识别 commands.install/typecheck 字段
  - install/typecheck 是直接包管理器调用（pnpm install / npx tsc），非 npm run <script>，**不**对它们做 package.json scripts 存在性校验（X-3 修正）
  - 仅 test/lint/build 维持现有 npm-run-script 校验逻辑（scan-postcheck.js:130）
  - local.yaml schema 文档（如 .sillyspec/docs 下有 local.yaml 说明）补 install/typecheck 可选槽位说明
acceptance:
  - local.yaml 含 commands.install 时能被 provisionDeps（task-01）读取使用
  - scan-postcheck 不对 pnpm install / npm ci / npx tsc 等命令报"package.json 无 script"误报
  - test/lint/build 的 npm run 校验行为不变
verify:
  - node --check src/scan-postcheck.js
  - npm test
constraints:
  - 不引入对 install/typecheck 的 npm-script 校验（它们本就不是 npm script）
  - 改动局限 scan-postcheck.js 的 local.yaml 解析段，不动其它校验
