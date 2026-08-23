---
id: task-06
title: 'test/decisions-lifecycle.test.mjs（含归档中途兼容与旧格式容错）'
title_zh: 'test/decisions-lifecycle.test.mjs（含归档中途兼容与旧格式容错）'
author: 'qinyi'
created_at: 2026-08-23 13:45:58
priority: P0
depends_on: ['task-01', 'task-02', 'task-03', 'task-04', 'task-05']
blocks: []
requirement_ids: [FR-01, FR-02, FR-03, FR-04, FR-05, FR-06]
decision_ids: []
allowed_paths:
  - test/decisions-lifecycle.test.mjs
goal: >
  新建回归测试锁定 Wave 1 决策生命周期全链路——入选规则、提炼幂等、版本
  supersedes、rejected 留痕与防复潮命中、behind 待复核、旧格式容错、归档中途
  兼容，防后续改动静默破坏契约。
implementation:
  - 新建 test/decisions-lifecycle.test.mjs（node --test），fixtures 用 mkdtemp 临时目录，不依赖本仓真实 git 历史
  - FR-01 旧格式容错——无四字段的旧 decisions.md 解析不失败；缺锚点 confirmed 条目提炼为「锚点未记录」并给 advisory 补录提示
  - FR-02 入选规则——type 属 architecture/compatibility/boundary/definition/process 且 status 属 confirmed/accepted → 提炼 implemented；任意 type 的 status=rejected → 提炼 rejected；type=scope 不入选
  - FR-03 幂等与版本前进——同 ID 同版本重跑不重复追加；同 ID 版本前进一号整段替换旧段并注 supersedes；rejected 缺否决理由/复潮条件 → needsWait 非空；无 decisions.md / 无入选条目零输出
  - FR-03 归档中途兼容——已过 sync-module-docs 的变更继续归档（archive steps 按名匹配，新 decision-distill 步骤为待执行增量）
  - FR-04/FR-05 条目格式与命中——knowledge/decisions/ 条目（状态/锚点/最近确认/理由 或 否决理由/复潮条件）可被机械解析；matchKnowledge 的 decisionHits 命中 rejected 时含否决理由与复潮条件且 rejected 优先排序
  - FR-06 behind 阈值——「最近确认」后模块源码前进超阈值（默认 10，decisions.behind_threshold 可调）报待复核；known_failures decisions.* 键豁免；computeModuleBehind git 失败降级 null 不抛
acceptance:
  - node --test test/decisions-lifecycle.test.mjs 全绿，用例与上述七类场景一一对应
  - npm test 整体绿——既有 220 项基线不回归 + 本文件新增全部通过
verify:
  - node --test test/decisions-lifecycle.test.mjs
  - npm test
constraints:
  - 只新建测试文件——不改 src/ 与既有测试；发现实现缺陷走 execute 上报流程，不就地修源码
  - git 相关用例在临时仓库造场景（git init + 提交序列），勿依赖真实分支状态
  - 只断言公开导出（parseDecisions/distillIntoKnowledge/matchKnowledge/computeModuleBehind）——不断言模块私有函数
---
