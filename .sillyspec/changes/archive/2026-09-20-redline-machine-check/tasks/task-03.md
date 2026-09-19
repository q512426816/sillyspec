---
id: task-03
title: 'test/redlines.test.mjs——四态夹具（violation/clean/absent/broken-yaml）+glob 语义+无效条目判据+severity 渲染；全量绿'
title_zh: 'test/redlines.test.mjs——四态夹具（violation/clean/absent/broken-yaml）+glob 语义+无效条目判据+severity 渲染；全量绿'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-20 00:26:16
priority: P0
depends_on: ['task-01', 'task-02']
blocks: []
requirement_ids: [FR-01, FR-02, FR-03]
decision_ids: ['D-001@v1', 'D-004@v1']
allowed_paths:
  - test/redlines.test.mjs
target_files:
  - NEW:test/redlines.test.mjs
goal: >
  四态夹具 + glob/判据/渲染断言，钉死评估器与探针契约。
implementation:
  - tmp 夹具仓：violation（forbid 命中行号断言）/clean/absent（不适用）/broken-yaml（fail-open）
  - glob 语义：** 跨层 vs * 单段；排除目录；长名不误蹭
  - 无效条目四判据；severity 渲染标记
acceptance:
  - 四态行为逐条断言绿
  - 全量 npm test 绿
verify:
  - node test/redlines.test.mjs
  - npm test
constraints:
  - 只写测试，不改 src（实现缺陷回 task-01/02）
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
