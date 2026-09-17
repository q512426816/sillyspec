---
id: task-06
title: 'Full acceptance: suite green + CLI 3-surface sampling + zero-drift final check'
title_zh: '全量验收——npm test 全绿 + CLI 实测三面（gate/derive/progress show --json 人工对样）+ 契约/模块卡/实现三处零漂移终检'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-17 22:25:55
priority: P0
depends_on: ['task-02', 'task-03', 'task-04', 'task-05']
blocks: []
requirement_ids: [FR-01, FR-02, FR-03, FR-04]
decision_ids: [D-001@v1, D-002@v1, D-003@v1, D-004@v1, D-005@v1]
allowed_paths:
  - src/machine-interface.js
  - bin/sillyspec.js
goal: >
  全量收口：套件全绿 + 三面真实 CLI 对样（契约示例非手编）+ 契约/模块卡/实现零漂移终检。
implementation:
  - npm test 全量（含 parity 新测试与 machine-interface 回归）
  - CLI 实测三面对样：node bin/sillyspec.js gate <stage> --change <真实或fixture变更> --json / derive <facet> --json / progress show --json——输出与契约示例逐键对读（codes/check.code/exit 码），差异回改契约示例（真实输出为准）
  - 零漂移终检：grep informational 正文外零命中；码目录 10 码与码表一致（parity 已钉，人工复核节语义说明）；模块卡与契约 transition/codes 表述对读零冲突
  - 风险复核：R-01/R-03 契约语义说明在场；R-02 token 格式与测试一致
acceptance:
  - npm test 全绿（既有 524+ + 新增断言全数通过）
  - 三面 CLI 输出与契约文档示例零差异（或差异仅为此处对样后修正的示例）
  - 零漂移三项 grep/对读全过
verify:
  - npm test
  - node bin/sillyspec.js gate brainstorm --change 2026-09-17-mi-diagnostic-codes --json（本变更自身即活样例）
constraints:
  - 只读验收：发现缺陷 reopen 归属 task 修，不在本 task 热修
  - 不新增/修改任何文件（契约示例对样修正除外——属 task-03 面的收尾修正，回 task-03 边界内执行）
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
