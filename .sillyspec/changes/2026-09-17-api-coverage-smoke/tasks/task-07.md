---
id: task-07
title: '测试补全——NEW test/smoke-gate.test.mjs + NEW test/api-coverage-matrix.test.mjs + 既有文件增量断言'
title_zh: '测试补全——NEW test/smoke-gate.test.mjs + NEW test/api-coverage-matrix.test.mjs + 既有文件增量断言'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-17 22:06:55
priority: P0
depends_on: ['task-01', 'task-02', 'task-03', 'task-04', 'task-05', 'task-06']
blocks: []
requirement_ids: [FR-01, FR-02, FR-03, FR-04, FR-05, FR-06, FR-07]
decision_ids: [D-001@v1, D-002@v1, D-003@v1, D-004@v1, D-005@v1, D-006@v1, D-007@v1]
allowed_paths:
  - test/smoke-gate.test.mjs
  - test/api-coverage-matrix.test.mjs
  - test/pass-eligibility.test.mjs
  - test/verify-conclusion-slot.test.mjs
  - test/stage-review-checklist.test.mjs
target_files:
  - NEW:test/smoke-gate.test.mjs
  - NEW:test/api-coverage-matrix.test.mjs
  - test/pass-eligibility.test.mjs
  - test/verify-conclusion-slot.test.mjs
  - test/stage-review-checklist.test.mjs
goal: >
  为批次全部六个实现 task 收口测试面——NEW test/smoke-gate.test.mjs（执行三态/回退/指纹/机器段/分类器回归/五边界/第五条件/config-schema 新键）+ NEW test/api-coverage-matrix.test.mjs（解析五形态/covered 记账/锚点/降级/advisory）+ 三个既有测试文件增量断言，兑现 plan 全局验收标准 1~8 与 +50~70 断言（design §7）。
implementation:
  - 'NEW test/smoke-gate.test.mjs——执行与配置面：mock 命令三态（exit 0 / 非 0 / 超时——超时记失败态非崩溃）+ 快照内超时回退主仓复跑断言（lint 先例 verify-quality-scan.js:296-301 同款策略）；指纹含 smoke 键（配置后指纹变化、代码与脚本未变 → 复用上次实测记录不重跑）；config-schema 新键断言（commands.smoke 登记/缺省可选）放本文件——不动 test/config-schema.test.mjs（其不在 design 文件变更清单）'
  - 'NEW test/smoke-gate.test.mjs——回执与分类面：机器段形态（command/exit/log/mtime 实录 + source: cli-noai-smoke 尾注）与 parseEvidenceSlots 逐条 source 提取；分类器脚本形态回归——node scripts/smoke.mjs / bash smoke.sh 脚本形态在既有 RECEIPT_SOURCE_CROSS_LAYER_RE 下判 build、机器段标记直判 cross-layer（classifyReceiptSourceTag/classifyReceiptCommandSource 双侧）；回执槽一致性对比——agent 改写机器段 → gate 重跑对比打回'
  - 'NEW test/smoke-gate.test.mjs——第五条件面：smokeRan producer 五边界态（记录在场 exit 0 → ran / 非 0 或超时 → not-ran / 记录在场无 smoke 段 → not-ran+注记 / 记录缺失 → not-ran fail-open / unavailable 与未配置 → not-configured）；第五条件 critical×smokeRan 三值（ran 放行、not-ran/not-configured 触发 smoke-not-run）+ advisory handover 在场仍触发（不豁免）+ 非判级零行为'
  - 'NEW test/api-coverage-matrix.test.mjs——解析面：parseDesignApiTable 五形态（规范表 / 缺方法列（跳过）/ 模板路径 {xxx}（认）/ 段头过滤（非接口段表格不计）/ 示例行跳过（非目标/先例引用段））'
  - 'NEW test/api-coverage-matrix.test.mjs——记账与校验面：covered 记账语义（分子只认判定=covered；partial/uncovered 不计分子；non-testable 理由非空从分母扣除；子行/探索行不计分母分子）；移交联动（partial/uncovered 端点行 × 移交零有效行 → error，有移交放行）；锚点解析级（design接口表#<METHOD /path> 空指打回，其余四形态存在即认）；声明降级（解析零行按声明对账 / 并存以解析为准注记）；critical×零接口面 error；critical×声明 0 端点 warning；消费面（有消费端未填子行）与表间完备性（写端点缺权限矩阵行）warning'
  - '既有增量——test/pass-eligibility.test.mjs：第五条件态断言（smoke-not-run 枚举触发/两出路修复指引文案/判级限定形态）'
  - '既有增量——test/verify-conclusion-slot.test.mjs：smoke-not-run 触发文案断言'
  - '既有增量——test/stage-review-checklist.test.mjs：断言增量（verify 纪律条目渲染形态/命中条件说明字面）——快照与 keys 修改归 task-06 已完成，本任务只加断言（划界照 plan 任务总表 task-07 行注记）'
  - '全量自检：npm test 全绿后核对断言增量落 +50~70 区间，并对照 plan 全局验收标准 1~8 逐条确认有断言承接'
acceptance:
  - 'npm test 全量通过：两个新测试文件 + 三个既有增量全绿，零 skip 零 todo'
  - 'smoke-gate 覆盖齐：执行三态+快照超时回退 / 指纹含 smoke 键与复用 / 机器段形态与 source 提取 / 分类器脚本形态直判 cross-layer（B-1 金路径不误拦）/ 一致性对比改写打回 / smokeRan 五边界 / 第五条件 critical×三值+advisory handover 不豁免+非判级零行为 / config-schema 新键'
  - 'api-coverage-matrix 覆盖齐：解析五形态 / covered 记账（partial/uncovered 不计分子）/ non-testable 分母扣除 / 子行与探索行不计账 / 移交联动 error / 锚点解析级空指打回 / 声明降级 / critical×零接口面 error / critical×声明 0 warning / 消费面与表间 warning'
  - '断言增量 +50~70（design §7 预估区间）；test/config-schema.test.mjs 零改动（不在 allowed_paths）'
  - 'plan.md 全局验收标准 1~8 均有对应断言落位（逐条可溯源到测试名）'
  - 'npm run lint 通过；mock 命令三态在 Windows Git Bash 与 Linux 下均可运行（跨平台断言形态）'
verify:
  - npm test
  - npm run lint
constraints:
  - '只动五个 allowed_paths 测试文件；不改 src/ 与 docs/ 任何文件——发现实现缺陷回报主代理裁决，禁止私改实现迁就测试（AGENTS 核心规则 11）'
  - '不动 test/config-schema.test.mjs（不在 design 文件变更清单——commands.smoke 新键断言放本任务 smoke-gate 文件内）'
  - 'test/stage-review-checklist.test.mjs 只加断言——快照深比较与 keys 修改归 task-06（plan 任务总表划界）'
  - 'mock 命令跨平台：不依赖 bash-only 语法（Windows Git Bash 兼容）；零新依赖（本地正则/既有测试形态——console assert 同仓惯例）'
  - '断言钉行为不钉实现细节（防重构脆断）；测试夹具用真实 design.md 形态片段（非目标/先例引用段的示例行要真实构造）'
expects_from:
  task-01:
    - contract: smoke-exec-record
      needs:
        - 'smokeExit——执行三态断言数据源（exit0/非0/超时失败态）'
        - 'smokeLog——回执 log 落盘路径断言'
        - 'smokeRanSource——实测记录 additive smoke 段形态'
  task-02:
    - contract: smoke-receipt-marker
      needs:
        - 'parseEvidenceSlots.source——机器段 source 提取断言'
        - 'classifier-cross-layer——脚本形态 smoke 命令直判 cross-layer 断言（B-1 回归）'
        - 'receipt-slot-machine-segment——机器段形态与缺态标注断言'
        - 'consistency-check——改写打回断言'
  task-03:
    - contract: smoke-ran-fact
      needs:
        - 'facts.smokeRan——五边界态断言'
        - 'smoke-not-run-trigger——第五条件 critical×三值+advisory handover 不豁免断言'
  task-04:
    - contract: api-face-parser
      needs:
        - 'parseDesignApiTable——解析五形态断言'
        - '骨架矩阵段——预填/声明占位断言'
        - 'advisory输出——消费面/表间 warning 断言'
  task-05:
    - contract: api-coverage-validator
      needs:
        - 'validateApiCoverageMatrix——covered 记账/锚点空指/移交联动/critical 两形态断言'
  task-06:
    - contract: verify-smoke-prompt
      needs:
        - 'stages/verify.js 纪律段与改写文案——断言锚点'
        - 'REVIEW_CHECKLISTS verify 键——清单断言增量'
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
