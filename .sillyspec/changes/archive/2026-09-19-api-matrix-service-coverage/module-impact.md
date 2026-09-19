---
author: qinyi
created_at: 2026-09-19 06:41:33
---
# 模块影响分析（骨架由 `sillyspec module-impact --change <变更名>` 生成）

> 文件×模块归属由 CLI 按 _module-map.yaml paths 前缀匹配预填；
> **影响类型**（逻辑变更/数据结构变更/接口变更/调用关系变更/配置变更/新增）与 review 标记是语义判断，
> 逐行把 <!--TODO--> 替换为真实结论——以 git diff 为准（真实 > 声明）。

## 模块影响矩阵

| 模块 | 变更文件 | 影响类型 | 需 review |
|---|---|---|---|
| core-engine | src/stage-contract.js | 逻辑变更（判定枚举白名单扩五值/锚点分支/记账分子口径/advisory/门禁文案——judgeApiCoverageMatrix 与探针 7 门行为增量，无接口/数据结构变更） | 否（两轮 design Grill + 两轮 plan review 已覆盖） |
| core-engine | src/verify-probes.js | 逻辑变更（骨架渲染五选一口径与占位、probe7 注记 :1929/:1930——纯文案/渲染层，解析文法零变化） | 否 |
| core-engine | src/probe7-anchor-check.js | 逻辑变更（枚举数组加 covered-service、锚点检查认定同 covered——纯增量扩集） | 否 |
| stages | src/stages/verify.js | 逻辑变更（verify 阶段指引文本判定口径四选一→五选一——prompt 行为面，零代码逻辑） | 否 |
| cli-entry | src/index.js | 逻辑变更（:1212 --init 提示文案五选一——提示层零逻辑） | 否 |

## 未匹配文件

以下变更文件未命中 _module-map.yaml 任何模块 paths——确认是模块索引过期（该跑 `sillyspec modules rebuild`）还是真的游离文件：

- `templates/prompts/verify-probes.md` — 游离：templates/ 目录历来未入模块索引（存量形态，非本变更新增缺口）；本变更仅同步判定口径文案
- `test/api-coverage-matrix.test.mjs` — 游离：test/ 目录历来未入模块索引（同上）
- `test/acceptance-matrix-probe.test.mjs` — 游离：同上

排除说明：骨架生成时 git diff 命中的 `.claude/CLAUDE.md` 与 `.claude/skills/sillyspec-{execute,plan,quick,verify}/SKILL.md` 为并行会话工作区改动，非本变更文件（本变更代码尚未实施），不纳入本矩阵。

## 影响类型说明

逻辑变更 / 数据结构变更 / 接口变更 / 调用关系变更 / 配置变更 / 新增；不确定的影响标 needs review。

## 更新结果

| 目标 | 操作 | 状态 |
|------|------|------|
| `modules/core-engine.md` | 模块文档「最近变更」行补录本变更 | done |
| `modules/stages.md`、`modules/cli-entry.md` | 文案级改动，模块文档无对应章节——不同步 | skipped（无 owned 章节可更新） |
| `_module-map.yaml` | templates/test 游离为存量形态，非本变更触发——不 rebuild（modules rebuild 会清空手工维护的 paths，见 _module-map.yaml 头注 ⚠️） | skipped（存量游离，另立项） |

## 归档终审裁决（archive step2 三重核对报告）

- 「diff 有而 module-impact 未列（30）」裁决：全部为非本变更代码面——①`.claude/*` 5 个为并行会话（quick-8d115428）在途改动（baseline overlay 随带，apply 面由 filterDeliverableFiles 剔除）；②`.sillyspec` 下 changangelog sidecar、decisions/fr 索引等为 CLI 归档机械产物（step1 decision-distill 自动生成）；③`docs/sillyspec/platform-interface-map.md`、`src/run/command.js`、`src/verify-postcheck.js`、`test/module-match-portrace` 等为并行会话主仓在途/已提交改动，与本变更 diff 零交集（verify 期已归因）。不纳入本矩阵。
- 「module-impact 列而 diff 无（5）」裁决：`.claude/skills×4` 原为骨架排除注记（非矩阵行）；`modules/core-engine.md` 主仓 git status 可见 M（「最近变更」行已补录，更新结果表 done）；`modules/stages.md`、`modules/cli-entry.md` 维持 skipped（文案级无 owned 章节）；`_module-map.yaml` 主仓 M 态为并行会话/CLI 机械改动，本变更不触碰（skipped 维持）。
- 结论：矩阵五行与真实 diff 的本变更 9 文件面一致，无不一致残留。
