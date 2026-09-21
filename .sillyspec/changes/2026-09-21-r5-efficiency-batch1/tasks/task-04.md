---
id: task-04
title: '错键探针套件——wrong-key fixtures 三类形态 + verify-probes 原语断言（test/probe-suite/）'
title_zh: '错键探针套件——wrong-key fixtures 三类形态 + verify-probes 原语断言（test/probe-suite/）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-21 11:53:08
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-04]
decision_ids: [D-002@v1]
allowed_paths:
  - test/probe-suite/wrong-key.fixtures.mjs
  - test/probe-suite/wrong-key.test.mjs
target_files:
  - NEW:test/probe-suite/wrong-key.fixtures.mjs
  - NEW:test/probe-suite/wrong-key.test.mjs
goal: >
  给 R5 验收「防线回归」硬门一个可机械复跑的判法——错键类 fixtures 断言 verify-probes
  既有键原语对错键形态报不匹配（防线敏感性机械可证，不依赖对撞仓）。
implementation:
  - test/probe-suite/wrong-key.fixtures.mjs：三类 R4 真实错键形态（键名单复数错配 data.token vs data.tokens / 前后端 payload 键漂移 / 路径段后缀错配），形态锚定 round4/r4-final-report.html「错键生产 no-op」对比段
  - test/probe-suite/wrong-key.test.mjs：fixtures 喂 src/verify-probes.js 既有导出（extractPayloadKeys src/verify-probes.js:186 / isSegmentSuffix src/verify-probes.js:497 / extractFrontendPayloadFields src/verify-probes.js:521），断言错键被判不匹配/不覆盖
  - 同时断言正确形态对照面判匹配（防「什么都不匹配」的假阳性通过）
acceptance:
  - 三类错键 fixtures 全部被对应原语判不匹配
  - 正确对照组判匹配（敏感性有方向，非全红）
  - 测试零 IO（纯函数喂字符串），可在任何环境跑
verify:
  - node --test test/probe-suite/wrong-key.test.mjs
  - npm test
constraints:
  - 不修改 src/verify-probes.js（本 task 只加测试资产；若发现原语漏检，报告而非改原语——防线行为变更另走流程）
  - 审查钳达标不进套件（维持 R5 transcript 判法）
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
