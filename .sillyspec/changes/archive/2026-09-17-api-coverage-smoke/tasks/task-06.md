---
id: task-06
title: 'verify prompt smoke 纪律段（命中条件注入）+ 「CLI 不代跑」矛盾文案改写 + checklist verify 键接线 + 快照随行 + 镜像三步再生'
title_zh: 'verify prompt smoke 纪律段（命中条件注入）+ 「CLI 不代跑」矛盾文案改写 + checklist verify 键接线 + 快照随行 + 镜像三步再生'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-17 22:06:55
priority: P0
depends_on: ['task-03']
blocks: []
requirement_ids: [FR-07]
decision_ids: [D-008@v1]
allowed_paths:
  - src/stages/verify.js
  - src/stage-review-checklist.js
  - test/stage-review-checklist.test.mjs
  - docs/prompt/verify.md
  - docs/prompt/_extracted.json
target_files:
  - src/stages/verify.js
  - src/stage-review-checklist.js
  - test/stage-review-checklist.test.mjs
  - docs/prompt/verify.md
  - docs/prompt/_extracted.json
goal: >
  把 smoke 纪律机械注入 verify 阶段 prompt 与审查清单——「输出验证报告」步增 smoke 纪律段（命中条件注入四段全文）、改写 stages/verify.js 两处与亲跑语义矛盾的「CLI 不代跑集成进程」文案（:197/:210）、REVIEW_CHECKLISTS 新增 verify 键+渲染接线、快照随行、文档镜像三步再生（design §6，FR-07）。
implementation:
  - 'src/stages/verify.js「输出验证报告」步（:187）prompt 增 smoke 纪律段：段首标注命中条件（local.yaml 配置 commands.smoke 或变更判级 critical 时适用——definition 为静态导出，命中条件以文本内嵌说明注入）；四段纪律全文逐字照 design §6：①断言派生表（design 接口表每行 ≥1 happy-path 含出参形状断言 / 权限矩阵每行 ≥1 反例（非授权操作应拒） / 契约表必填每项 ≥1 空值反例 / 转移表每边 ≥1 状态断言 / 需求字面（单号格式等）→ 格式断言）②负向下界（每写端点 ≥1 权限反例（E4 类）+ 全链 ≥1 注错全量回滚断言（E5 类））③执行口径（脚本后台起服+轮询就绪+finally 杀（墙钟增量≈冒烟本体）/ DB 会话自设严格 sql_mode / 载荷从消费端构造点导出（手写正确字段的测试抓不住字段漂移））④断言锚点注释（每步挂依据 ID）与矩阵行一一对应'
  - 'stages/verify.js:197 文案改写（Grill #13 消除矛盾）：「集成证据是自报告、CLI 不独立运行时核验…不会替你启动 daemon、打真实请求或跑迁移」段补 commands.smoke 亲跑口径——commands.smoke 配置后由 CLI 亲跑机器落盘（commands.test 同哲学），其余形态仍须 agent 实跑后据实填写'
  - 'stages/verify.js:210 文案改写：「CLI 不代跑集成进程——回执必须来自你真实执行过的命令」→「commands.smoke 配置后由 CLI 亲跑机器落盘，其余形态仍须 agent 实跑后据实填写（CLI 不代跑其余集成进程）」'
  - 'src/stage-review-checklist.js：REVIEW_CHECKLISTS 新增 verify 键（本批为新增键非向既有键加条目——批次 A 先例是加条目）——条目含 smoke 纪律条目（文本内嵌命中条件说明：local.yaml 配 commands.smoke 或判级 critical 时生效）；条目为纯文本单行、无序号/checkbox/缩进结构性前缀（文件头 docblock 规则同步补 verify 键的渲染形态说明）'
  - '渲染接线：stages/verify.js prompt 渲染 verify 清单条目（先例：brainstorm.js:416/:420、plan.js:342、execute.js:437——各 stage 在自身 prompt 内渲染本阶段清单）；review-dispatch.js:164 REVIEW_CHECKLISTS[stage]||[] 通用取键对新增键零改动兼容'
  - 'test/stage-review-checklist.test.mjs 快照随行（归本 task——与 task-07 划界照 plan 任务总表 task-07 行注记）：内嵌快照增 verify 期望块（逐字）；:77 keys 精确匹配断言 brainstorm,execute,plan → brainstorm,execute,plan,verify（键 3→4）；verify 键形态断言（非空 string[] / 条目单行无换行 CR / 无结构性前缀——Windows 兼容与防双前缀）；prompt 渲染产物含 verify 条目字面（期望块由快照构造，防自证）'
  - '镜像三步流水线再生：node docs/prompt/_extract.mjs && node docs/prompt/_sync.mjs && node docs/prompt/_verify.mjs——docs/prompt/verify.md 与 docs/prompt/_extracted.json 随 prompt 变化再生，目标阶段（verify）镜像逐字全绿'
acceptance:
  - '「输出验证报告」步 prompt 含 smoke 纪律段四段全文（①断言派生表/②负向下界/③执行口径/④锚点注释，逐字对齐 design §6），段首命中条件说明（commands.smoke 配置或判级 critical）在场'
  - 'stages/verify.js :197/:210 两处不再含无条件「CLI 不代跑集成进程」表述；新口径「commands.smoke 配置后由 CLI 亲跑机器落盘，其余形态仍须 agent 实跑后据实填写」在场'
  - 'Object.keys(REVIEW_CHECKLISTS) 排序后 = brainstorm,execute,plan,verify（4 键）；verify 条目渲染进 stages/verify.js prompt 字面'
  - 'test/stage-review-checklist.test.mjs 全绿（keys 断言 4 键 / 内嵌快照逐字 / 渲染字面三面齐过）'
  - 'node docs/prompt/_verify.mjs 退出码 0（镜像逐字全绿）；npm test / npm run lint 全绿'
verify:
  - npm test
  - npm run lint
  - node docs/prompt/_verify.mjs
constraints:
  - '纪律段四段文案逐字照 design §6 ①~④，不自由改写（镜像 _verify.mjs 与快照双向钉死）'
  - 'checklist 条目纯文本单行（无序号/checkbox/缩进前缀、无换行/CR——渲染层负责前缀形态，防双前缀）'
  - '不改 review-dispatch.js / STAGE_MAIN_DOC（REVIEW_CHECKLISTS[stage]||[] 通用渲染对新增键零改动兼容；verify 阶段独立审查派发不在本批范围，design 文件变更清单亦未列该文件）'
  - 'test/stage-review-checklist.test.mjs 的快照与 keys 修改归本 task（task-07 对该文件只加断言——plan 任务总表划界）'
  - 'docs/prompt/verify.md 与 _extracted.json 只经三步流水线再生，不手编；不改 commands.test/lint 语义与其余 stage prompt'
provides:
  - contract: verify-smoke-prompt
    fields:
      - verify-prompt-smoke-section
      - review-checklists-verify-key
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
