---
author: flow-machine-draft
created_at: 2026-10-23T08:40:39.989Z
---
# 任务注册表（Tasks）— 2026-10-23-push-squash

- [x] task-01: `src/git-helper.js` 的 `git()/safeGit()` 支持 `input` 与 `stdio`（stdin 必须 pipe），补最小单测证明 `commit-tree -F -` 能收到多行消息
- [x] task-02: 新建 `src/push.js` 计划层：repo/远端/base 解析、活锚点抬升、守卫矩阵、by-change/one 分组、消息合成（保留变更名与 task-NN）、计划渲染与 JSON；用 `test/push-plan.test.mjs` 钉住纯逻辑
- [x] task-03: `src/push.js` 执行层：pre/post 备份 ref、逐段 `commit-tree`、树等价校验、CAS `update-ref`、`--undo`、普通快进 `git push`；用 `test/push-cli.test.mjs` 在临时 bare remote 上跑通
- [x] task-04: CLI 接线：`src/index.js` usage/case/topCommands/worktree 锚定豁免 `push`，`src/run/shared.js` 未初始化豁免；覆盖未知 flag/非法 mode/JSON/退出码
- [x] task-05: 新增 `.claude/skills/sillyspec-push/SKILL.md` 与 `assets/command-cards/push.md`，`src/command-cards.js` 注册 `push`，更新 `test/command-cards.test.mjs` 并新增 `test/push-skill.test.mjs`
- [x] task-06: 替换 `src/flow.js` 三处 `reset --soft` 指引为 `sillyspec push`；同步 `templates/agents-instruction.md`、`AGENTS.md`、`SKILL.md`、`README.md`；补 `test/flow-guidance.test.mjs`
- [x] task-07: 端到端验收：`npm run lint`、push 专项测试、`test:core`、临时 bare remote 的 `--dry-run → push → 远端 log` 冒烟；确认并行会话未提交文件未被触碰
