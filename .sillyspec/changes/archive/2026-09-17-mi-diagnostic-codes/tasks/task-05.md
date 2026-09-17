---
id: task-05
title: 'Add bidirectional codes parity test and emission spot checks'
title_zh: '新建 test/diagnostic-codes-parity.test.mjs（双向 parity：注册码⊆文档目录 ∧ 目录码⊆注册表 + 发射抽查：db_missing/change_not_found/unknown_facet 信封级码 + gate check.code 恒在场 + codes push 序断言）+ test/machine-interface.test.mjs 回归增补（codes 键可选行为）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-17 22:25:55
priority: P0
depends_on: ['task-01', 'task-02', 'task-03']
blocks: []
requirement_ids: [FR-02, FR-03]
decision_ids: [D-004@v1]
allowed_paths:
  - test/diagnostic-codes-parity.test.mjs
  - test/machine-interface.test.mjs
target_files: [NEW:test/diagnostic-codes-parity.test.mjs]
expects_from:
  task-01: 'DIAGNOSTIC_CODES 冻结表（parity import 侧）'
  task-02: '信封发射行为（codes 聚合/checks[].code 恒在场）'
  task-03: '契约诊断码目录节（锚定标题 + token 行格式，parity 解析侧）'
goal: >
  OpenSpec 没有的反超点：码表↔契约文档双向 parity，漂移在 CI 即红；加发射抽查防「码表对、发射错」。
implementation:
  - 新建 test/diagnostic-codes-parity.test.mjs（自研 assert 风格，同 machine-interface.test.mjs）三段——
  - ①双向 parity：import DIAGNOSTIC_CODES；读 docs/sillyspec/interface-contract.md 锚定标题节（## 诊断码目录）内 token（行内反引号 `code`），断言 注册键 ⊆ 文档 token ∧ 文档 token ⊆ 注册键
  - ②发射抽查（tmp fixture，mkdtemp）：无 .sillyspec 目录→gate/derive/progress show 均 codes 含 db_missing；有 db 无变更→change_not_found；derive 假 facet→unknown_facet；三面均 exit 2
  - ③结构断言：gate 成功路径（fixture 造最小合法 change 或复用现有 fixture 手法）checks 逐项有 code；两失败 check 时顶层 codes 为 push 序去重（非字母序）
  - test/machine-interface.test.mjs 增补：codes 键行为断言（失败在场/键序无关 errors 长度），不动既有断言
acceptance:
  - parity 双向断言通过（当前 10 码恰对齐）
  - 反证可用：临时删文档一 token 或码表加一码 → 对应方向断言失败（提交前撤回反证）
  - 发射抽查三信封级码 + check.code 恒在场 + push 序断言全绿
verify:
  - node test/diagnostic-codes-parity.test.mjs
  - node test/machine-interface.test.mjs
constraints:
  - 纯测试改动，零 src 改动（发现发射 bug 时报告 task-02 reopen，不许改测试迁就）
  - fixture 用 tmp 目录，不碰真实 .sillyspec
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
