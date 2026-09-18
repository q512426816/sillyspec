---
id: task-04
title: 'Inject FR digest into brainstorm step8 + advisory duplicate gate'
title_zh: '注入与软门——stages/brainstorm.js step8 模板插 {FR_INDEX_DIGEST} token + 承接行指引与写作纪律；run/prompt.js 替换实现（active-only，fr-inject 遥测）；complete.js step8 --done advisory 重复检测（fr-duplicate-warning 遥测，不阻断）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-18 07:16:22
priority: P0
depends_on: ['task-02']
blocks: []
requirement_ids: [FR-02, FR-03]
decision_ids: [D-004@v1, D-005@v1, D-006@v1]
allowed_paths:
  - src/stages/brainstorm.js
  - src/run/prompt.js
  - src/run/complete.js
expects_from:
  task-02: 'readActiveFrDigest（active-only）+ frTitleOverlap'
goal: >
  写作期注入与软门：step8 模板见现行 FR、承接有指引、疑似重复有 advisory——fr-inject/fr-duplicate-warning 两指标的发生器。
implementation:
  - stages/brainstorm.js step8 模板：requirements 格式要求段插 {FR_INDEX_DIGEST} token 位置 + 「承接: FR-<域>-NNN」行语法说明 + 写作纪律（改已有行为先查注入清单，取代/修改须引用承接）
  - run/prompt.js：{FR_INDEX_DIGEST} 替换实现——触达域（当前变更 design 文件清单×module-map）active 条目每条一行；无触达域/索引空→token 消隐；段尾自纠注记；注入后 appendKnowledgeHit({type:'fr-inject', change, domains, count})
  - run/complete.js step8 --done：新 requirements 的每条无承接 FR × 同域 active 标题 frTitleOverlap ≥0.6 → warning（提示承接或改名，不阻断）+ appendKnowledgeHit({type:'fr-duplicate-warning', change, title, candidate})
acceptance:
  - 有触达域索引时 step8 prompt 含 digest 段且不含 superseded 条目；无索引时段不出现
  - 疑似重复触发 warning 不阻断 --done；事件落遥测读回完整
verify:
  - fixture 变更跑 run prompt 渲染 step8 断言 digest 段
constraints:
  - 软门 advisory 永不阻断（D-005）
  - prompt.js 只替换模板已有 token（token 本体在 stages/brainstorm.js）
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
