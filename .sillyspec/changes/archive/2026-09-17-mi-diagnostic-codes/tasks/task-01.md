---
id: task-01
title: 'Create diagnostic-codes.js single-source frozen code registry (10 codes)'
title_zh: '新建 src/diagnostic-codes.js 码表单一源——冻结表 DIAGNOSTIC_CODES 恰 10 码（信封级 4 + check 级 6，surface 与退出码语义按 design 接口定义）+ checkCode(checkId) 映射'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-17 22:25:55
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-01, FR-02]
decision_ids: [D-001@v1, D-002@v1, D-004@v1]
allowed_paths:
  - src/diagnostic-codes.js
target_files: [NEW:src/diagnostic-codes.js]
provides:
  DIAGNOSTIC_CODES: '冻结表 code -> {surface: string[], exit: number, trigger: string}，恰 10 键（信封级 db_missing/change_not_found/unknown_facet/internal_error + check 级 artifacts_invalid/design_file_ref_invalid/transition_blocked/execute_evidence_unchanged/task_reviews_invalid/verify_test_failed）'
  checkCode: '(checkId: string) -> 失败码 | undefined（artifacts→artifacts_invalid、design-file-list→design_file_ref_invalid、transition→transition_blocked、execute-evidence→execute_evidence_unchanged、task-reviews→task_reviews_invalid、verify-test→verify_test_failed；表外 id 返回 undefined）'
goal: >
  machine-interface 族自产错误的稳定身份单一源：发射侧（task-02）、契约码目录（task-03）、parity 测试（task-05）三方共用，杜绝码漂移。
implementation:
  - 新建 src/diagnostic-codes.js：导出 Object.freeze 的 DIAGNOSTIC_CODES，10 键的 surface/exit/trigger 逐条按 design.md 接口定义（check 级四码 surface=['gate','derive']，artifacts_invalid 含 gate artifacts check 与 derive artifacts facet 同源注记）
  - 导出 checkCode(checkId) 映射（六 check id → 失败码，表外 undefined）
  - 头注释钉住：恰 10 码边界（D-002）、扩码走变更流程、码表是码身份唯一源（文档目录与运行时发射不得出现表外码——parity 契约）
acceptance:
  - Object.keys(DIAGNOSTIC_CODES).length === 10 且键集与 design 接口定义逐字一致
  - Object.isFrozen(DIAGNOSTIC_CODES) === true
  - checkCode 六个 check id 全命中且码名正确；checkCode('no-such-check') === undefined
verify:
  - node -e "import('./src/diagnostic-codes.js').then(m => { console.assert(Object.keys(m.DIAGNOSTIC_CODES).length === 10, '10 codes'); console.assert(Object.isFrozen(m.DIAGNOSTIC_CODES), 'frozen'); console.assert(m.checkCode('transition') === 'transition_blocked'); console.assert(m.checkCode('no-such') === undefined); console.log('task-01 smoke OK'); })"
constraints:
  - 零依赖叶子模块（不 import 仓内任何其他 src 模块，防环）
  - 只新增本文件，不改任何既有文件
  - 不做 warnings 级码（D-002 首期边界）
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
