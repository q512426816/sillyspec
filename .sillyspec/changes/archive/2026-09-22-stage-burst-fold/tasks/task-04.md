---
id: task-04
title: 'flow.mode default thin -> legacy + fixture migration + desc sync'
title_zh: 'flow 缺省翻回 legacy（两处缺省+三处文案+三测试文件 fixtures）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-23 00:23:08
priority: P0
depends_on: []
blocks: ['task-05']
requirement_ids: [FR-05]
decision_ids: [D-010@v2]
allowed_paths:
  - src/flow.js
  - src/config-schema.js
  - test/flow-protocol.test.mjs
  - test/flow-route.test.mjs
  - test/flow-draft.test.mjs
target_files:
  - src/flow.js
  - src/config-schema.js
  - test/flow-protocol.test.mjs
  - test/flow-route.test.mjs
  - test/flow-draft.test.mjs
goal: >
  flow 族缺省翻回 legacy（用户裁定：flow 保留实验通道）+ 受影响测试面完整迁移 + 配置描述文案同步。
implementation:
  - src/flow.js:66 let mode 缺省 'thin'→'legacy'；:76 catch 回退 mode 'thin'→'legacy'
  - src/flow.js 三处文案：:18 模块注释「缺省 thin」、:62 readFlowConfig docstring「缺省 thin」、:124 报错「（缺省即 thin）」→legacy 表述
  - src/config-schema.js:170 flow.mode desc「thin（缺省）」→「legacy（缺省）」
  - 'test/flow-protocol.test.mjs：makeRepo 的 local.yaml 补 flow 段（mode: thin，受影响 ①②③⑤⑥；④ 显式 legacy 覆写不动）'
  - 'test/flow-route.test.mjs、test/flow-draft.test.mjs：fixture local.yaml 补 mode: thin 配置行'
  - 断言本体一律不动（只补配置行）
acceptance:
  - readFlowConfig 空配置/读失败 → mode==='legacy'；显式 thin 照旧生效
  - flow-protocol ①~⑦、flow-route、flow-draft 全绿；test/fr-index.test.mjs 零改动零回归（核实豁免）
verify:
  - node --test test/flow-protocol.test.mjs test/flow-route.test.mjs test/flow-draft.test.mjs
  - npm test
constraints:
  - flow 族除缺省翻转外零改动（D-010）
  - 不动 flow-state.yaml 结构与 flow start/done 逻辑本体
---

<!-- 骨架由 sillyspec taskcard 生成（LF 行尾 + frontmatter 已闭合 + 硬校验 9 字段齐全）。
     用 Edit tool 填充上方占位符（allowed_paths/goal/implementation/acceptance/verify/constraints 等），
     勿用 Write 整文件重写——会引入 CRLF 行尾/漏闭合 ---/漏字段回归。
     ⚠️ plan --done 硬校验会拦截未替换的占位符（FR-XX / D-XXX / src/example/file.ts /
     一句话说明这个 task / 具体步骤 1 / 可验证的验收条件 1 / 边界约束 1）——占位符视同缺字段。
     target_files 格式（可选，对账用精确文件级意图声明，与 allowed_paths 语义不同）：
                    精确文件路径（仓根相对、正斜杠），当前不存在、将由本 task 新建的文件加
                    NEW: 前缀（如 NEW:src/foo.js）；禁 glob（src/**）、禁目录前缀（src/dir/）、
                    禁绝对路径；无明确文件级意图时保留 [] 占位行不动。
     implementation/acceptance 里的源码位置同样写仓根相对全路径+行号（src/foo.js:123）——
                    裸文件名在 docs-check 层1 靠 basename 全仓扫描找候选，找不到候选或关键词
                    窗口不匹配即失效，到 pre-push 才拦（2026-09-19 实证 64 处返工）。
     可选字段按需插进上方 frontmatter（规则见 taskcard-rules）：
     repo:          仅跨仓 task 填（local.yaml repos: 注册的仓 key；缺省=main。allowed_paths 相对该仓根写，
                    禁止带仓库名前缀/绝对路径——review 对账按仓根相对路径匹配，带前缀永不命中）
     provides:      仅当本 task 给其他 task 提供接口/DTO/响应时填
     expects_from:  仅当本 task 消费其他 task 的契约时填
     related_tests: 仅当本 task 改动导致既有测试断言失效时填（测试路径须同时进 allowed_paths） -->
