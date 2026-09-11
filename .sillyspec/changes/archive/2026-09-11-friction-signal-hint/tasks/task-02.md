---
id: task-02
title: 'gates.js 埋点——rollbackCompletionAndReturn 尾参 + 13 处调用点标签'
title_zh: 'gates.js 埋点——rollbackCompletionAndReturn 尾参 + 13 处调用点标签'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-11 10:19:06
priority: P1
depends_on: [task-01]
blocks: []
requirement_ids: [FR-01]
decision_ids: [D-001@v1, D-004@v1, D-006@v1]
expects_from:
  task-01:
    friction-api:
      recordFrictionEvent: '埋点调用签名（cwd/platformOpts/changeName/type/detail）'
allowed_paths:
  - src/run/gates.js
target_files: [src/run/gates.js]  # 可选：本 task 计划改动的文件（对账用精确路径清单，格式见下方注释；不填保留 []）
goal: >
  gate 级联回滚路径埋点：rollbackCompletionAndReturn 加可选 friction 尾参并 record；13 处调用点按所属 gate 段补类型/来源标签（审查两段传 review_rejected）。
implementation:
  - rollbackCompletionAndReturn(..., friction)——尾参默认 { type:'gate_rollback', detail:'gate-cascade' }；函数体首行 recordFrictionEvent（静默降级内建于模块）
  - 13 处调用点标签：599 validators / 670 verify-test / 697 verify-lint / 737·763·792·826 verify-contract / 855 plan-execute-contract（复审核正：属 Plan→Execute Contract 段 850-856）/ 916·936 stage-review（review_rejected）/ 1045·1061 task-review（review_rejected）/ 1315 internal-error
  - 不改任何 gate 判定逻辑与返回结构，只加实参与 record
acceptance:
  - 任一 gate 失败 → friction-tally-<change>.json 的 gate_rollback 或 review_rejected 计数 +1，history 含来源标签
  - 不传尾参的调用点走默认 gate-cascade 标签（兼容）
  - gate 全过路径零额外输出零写盘
verify:
  - npm test -- test/friction-tally.test.mjs（含 gates 埋点行为用例）
constraints:
  - 不改回滚语义/返回对象结构；不改 runStageCompletionGates 判定顺序
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
