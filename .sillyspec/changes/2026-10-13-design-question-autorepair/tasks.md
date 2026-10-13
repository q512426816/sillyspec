---
author: flow-machine-draft
created_at: 2026-10-13T01:38:53.883Z
---
# 任务注册表（Tasks）— 2026-10-13-design-question-autorepair

- [x] task-01: 测试先行——test/thin-docs-v2.test.mjs：测试①改新语义（改述→回填不再拒收），新增回填用例（boundaries 四问全改述、高相似原位替换/低相似节首插入、答案行保留、重跑幂等、节被删文案带全文）；先跑确认新用例对旧实现红
- [x] task-02: 实现 src/flow-draft.js——verifyThinDocsV2 内加 charBigramSimilarity 与问题行回填（原位替换/节首插入、排除集、writeAtomicSync 落盘、repairs 返回、写失败降级文案带全文、节被删文案带全文）；跑 test/thin-docs-v2.test.mjs 全绿
- [x] task-03: flow.js artifacts 子步渲染 repairs 留痕行 + 全量回归（本变更测试 ∪ FR 关联回归 ∪ import 依赖 + lint 绿）
- [x] task-04: 独立评审 P1/P2/P3 清偿——回填改纯插入（去替换路径，⑦c 钉死引用行不销毁）、未作答文案带全文、repairs 先于拒收渲染、缩进复位；重跑测试面全绿后重评
