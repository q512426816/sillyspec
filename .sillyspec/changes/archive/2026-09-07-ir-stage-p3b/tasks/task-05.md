---
id: task-05
title: '测试套件 test/verify-probes-facts.test.mjs（底稿/幂等/round-trip/篡改/漂移/存量/HEAD 前进 + 既有骨架断言更新义务）'
title_zh: '测试套件 test/verify-probes-facts.test.mjs（底稿/幂等/round-trip/篡改/漂移/存量/HEAD 前进 + 既有骨架断言更新义务）'
author: 'qinyi'
created_at: 2026-09-07 03:51:53
priority: P0
depends_on: ['task-01', 'task-02', 'task-03']
blocks: []
requirement_ids: [FR-01, FR-02, FR-03]
decision_ids: [D-002@v1, D-003@v1]
allowed_paths:
  - test/verify-probes-facts.test.mjs
  - test/verify-probes.test.mjs
  - test/wait-gates.test.mjs
target_files:
  - NEW:test/verify-probes-facts.test.mjs
goal: >
  测试套件锁定 facts 底稿、一致性分级与接线行为，含既有骨架断言
  更新义务。
implementation:
  - 新建 test/verify-probes-facts.test.mjs：buildVerifyFacts 结构与 metrics；--init 落盘与覆盖；层标注存在性（标题后缀）与结论提取兼容；checkProbeConsistency 场景矩阵（篡改 probe1/删子节 facts 在场=ERROR、probe3/5 漂移=WARNING、存量 skip、HEAD 前进子案、重跑异常降级）；锚点 round-trip（渲染输出→解析→同值）；gates 接线阻断冒烟
  - 更新既有断言（test/verify-probes.test.mjs 骨架文本断言若因层标注后缀失败——子串制预期不破，破则按 additive 更新）
acceptance:
  - 新断言全绿；既有零回归；npm test（module 子集）全绿
verify:
  - node --test test/verify-probes-facts.test.mjs && npm test
constraints:
  - node:test 风格；不为实现迁就弱化断言

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
     可选字段按需插进上方 frontmatter（规则见 taskcard-rules）：
     repo:          仅跨仓 task 填（local.yaml repos: 注册的仓 key；缺省=main。allowed_paths 相对该仓根写，
                    禁止带仓库名前缀/绝对路径——review 对账按仓根相对路径匹配，带前缀永不命中）
     provides:      仅当本 task 给其他 task 提供接口/DTO/响应时填
     expects_from:  仅当本 task 消费其他 task 的契约时填
     related_tests: 仅当本 task 改动导致既有测试断言失效时填（测试路径须同时进 allowed_paths） -->
