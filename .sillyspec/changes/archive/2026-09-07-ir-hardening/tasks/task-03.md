---
id: task-03
title: 'P3a 收紧——reconcileTargetFiles 主仓卡全零声明 strictViolation 档 + gates 接线'
title_zh: 'P3a 收紧——reconcileTargetFiles 主仓卡全零声明 strictViolation 档 + gates 接线'
author: 'qinyi'
created_at: 2026-09-07 23:13:34
priority: P0
depends_on: ['task-01']
blocks: []
requirement_ids: [FR-01]
decision_ids: [D-003@v1]
allowed_paths:
  - src/verify-postcheck.js
  - src/run/gates.js
target_files: [src/verify-postcheck.js, src/run/gates.js]
goal: >
  P3a 收紧：严格模式变更主仓卡全部零声明 → strictViolation（target_files_all_missing_strict）→ gates ERROR 阻断。
implementation:
  - reconcileTargetFiles 增 opts.strictMode（默认 false）
  - 判据（Grill 修订）：noDeclarationCount > 0 且 == cardCount - 跨仓卡数（主仓卡全零声明；跨仓卡不计数不豁免）
  - 命中且 strict → 返回 { status:skipped, strictViolation:{ code:target_files_all_missing_strict, message: 指引逐卡 Edit 填 target_files（taskcard 骨架已预置字段） } }
  - 非 strict 零声明/部分声明/全跨仓三分支语义不变
  - gates.js：printReconcileTargetFilesCheck 识别 strictViolation → ERROR 文案；writeReconcileRunResult 落盘 additive 字段；archive-delta 只读既有字段不受影响
acceptance:
  - strict + 主仓卡全零声明（含混合跨仓形态）→ ERROR 阻断 code target_files_all_missing_strict
  - 部分声明/全跨仓/存量零声明三场景输出与改前一致
  - strictViolation 落盘 additive
verify:
  - node --check src/verify-postcheck.js src/run/gates.js
  - 测试在 task-09（含混合跨仓场景）
constraints:
  - 不动部分声明 WARNING 语义
  - strictViolation 挂在 skipped 状态上（status 枚举不新增，防下游 switch 破坏）
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
