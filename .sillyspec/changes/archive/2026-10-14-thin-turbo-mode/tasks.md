---
author: flow-machine-draft
created_at: 2026-10-14T00:42:06.863Z
---
# 任务注册表（Tasks）— 2026-10-14-thin-turbo-mode

- [x] task-01: flow start --turbo 承载——cmdFlow 用 hasFlag 解析 --turbo 透传 cmdFlowStart（src/flow.js:2446/575），flow-state 留痕写点（src/flow.js:618）追加 turbo:true+turbo_since，start 输出极速指引行；验证：node 直调 flow start --turbo 冒烟，flow-state.yaml 含两字段、指引行在场；不带 flag 时无两字段
- [x] task-02: flow done 实测门跳过——cmdFlowDone 读态 turbo=turbo&&tier!=='thick'（src/flow.js:1148），quick 实测门（src/flow.js:1429）合成 skipped 完整形态对象，gateSummary（src/flow.js:1492）加⚡极速标注；验证：test/turbo-mode-done-skip.test.mjs 断言 skip 形状+标注+升厚失效（D-007）
- [x] task-03: flow done 其余跳过面——dirty 门（src/flow.js:1734）加 !turbo 豁免、hunk 门（src/flow.js:2123）降 advisory、ui 探针（src/flow.js:2107）跳过、评审子步强制豁免 turboExempt；验证：test/turbo-mode-done-skip.test.mjs 逐项断言
- [x] task-04: 提示词面三处——AGENTS.md 选道表极速行（触发判据+禁自启+预段极速附注）、assets/command-cards/flow.md 补 --turbo 文档；验证：文案在场 grep + 卡锚行机制不破（包内资产为单源）
- [x] task-05: 测试四件落盘全绿——turbo-mode-start/done-skip/done-keep/scope（三态：无 flag 逐字一致/turbo 跳过面生效/必留面照常+厚道零改动）；验证：node --test 跑四件全绿 + npm run test:core 回归零失败
