---
id: task-06
title: 'prompt/清单新增条目 + verify prompt 封顶提示 + 文档镜像再生（_extract.mjs）'
title_zh: 'prompt/清单新增条目 + verify prompt 封顶提示 + 文档镜像再生（_extract.mjs）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-17 12:09:11
priority: P1
depends_on: ['task-01', 'task-02']
blocks: []
requirement_ids: ['FR-11']
decision_ids: ['D-009@v1']
allowed_paths:
  - src/stage-review-checklist.js
  - src/stages/brainstorm.js
  - src/stages/verify.js
  - docs/prompt/verify.md
  - docs/prompt/brainstorm.md
  - docs/prompt/_extracted.json
target_files:
  - src/stage-review-checklist.js
  - src/stages/brainstorm.js
  - src/stages/verify.js
  - docs/prompt/verify.md
  - docs/prompt/brainstorm.md
  - docs/prompt/_extracted.json
goal: >
  把 EHS 逃逸的两类实证面前移进设计期审查清单（角色/字典类「以生产查询口径可解析到目标结果」+「用户入口 × 菜单/注册 DML 对账」，命中条件注入），给 verify 阶段 prompt 补「结论想写 PASS 前自查四事实条件 + severity 口径」的封顶语义自查提示，并跑 docs/prompt 镜像流水线再生 verify.md / brainstorm.md / _extracted.json 三件——prompt 源、清单常量、文档镜像三面零漂移。
implementation:
  - '清单落盘（FR-11 / src/stage-review-checklist.js）：REVIEW_CHECKLISTS.brainstorm 追加两条新条目——①角色/字典类实证：涉及角色/权限/字典类数据时，不能只看静态定义，须以生产查询口径（真实租户/库下可执行的查询）验证可解析到目标结果；②用户入口 × 菜单/注册 DML 对账：涉及新页面/前端路由时，入口路由与菜单表、角色-权限注册 DML 逐一对账（能点到的入口必有对应菜单与授权注册行）。两条目内自带命中条件短语（命中条件注入语义写进条目文字——清单是模块级静态常量、运行时无变更上下文，不引入动态渲染机制）；条目为纯文本单行、无结构性前缀/缩进/换行（头注释条目纪律）；头注释「前 3 条三层检查 / 后 6 条交叉点」计数说明同步改为实际条数'
  - 'brainstorm prompt 源（FR-11 / src/stages/brainstorm.js）：Design Grill 交叉审查步「交叉点抽取」段（:418-420 按 REVIEW_CHECKLISTS.brainstorm.slice(3) 渲染）随常量追加自动带出新条目；如需命中条件引导，在该段加一行引导语（如「后两条为命中条件注入项：变更涉及角色/字典或新页面时必查」），prompt 源与清单常量逐字一致（迁移=逐字纪律）'
  - 'verify prompt 封顶自查提示（src/stages/verify.js「输出验证报告」步 prompt，:187-227 结论判定第 6 点就近）：补一段「结论想写 PASS 前自查四事实条件」——①集成实测未跑 ②blocking 级 handover 行在场 ③db/*.sql 未声明执行 ④矩阵 partial/uncovered 无移交去向，任一成立即改写 PASS WITH NOTES 并补「## 移交项（结构化）」；同段明示 severity 口径（db-script/env-blocked 恒 blocking，manual-acceptance/other 默认 advisory、须显式标 blocking 才计入封顶——design §4 execute/verify prompt 明示口径的落点）。只加提示文字，不动 validators/门禁代码（语义门在 task-02/03）'
  - '文档镜像再生三件（docs/prompt/）：跑 node docs/prompt/_extract.mjs（再生 _extracted.json）→ node docs/prompt/_sync.mjs verify brainstorm（fence 内容同步进 verify.md/brainstorm.md 的四反引号「提示词原文」块，LF 行尾写回）→ node docs/prompt/_verify.mjs 核验（静态阶段 verify/brainstorm 逐字全绿）。注意 _extract.mjs 只产 _extracted.json，.md 镜像须走 _sync.mjs（流水线口径见 _sync.mjs 头注释：改 src/stages/<stage>.js → _extract → _sync → _verify）'
acceptance:
  - 'FR-11 GWT1：变更涉及角色/字典时审查清单含「以生产查询口径可解析到目标结果」条目——REVIEW_CHECKLISTS.brainstorm 常量与 brainstorm prompt 渲染产物双侧在场，条目文字含 FR-11 字面锚点子串（供 task-07 断言匹配）'
  - 'FR-11 GWT2：涉及新页面/前端路由时含「用户入口 × 菜单/注册 DML 对账」条目；stages prompt 源（brainstorm.js）与清单常量（stage-review-checklist.js）逐字一致'
  - '两条新条目形态合法：纯文本单行、无结构性前缀/缩进、无 CR（test/stage-review-checklist.test.mjs :78-79 形态约束——即使快照断言预期红，条目形态也须让 task-07 只改快照数即可收敛）'
  - 'src/stages/verify.js「输出验证报告」步 prompt 含封顶语义自查提示：四事实条件逐条列明 + severity 口径（blocking/advisory 默认映射与显式标注规则）+「改写 PASS WITH NOTES 并补 ## 移交项（结构化）」出路'
  - 'node docs/prompt/_verify.mjs：verify / brainstorm 静态阶段逐字一致全绿；_extracted.json 与 src/stages/{verify,brainstorm}.js 现态一致；幂等复跑（_extract + _sync 再跑一次）无二阶差异'
  - 'npm run lint（check-syntax）通过'
verify:
  - npm run lint
  - node docs/prompt/_extract.mjs
  - node docs/prompt/_sync.mjs verify brainstorm
  - node docs/prompt/_verify.mjs
  - npm test
constraints:
  - '不改 test/stage-review-checklist.test.mjs：其 :85-89 assertDeepEqual 快照（3 层检查 + 6 交叉点）在本 task 落盘新条目后必红，属预期红，由 task-07 随行更新快照（plan 任务总表已排）——npm test 的该项红不算本 task 失败口径，也不得为绿而删条目、改测试或漏落盘'
  - '清单条目纪律（stage-review-checklist.js 头注释）：纯文本单行、无序号/checkbox/缩进前缀、无换行 CR；新增属新增非升级（X-13：现无角色/字典类条目），不改既有 9 条一字'
  - '命中条件注入用文字自描述实现（条目内含命中条件短语 + brainstorm 引导语），不引入动态渲染/条件注入代码机制'
  - 'verify.js 只改 prompt 文本，不动 validators、门禁、facts 管线代码（语义门归 task-02/03；本 task 是 agent 自查提示层）'
  - '镜像面限于 docs/prompt/ 三件（verify.md / brainstorm.md / _extracted.json）；README.md、_TEMPLATE.md、index.html 等不在本 task 面内不动；_sync.mjs/_verify.mjs/_extract.mjs 脚本本身不改'
  - '纯 JavaScript（ESM）零新依赖；镜像写回 LF 行尾（坑 verify-md-crlf，_sync.mjs 已内置归一）；跨平台路径 path.join（全局硬约束 1/2/6）'
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
