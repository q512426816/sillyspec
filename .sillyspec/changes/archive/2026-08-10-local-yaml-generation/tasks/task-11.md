---
id: task-11
title: doctor.js 行353 sillyspec init → sillyspec local detect
title_zh: doctor 漂移修正
author: qinyi
created_at: 2026-08-10 23:00:20
priority: P1
depends_on: []
blocks: []
requirement_ids: [FR-04]
decision_ids: []
allowed_paths:
  - src/stages/doctor.js
provides: []
expects_from: {}
---

## 验收标准

- Given `src/stages/doctor.js` 汇总报告修复建议模板「缺少 local.yaml」条目 → 改后文案指向 `sillyspec local detect`（非 `sillyspec init`）
- Given grep `sillyspec init` 全 `src/stages/doctor.js` → 零命中（仅原行 353 一处，改后消除）
- Given grep `local.yaml` doctor.js 其余命中（行 86/92/94 bash 变量与存在性检查、行 328 输出示例、行 354 test 命令条目）→ 文案不变，无误伤

## goal

修正 doctor 阶段「汇总报告」步骤修复建议模板的命令漂移（design §1.1）：`sillyspec init` 并不生成 local.yaml（`src/init.js` 无此职责），正确入口是 `sillyspec local detect`。本任务只改源码这一处措辞，消除 FR-04 点名的 doctor→init 漂移。

## implementation

仅改 `src/stages/doctor.js` 第 5 步「汇总报告」修复建议模板（已读源核对真实行号）：

- **行 353**：`- 缺少 local.yaml → \`sillyspec init\` 重新生成，或手动创建` 改为 `- 缺少 local.yaml → \`sillyspec local detect\` 重新生成，或手动创建`
- grep `sillyspec init` 全文件仅此一处命中（已核验：doctor.js 全文无其他 `sillyspec init`）；`local.yaml` 其余 5 处命中（行 86 注释 / 行 92 bash 变量 / 行 94 存在性检查 / 行 328 输出示例 / 行 354 test 命令条目）均不涉及 init 措辞，保持不变
- 第 1 步「配置文件检查」bash 段（行 84-100）只 echo 缺失状态、不给修复命令，无 init 措辞，无需改

## verify

- grep `sillyspec init` `src/stages/doctor.js` → 无输出
- grep `sillyspec local detect` `src/stages/doctor.js` → 命中行 353
- `npm run lint` 通过（纯字符串改动，无语法影响）
- 镜像 `docs/prompt/doctor.md` 一致性由 task-12 跑 `node docs/prompt/_extract.mjs` 自动刷新验收，本任务不手改镜像

## constraints

- 只改 `src/stages/doctor.js`（allowed_paths 锁定），单行措辞修正，不动步骤结构、不动其他检查项
- 镜像 `docs/prompt/doctor.md` 由 task-12 extract 自动刷新，本步只改源码，禁手改镜像（CLAUDE.md 提示词文档同步铁律）
- 不改 bash 检查段（行 84-100）行为——该段只报缺失不给命令，无漂移
- `src/init.js` 不在本任务范围（init 不生成 local.yaml 是既成事实，非本变更改）
