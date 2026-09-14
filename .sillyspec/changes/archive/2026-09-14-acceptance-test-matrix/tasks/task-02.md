---
id: task-02
title: '门禁——stage-contract.js extractAcceptanceMatrixSlots + gates.js runValidators validator + NEW:test/acceptance-matrix-gate.test.mjs'
title_zh: '门禁——stage-contract.js extractAcceptanceMatrixSlots + gates.js runValidators validator + NEW:test/acceptance-matrix-gate.test.mjs'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-14 23:45:45
priority: P0
depends_on: ['task-01']
blocks: []
requirement_ids: [FR-02]
decision_ids: [D-001@v1]
allowed_paths:
  - src/stage-contract.js
  - NEW:test/acceptance-matrix-gate.test.mjs
target_files:
  - src/stage-contract.js
  - NEW:test/acceptance-matrix-gate.test.mjs
goal: >
  在 stage-contract.js 落地 extractAcceptanceMatrixSlots 槽位提取器并注册进 verify 阶段 validator 链，让矩阵未填槽/缺证据 fail-closed 阻断 verify --done。
implementation:
  - export extractAcceptanceMatrixSlots(verifyMd) 返回 { rows, unfilled, missingEvidence, present }——行级解析「#### 探针 7」矩阵章节的判定列与证据列，present 标示段是否存在
  - 判定列四枚举白名单 covered/partial/uncovered/non-testable：白名单外或仍为 <待填：四选一> 的行计入 unfilled
  - missingEvidence 三口径——covered/partial 行证据须非 TODO 且含测试锚点形态（.test. 文件名或 file:line 或测试名引用）；non-testable 行证据须非 TODO 且非空（理由一句话）；三者皆计入 missingEvidence
  - 注册进 contracts.verify.validators（stage-contract.js:884 一带 validators 数组追加，覆盖 gates/machine-interface/stage-machine 全部 runValidators 调用方，gates.js 预计零改动）：unfilled>0 或 missingEvidence>0 时产 ERROR 进 runValidators 阻断链（同型先例 run/gates.js:603），不落 fail-soft 回填块（run/gates.js 593/686 一带 catch 只 warn 会吞阻断）
  - 严格档：有 tasks/ 但 verify-result.md 无矩阵段 → ERROR（复用 isIrStrictVerifyChange / IR_STRICT_SINCE 同源常量，与结论槽「删槽回退已关闭」同口径）；无 tasks/（probe7 不适用）不校验零行为变化
  - 新建 test/acceptance-matrix-gate.test.mjs：未填槽阻断 / 证据缺失阻断 / non-testable 豁免证据 / 全填放行四组用例，外加有 tasks 无段严格档 ERROR 用例
acceptance:
  - 判定列白名单外或待填的行使 validator 产 ERROR 阻断（unfilled 口径）
  - covered/partial 行证据为 TODO 或缺测试锚点形态（.test. 文件名或 file:line 或测试名引用）→ ERROR；non-testable 行证据空或 TODO → ERROR、带一句理由豁免（missingEvidence 口径）
  - 有 tasks 无段严格档 ERROR（isIrStrictVerifyChange 命中走 IR_STRICT_SINCE 同源常量）；无 tasks 变更零新增 error（brownfield 零行为变化）
  - 槽位全部合规（四枚举+证据齐）时放行，不误伤既有正常流
  - node test/acceptance-matrix-gate.test.mjs 全绿，既有 stage-contract / gates 相关测试零回归
verify:
  - node test/acceptance-matrix-gate.test.mjs
  - npm run lint
constraints:
  - 只动 allowed_paths 两文件；gates.js 零改动（注册经 contracts.verify.validators 生效于全部 runValidators 调用方）
  - 不改 runValidators 引擎签名与既有 validator 行为；错误只走 errors 阻断链，勿进 fail-soft warn 路径
  - 章节标题/列结构解析与 task-01 骨架渲染字面同源（禁自造第二套解析文法）
  - 严格档判定复用 isIrStrictVerifyChange / IR_STRICT_SINCE 同源常量，禁复制常量值
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
