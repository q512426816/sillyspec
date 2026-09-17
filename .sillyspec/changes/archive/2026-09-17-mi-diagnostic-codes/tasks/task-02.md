---
id: task-02
title: 'Emit additive diagnostic codes in machine-interface envelope'
title_zh: 'machine-interface.js 信封加法式发射——buildEnvelope 加 codes 可选参（optional-once）、gate checks 逐个恒挂 code、四个信封级错误路径 + derive unknown facet 挂码、顶层 codes 按失败 check 序去重聚合；既有键/退出码/message 零改动'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-17 22:25:55
priority: P0
depends_on: ['task-01']
blocks: []
requirement_ids: [FR-01, FR-03]
decision_ids: [D-001@v1, D-002@v1]
allowed_paths:
  - src/machine-interface.js
expects_from:
  task-01: 'DIAGNOSTIC_CODES（10 码清单）+ checkCode(checkId) 映射'
goal: >
  把码表的稳定身份发射进 JSON 信封：check 级恒在场 + 顶层按失败序去重聚合，加法式零破坏。
implementation:
  - buildEnvelope 加 codes 可选参（!== undefined 才挂，遵循 optional-once 约定）
  - runGate：每个 check push 时挂 code: checkCode(check.id)（恒在场，通过时也在场）；综合段聚合顶层 codes = 失败 check（按 push 序）的 code 去重
  - 信封级错误路径挂单码：gate/derive 的 db 缺失→['db_missing']、变更不存在→['change_not_found']、derive 非法 facet→['unknown_facet']、三面 internal 兜底→['internal_error']
  - derive facet 失败路径（execute_evidence_unchanged/task_reviews_invalid/artifacts_invalid/verify_test_failed）顶层 codes 同步单码挂载
  - 主路径（gate/derive 正常返回、progress show 成功）顶层 codes 恒传（空数组表无失败），错误路径单码数组
acceptance:
  - gate 两 check 失败（artifacts 先 push）时顶层 codes === ['artifacts_invalid','transition_blocked']（push 序非字母序）
  - 所有 check（含通过项）都有 code 字段；表外 check id（若有）code 为 undefined 不挂键
  - errors/warnings 文案、退出码、SCHEMA_VERSION、FACETS、optional-once 键行为与改动前逐字节一致
  - db 缺失/变更不存在/非法 facet/internal 四路径信封 codes 各为对应单码数组且 exit 2
verify:
  - node test/machine-interface.test.mjs（既有断言零回归）
  - 手动对样：node bin/sillyspec.js gate brainstorm --change 不存在的名 --json | 解析 codes === ['change_not_found']
constraints:
  - 不改 errors/warnings 字符串内容、退出码语义、SCHEMA_VERSION、FACETS 枚举
  - 不新增外部依赖
  - mcp-server.js 零改动（信封透传自然携带）
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
