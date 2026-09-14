---
id: task-02
title: 'wire-tiered-gates-into-quick-audit-chain'
title_zh: '门禁接线——audit 链挂画像+[gate] 落账+--no-docs flag'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-14 10:02:07
priority: P0
depends_on: ['task-01']
blocks: []
requirement_ids: [FR-03]
decision_ids: [D-002@v1, D-003@v1, D-005@v1]
allowed_paths:
  - src/run/
  - test/audit-quick-completion.test.mjs
target_files:
  - src/run/shared.js
  - src/run/complete-handlers.js
  - src/run/command.js
  - src/run/quick-audit.js
  - test/audit-quick-completion.test.mjs
  - src/run/complete.js
expects_from:
  task-01:
    - contract: GateProfileFn
      needs: [computeGateProfile, THRESHOLDS]
provides:
  - contract: GateMounted
    fields: [review.gateProfile, gate-audit-note, no-docs-flag]
goal: >
  把 task-01 画像信号接进 quick --done 审计链（FR-03）——auditQuickCompletion
  挂 review.gateProfile，[gate] advisory 块随审计打印并落 quicklog auditNotes，
  L2 增 --no-docs 显式豁免通道，全部 advisory 不阻断、exit code 不变。
implementation:
  - run/shared.js auditQuickCompletion 内调 computeGateProfile 挂 review.gateProfile——照 docSyncHint 先例（shared.js :1517 段），module-map 复用 matchQuickModules 同源加载，fail-open 异常只跳过
  - run/complete-handlers.js 既有 auditNotes 组装点（:1290 段）追加 [gate] 行——L1 每文件注记+测试增量、L2 模块文档认领+风险命中、--no-docs 豁免同通道留痕（gate-audit-note）
  - run/command.js 把 --no-docs 登记进 knownFlags 白名单（:820 段，未知 flag fail-fast）并按布尔 flag 解析透传审计链（先例 :798-801，no-docs-flag）
  - run/quick-audit.js printQuickAuditReview 打印 [gate] L1/L2 advisory 块（照 docSyncHint 打印样式，含模块清单/风险命中/缺失检查项与 --no-docs 指引，L0 零输出）；未声明脏文件维持既有归属分流不并入文档门（D-005）；全部 advisory 不阻断、exit code 不变（D-003）
  - test/audit-quick-completion.test.mjs 照 D-8 docSyncHint 用例基座增集成用例——L0 无块、L1 触发注记+testDelta、L2 触发 docClaim/风险命中、--no-docs 豁免留痕
  - auditQuickCompletion 调 computeGateProfile 时经 resolveGateThresholds(local.yaml quick-gate 段) 合并阈值传入 opts.thresholds（未配置=纯默认，D-009）
acceptance:
  - L0（单模块少文件无风险命中）无 [gate] 块打印与 gate 落账行，status 三态与 exit code 零变化
  - L1（跨≥2 模块或≥4 文件）[gate] 块提示每文件注记检查与测试增量检查（codeFileCount≥2 且 testFileCount 为 0 → missing），auditNotes 留痕
  - L2（跨≥4 模块或风险路径命中）[gate] 块含模块文档认领检查（claimed/missing）与运行时证据要求提示，风险命中点名 pattern/file
  - --no-docs 显式豁免时 docClaim 为 exempt-no-docs 且豁免留痕进 quicklog auditNotes，完成不受阻
  - 窗口内未声明脏文件仍走既有归属分流注记（不并入文档认领判定，D-005），既有 audit 用例零回归
verify:
  - npm test
  - npm run lint
constraints:
  - 零新增劝说 prompt——门禁只做机械画像分级输出，不新增任何交互等待（D-002）
  - 不加 git 子进程——画像输入复用审计链既有 changedFiles git 事实与 module-map 既有加载点
  - 不改变既有 audit 结论语义——status 三态/reasons/exit code 原样，只增 review.gateProfile 字段与 [gate] 打印落账
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
