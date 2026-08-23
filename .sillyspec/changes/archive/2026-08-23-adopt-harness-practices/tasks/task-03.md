---
id: task-03
title: 'archive.js 插入 decision-distill 步骤（conditionalWait）+ 末步 git add knowledge/decisions/'
title_zh: 'archive.js 插入 decision-distill 步骤（conditionalWait）+ 末步 git add knowledge/decisions/'
author: 'qinyi'
created_at: 2026-08-23 13:45:58
priority: P0
depends_on: ['task-02']
blocks: []
requirement_ids: [FR-03]
decision_ids: [D-007@v1]
allowed_paths:
  - src/stages/archive.js
goal: >
  把 task-02 的决策提炼纯函数接进 archive 流程——在 sync-module-docs 之后插入
  decision-distill 步骤（conditionalWait 语义），归档时有实现影响的决策落入
  knowledge/decisions/ 活跃库，末步 git add 覆盖决策库防漏提交。
implementation:
  - steps 数组在 sync-module-docs（src/stages/archive.js:46）与「确认归档」之间插入新步骤，name 为「decision-distill 决策提炼」
  - 新步骤照抄 sync-module-docs 的 conditionalWait 先例（src/stages/archive.js:53-57）——conditionalWait true、repeatableWait true、maxWaitRounds 3、waitReason 与 waitOptions（如 补录后继续、跳过该条）
  - 新步骤 prompt 写明——调用 src/decision-distill.js 的 distillIntoKnowledge(changeDir, knowledgeRoot, headHash)（提炼/幂等/INDEX 路由行本体在 task-02，本步只接线不实现）
  - 分流规则——常规（rejected 四字段齐全）直接写入并把 written/skipped 摘要写进 --output 后 --done；rejected 条目缺否决理由/复潮条件（needsWait 非空）才 --wait 请用户裁决；无 decisions.md / 无入选条目零输出直接 --done
  - 末步「更新路线图和提交」（src/stages/archive.js:151-165）操作清单补一条 git add .sillyspec/knowledge/decisions/——精确到 decisions 子目录勿 add 整个 knowledge/，不 commit
acceptance:
  - steps 顺序为 sync-module-docs → decision-distill 决策提炼 → 确认归档，新步骤字段与 conditionalWait 先例一致
  - 末步 prompt 的 git add 清单含 .sillyspec/knowledge/decisions/ 且不裹挟 knowledge/ 其他子目录
  - 归档中途的存量变更继续归档——progress 步骤按名匹配重播种（run/command.js ensureStageSteps 机制），新步骤为待执行增量
verify:
  - node --check src/stages/archive.js
  - 行为级回归待 task-06 落地后跑 node --test test/decisions-lifecycle.test.mjs（含已过 sync-module-docs 继续归档用例）
constraints:
  - conditionalWait 仅异常才 --wait——rejected 缺字段等异常暂停裁决，常规直接 --done，勿引入 requiresWait 硬门与「确认归档 --confirm」形成重复确认
  - 只改 src/stages/archive.js——不动 run/command.js 步骤兼容机制，不实现提炼逻辑本体（归 task-02 的 src/decision-distill.js）
  - 插入位置固定在 sync-module-docs 之后、确认归档之前——决策提炼基于终审后的模块文档基线
---
