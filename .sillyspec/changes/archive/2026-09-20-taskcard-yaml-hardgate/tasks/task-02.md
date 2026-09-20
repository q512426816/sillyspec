---
id: task-02
title: 'plan-side hard gate: parseTaskContracts unification + validatePlanFeasibility step 0b YAML validity check'
title_zh: 'plan 侧硬校验——parseTaskContracts 归一共享源与 yamlError 降级键 + validatePlanFeasibility 步骤 0b frontmatter 合法性硬校验'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-20 22:27:08
priority: P0
depends_on: ['task-01']
blocks: []
requirement_ids: [FR-02, FR-04]
decision_ids: [D-001@v1, D-001@v2]
allowed_paths:
  - src/stages/plan-postcheck.js
target_files:
  - src/stages/plan-postcheck.js
provides:
  - contract: 'FeasibilityStep0bHardGate'
    fields:
      - 'validatePlanFeasibility 坏卡 ERROR 含文件:行:列'
      - 'parseTaskContracts yamlError 显式降级键'
      - '重复键双报豁免'
expects_from:
  task-01:
    - contract: 'TaskcardFrontmatterParse'
      needs:
        - 'parseTaskFrontmatter 返回 ok/hasFrontmatter/fm/error 四键'
        - 'error.line 为文件 1 基行（js-yaml mark.line + 2）'
        - 'error.column 为 1 基列（mark.column + 1）'
goal: >
  plan 门禁不再静默吞坏 YAML：parseTaskContracts 内部改用共享解析源并在坏 YAML 时返回
  yamlError 显式降级键（不再空数组冒充无契约字段）；validatePlanFeasibility 在重复键检测
  （src/stages/plan-postcheck.js:1298）后新增步骤 0b——frontmatter 非法 YAML 即 ERROR，
  报错带 文件:行:列 与 js-yaml 原始 message。落点依据 D-001@v2（聚合器 1b 先于 1c 同 pass，
  入口拦截即全链路覆盖；契约门禁保持纯契约语义不加预检）。
implementation:
  - parseTaskContracts（src/stages/plan-postcheck.js:327）内部改用 task-01 的 parseTaskFrontmatter：坏 YAML 时返回 provides 空、expectsFrom 空、yamlError 为 error 对象；无 frontmatter 语义不变；合法路径行为不变
  - validatePlanFeasibility（src/stages/plan-postcheck.js:1247）在 dupKeys 检测后加步骤 0b：逐卡 parseTaskFrontmatter，失败即 errors.push 文案含 taskId 或文件名、文件:行:列、js-yaml message 与修复指引（值含方括号或全角括号时加引号或改块式列表）
  - 0b 双报豁免：js-yaml message 含 duplicated mapping key 且该卡 dupKeys 非空时跳过 0b（:1298 精确文案独占）；嵌套重复键仍由 0b 兜底
  - 同步改写 :1382 best-effort 注释（原「feasibility 未对 fm 做 YAML 解析」在 0b 落地后失实）
acceptance:
  - 坏卡 changeDir 下 validatePlanFeasibility 返回 ok=false 且 errors 含 frontmatter 非法 YAML 与文件:行:列
  - 好卡（合法 YAML）零新增错误（既有用例全绿）
  - parseTaskContracts 对坏卡返回 yamlError 非 null 且 provides 为空；对合法卡 yamlError 为 null
  - 顶层重复键卡不产生 0b 第二条错误（:1298 独占）；嵌套重复键卡由 0b 报错
verify:
  - node --test test/taskcard-frontmatter-hardgate.test.mjs（task-04 落地后）
  - node --test test/cross-task-contracts.test.mjs test/taskcard-duplicate-key.test.mjs test/plan-postcheck-crlf.test.mjs
constraints:
  - validateCrossTaskContracts（:694）不加 YAML 预检（D-001@v2 纯契约语义）
  - 不改 hasAcceptanceCriteria 宽收正则（职责是在场非合法）
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
     implementation/acceptance 里的源码位置同样写仓根相对全路径+行号（src/foo.js:123）——
                    裸文件名在 docs-check 层1 靠 basename 全仓扫描找候选，找不到候选或关键词
                    窗口不匹配即失效，到 pre-push 才拦（2026-09-19 实证 64 处返工）。
     可选字段按需插进上方 frontmatter（规则见 taskcard-rules）：
     repo:          仅跨仓 task 填（local.yaml repos: 注册的仓 key；缺省=main。allowed_paths 相对该仓根写，
                    禁止带仓库名前缀/绝对路径——review 对账按仓根相对路径匹配，带前缀永不命中）
     provides:      仅当本 task 给其他 task 提供接口/DTO/响应时填
     expects_from:  仅当本 task 消费其他 task 的契约时填
     related_tests: 仅当本 task 改动导致既有测试断言失效时填（测试路径须同时进 allowed_paths） -->
