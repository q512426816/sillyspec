---
author: flow-machine-draft
created_at: 2026-11-21T15:30:29.822Z
---
# 任务注册表（Tasks）— 2026-11-21-prompt-microdesign-pack

- [x] task-01: brainstorm.js 提问分型补「是=接受推荐」措辞（line 114 附近）——验证：grep 命中措辞纪律句
- [x] task-02: brainstorm.js design 模板插「8.5 测试 seam 约定」节（条件必填+豁免短语「不涉及测试 seam」）——验证：模板节定义在场
- [x] task-03: design-facts.js generateDesignSkeleton 加 8.5 骨架行+注释与 index.js 帮助文案「十三章节」→「十四章节」——验证：grep 无残留「十三章节」
- [x] task-04: test/design-facts.test.mjs 章节契约 THIRTEEN→FOURTEEN 扩断言，跑绿——验证：node --test test/design-facts.test.mjs 全过（1 pass 0 fail）
- [x] task-05: execute.js 三处：代码审查三层优先级+DEBUG 前缀铁律+反例核对变异自证——验证：grep 三处新文本在场
- [x] task-06: verify.js 风险节两字段要求 + verify-probes.js 骨架 TODO 槽同步——验证：两文件 grep 命中
- [x] task-07: 新建 docs/sillyspec/out-of-scope/（README+首个被拒概念文件，理由引用 ROADMAP 不双写）——验证：两文件落盘
- [x] task-08: 再生金档与镜像（SILLYSPEC_REGEN_PROMPT_GOLDEN=1 金档、node docs/prompt/_extract.mjs 镜像），跑 test/prompt-golden.test.mjs + test/brainstorm-exit-thin-default.test.mjs 全绿——验证：prompt-golden 1 pass、brainstorm-exit 4 pass、镜像 diff 与源一致
