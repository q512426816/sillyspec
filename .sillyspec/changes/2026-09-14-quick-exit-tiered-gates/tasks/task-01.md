---
id: task-01
title: 'add-quick-gate-profile-signal-layer'
title_zh: '信号层——quick-gate-profile.js 纯函数+风险路径表+矩阵单测'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-14 10:02:07
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-02]
decision_ids: [D-002@v1, D-004@v2, D-006@v1, D-007@v1, D-009@v1]
allowed_paths:
  - src/quick-gate-profile.js
  - src/change-risk-profile.js
  - src/config-schema.js
  - .sillyspec/local.yaml.example
  - test/quick-gate-profile.test.mjs
target_files:
  - NEW:src/quick-gate-profile.js
  - src/change-risk-profile.js
  - src/config-schema.js
  - .sillyspec/local.yaml.example
  - NEW:test/quick-gate-profile.test.mjs
provides:
  - contract: GateProfileFn
    fields: [computeGateProfile, THRESHOLDS, resolveGateThresholds]
goal: >
  新建 src/quick-gate-profile.js 画像纯函数（computeGateProfile + THRESHOLDS 单点常量，无 IO、moduleIndex 由调用方传入），并在 src/change-risk-profile.js 扩展 quick 侧路径模式风险表作为单一数据源，为 task-02 门禁接线与 task-03 scope-audit 出口提供可单测、可重放的信号层（FR-02）。
implementation:
  - 新建 src/quick-gate-profile.js——导出 THRESHOLDS 单点常量（L1_SPAN=2/L1_FILES=4/L2_SPAN=4/L2_FILES_DEGRADED=8）与 computeGateProfile(changedFiles, moduleIndex, opts) 纯函数（无 IO、无子进程，moduleIndex 由调用方传入），返回画像对象与 checks——字段、计数口径、判级与降级规则严格按 design.md 接口定义（testFileCount 按路径含 __tests__/、/tests/、/test_ 前缀或 .test./_test./.spec. 命名；codeFileCount 为其余非文档文件，文档口径沿用 docSyncHint 的 isDoc 不计入两者；正常态 L1=跨≥2 模块或≥4 文件、L2=跨≥4 模块或风险命中；moduleIndex 为空时 degraded=true、moduleSpan=null 且 span 退出判级）
  - src/change-risk-profile.js 新增 quick 侧路径模式风险表并导出（auth/permission/billing/migration/锁/调度从窄收录，R-03），computeGateProfile 经 opts.riskTable 默认引用；detectChangeRisk 判级语义与既有调用点零变化
  - 新建 test/quick-gate-profile.test.mjs 矩阵单测——span×files×risk×degraded×testDelta×fileNotes 组合、阈值边界（≥2/≥4/≥4/≥8）、riskHits 仅路径模式命中、detectChangeRisk 判级零变化回归
  - 新增 resolveGateThresholds 纯函数（local.yaml quick-gate 段四键 × THRESHOLDS 默认值合并，键非法回退默认并 warn）+ config-schema.js 登记 quick-gate 段四 optional 键 + local.yaml.example 注释示例（D-009）
acceptance:
  - computeGateProfile 为纯函数（无 IO、无子进程），moduleIndex 全由参数传入；THRESHOLDS 四阈值单点定义且判级逻辑只引用常量不散落字面量
  - module-map 缺失（moduleIndex 为 null/undefined）时 degraded=true、moduleSpan=null、跨度退出判级（L1=≥4 文件、L2=≥8 文件或风险命中），不抛错不阻断
  - riskHits 仅路径模式命中（元素只含 pattern 与 file 字段，v1 无 diff 关键词维度）
  - 矩阵单测覆盖 span×files×risk×degraded×testDelta×fileNotes 与阈值边界；npm test 全绿、npm run lint 通过；verify 侧 detectChangeRisk 判级零变化有回归证明
  - local.yaml 未配置 quick-gate 段时 resolveGateThresholds 输出与 THRESHOLDS 完全一致；配置覆写键逐一生效（矩阵单测覆盖）
verify:
  - npm test && npm run lint
constraints:
  - 只交付信号层——不动 Wave 2/3 接线与出口文件（run/shared.js、complete-handlers.js、quick-audit.js、scope-audit.js、index.js 归 task-02/03）
  - change-risk-profile.js 只新增数据表，detectChangeRisk 判级函数与既有调用点不改（verify 侧零回归）；风险表 v1 仅路径模式且从窄收录（auth/permission/billing/migration/锁/调度），不做 diff 关键词扫描、不加 git 子进程（D-004@v2、R-04 零子进程承诺）
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
