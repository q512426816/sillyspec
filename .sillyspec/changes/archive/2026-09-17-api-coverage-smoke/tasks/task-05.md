---
id: task-05
title: 'validateApiCoverageMatrix validator（covered 记账/有效分母扣除 non-testable/锚点解析级校验/移交联动/探索性子行不计账/声明降级/critical×零接口面 error）注册进 verify.validators'
title_zh: 'validateApiCoverageMatrix validator（covered 记账/有效分母扣除 non-testable/锚点解析级校验/移交联动/探索性子行不计账/声明降级/critical×零接口面 error）注册进 verify.validators'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-17 22:06:55
priority: P0
depends_on: ['task-03', 'task-04']
blocks: []
requirement_ids: [FR-04, FR-05, FR-06]
decision_ids: [D-004@v1, D-005@v1, D-010@v1]
allowed_paths:
  - src/stage-contract.js
  - test/acceptance-matrix-gate.test.mjs
  - test/verify-probes-facts.test.mjs
target_files:
  - src/stage-contract.js
  - test/acceptance-matrix-gate.test.mjs
  - test/verify-probes-facts.test.mjs
goal: >
  在 src/stage-contract.js 新增 validateApiCoverageMatrix(cwd, changeName, context) 并注册进 verify.validators——接口验证覆盖矩阵的 fail-closed 对账门（covered 记账/有效分母扣除 non-testable/锚点解析级校验/移交联动/探索性与子行不计账/声明降级/critical×零接口面 error），机械封住「接口层零派生」的 P1 缺陷面（design §4，FR-04）。
implementation:
  - '新增导出 validateApiCoverageMatrix(cwd, changeName, context)——注册壳三参签名对齐 validateAcceptanceMatrix（stage-contract.js:858 先例）：resolveChangeDir 定位变更目录；tasks/ 不存在或 verify-result.md 未落盘 → { ok: true } 空转（brownfield 零行为）；「## 接口验证覆盖矩阵」段缺失 → 非严格档 warning / 严格档 error 引导 --init 幂等补段（对齐 :896-903 双层形态）'
  - '壳层解析矩阵 MD 槽：端点行四要素（判定列 covered/partial/uncovered/non-testable + 用例依据 ID + 结果 + 证据锚点）、消费端子行（两空格缩进 ↳ 前缀）、探索性行（判定 uncovered + 证据列含 [探索] 标记）、声明占位行（「本变更接口面：<N> 端点（agent 声明）」）；组装 { apiFace, matrixRows, factsExpected } 调纯函数判定（双层形态：壳做 IO/MD 槽解析，判定层零 IO 纯函数——对齐批次 A X-09）'
  - '纯函数判定——covered 记账：分子=判定列 covered 的端点行数（partial/uncovered 端点行不计分子）；有效分母=N−non-testable 行数（N=解析端点数或声明数；non-testable 理由非空即合法，对齐 :900 先例「non-testable 证据须写一句理由」，理由空按违规计）；分子<有效分母 → error 逐条列缺覆盖端点'
  - '移交联动（条件④同款形态，:1068-1073 先例）：partial/uncovered 端点行>0 且 facts.handover 零有效行 → error（已覆盖不足且有未验证端点无去向不可静默）；factsExpected=true 而 facts 缺失 → fail-closed 按零有效行处理（复用 resolveFactsExpected/countFactsHandoverItems 口径）；放行路径上 blocking 是否封顶归 validatePassEligibility 条件②（④管有去向/②管去向级——同款分工注释照抄口径）'
  - '锚点校验（design §4 Grill #10 五形态）：design接口表#<METHOD /path> 为解析级——须命中 parseDesignApiTable 产出集（经 context 传入，空指 → error 防编造端点）；其余四形态（权限矩阵[<角色×动作>] / 契约表@<行标识> / DDL@<列名> / 载荷@<构造点路径>）存在即认，缺失 → error'
  - '记账排除与 advisory：探索性行与消费端子行不进分母分子；有消费端的端点未填子行 → warning 列出（D-006 第一版 advisory）；表间完备性——写端点（POST/PUT/DELETE/PATCH）未在权限矩阵段命中且无「无权限约束」豁免标记 → warning「写端点 X 未在权限矩阵声明——补行或显式豁免（表缺行会让派生框架继承你的洞）」（D-007/FR-06，文案照 design §5）'
  - '声明降级对账（D-005）：解析零行按声明数对账；声明与解析并存以解析为准并注记 warning；解析零行零声明 × 判级 critical → error（接口面不可静默为零——「变更有接口面」以判级 critical 为机械代理）；判级 critical × 声明 0 端点 → warning 提示复核（D-005 故障面条款）；非判级 critical 零接口面 → validator 零行为零打扰'
  - '判级口径衔接 task-03：criticalLevel 判别与第五条件同源（changeRiskProfile.level ∈ { integration-critical, deployment-critical }，runtimeEndpointExcluded 同款判级限定形态）'
  - '注册：verify.validators 数组（stage-contract.js:1373）追加 validateApiCoverageMatrix——注册即覆盖 gates/machine-interface 等全部 runValidators 调用方（gates.js 零改动）；回退=移除本注册行（纯加法，未触发零行为）'
  - '消费路径铁律（plan 全局硬约束 3）：stage-contract 保持零 import verify-probes——parseDesignApiTable 产出经「verify-probes 侧落盘（facts.apiFace 或骨架预填段）/context 传参」进入 validator，禁止在 stage-contract 内动态 import（readFactsForEligibility 就地实现纪律 :966-969：verify-probes 顶层 await 动态回指本模块，静态依赖会成环死锁）'
acceptance:
  - 'covered 端点行数 < 有效分母（N−non-testable 行数）→ ok:false 且 errors 逐条列出缺覆盖端点（method+path）；partial/uncovered 端点行不计入分子'
  - 'partial/uncovered 端点行在场且 facts.handover 零有效行 → error；有移交行 → 放行（blocking 封顶归条件②）；factsExpected=true 而 facts 缺失 → fail-closed error'
  - 'design接口表#<METHOD /path> 锚点未命中解析产出集 → error（防空指）；其余四形态存在即认、缺失 → error'
  - '解析零行零声明且判级 critical → error；判级 critical 且声明 0 端点 → warning；非判级 critical 零接口面 → 零行为'
  - '探索性行（uncovered+[探索]）与消费端子行（两空格缩进 ↳ 前缀）不进分母分子；non-testable 理由非空合法并从分母扣除'
  - '消费面子行缺失与写端点权限矩阵缺行 → warnings 输出（不阻断、不进 errors）'
  - 'src/stage-contract.js 全文无 verify-probes import（静态+动态均无——grep 实证）；apiFace 只经 context 传参/facts 落盘面进入'
  - 'npm test 既有用例全绿（本 task 不新增测试文件，断言归 task-07）；未跑 --init 的存量变更零行为变化'
verify:
  - npm test
  - npm run lint
constraints:
  - 'stage-contract 零 import verify-probes（静态+动态均禁——TLA 成环死锁，:966-969 纪律）；apiFace 仅经 context 传参或 verify-probes 侧落盘 facts 进入，不在本模块解析 design.md'
  - '不动 validateAcceptanceMatrix（probe7）与 probe7/probe8 语义——接口矩阵独立章节并行，口径注记互指归 task-04 骨架段'
  - '不改 facts schemaVersion、结论枚举、commands.test/lint 语义；未配置/无矩阵段的变更零行为（brownfield 兼容）'
  - '不新增测试文件与依赖（断言归 task-07）；错误文案含修复指引（对齐 :896-903 先例的「修复：…」形态）'
  - '跨平台：path.join 拼路径；矩阵行解析容忍 CRLF/LF（\r 剥离）'
provides:
  - contract: api-coverage-validator
    fields:
      - validateApiCoverageMatrix
      - apiFace-consumption
      - errors-warnings
expects_from:
  task-04:
    - contract: api-face-parser
      needs:
        - endpoints
        - declared
        - 骨架矩阵段
  task-03:
    - contract: smoke-ran-fact
      needs:
        - smoke-not-run-trigger
        - facts.smokeRan
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
