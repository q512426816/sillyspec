---
id: task-03
title: 'skip/PID/verify-mode 退役——gates.js 删 reapVerifyServices 与 pids 读逻辑、stage.js 删 skip 短路、next.js 删待验证/skip 分支、verify-mode.js 删+config-schema 键清理+存量键读取忽略回归锚（依赖 task-01；与 task-04 共写 gates.js 由 Wave 屏障消化）'
title_zh: 'skip/PID/verify-mode 退役——gates.js 删 reapVerifyServices 与 pids 读逻辑、stage.js 删 skip 短路、next.js 删待验证/skip 分支、verify-mode.js 删+config-schema 键清理+存量键读取忽略回归锚（依赖 task-01；与 task-04 共写 gates.js 由 Wave 屏障消化）'
author: 't'
generated_by: sillyspec-taskcard
created_at: 2026-11-26 10:36:05
priority: P0
depends_on: [task-01]
blocks: [task-08]
requirement_ids: [FR-03, FR-04]
decision_ids: [D-002@v1, D-008@v1]
allowed_paths:
  - src/run/gates.js
  - src/run/stage.js
  - src/run/next.js
  - src/verify-mode.js
  - src/config-schema.js
  - test/verify-mode-retired.test.mjs
target_files:
  - src/run/gates.js
  - src/run/stage.js
  - src/run/next.js
  - src/verify-mode.js
  - src/config-schema.js
  - NEW:test/verify-mode-retired.test.mjs
goal: >
  退役 skip 开关与 PID 回收机制：reapVerifyServices 与 pids 读逻辑删除、stage.js skip 短路删除、verify-mode.js 删除、next.js 待验证分支删除、config-schema 键清理，并补存量键读取忽略回归锚。
implementation:
  - src/run/gates.js:2517 reapVerifyServices 与 :1514 调用点、verify-services pids 文件读逻辑一并删除（D-008：登记源头已随 verify.js 消亡，留则死码空转）；存量 .runtime/verify-services-*.pids 残文件不清理
  - src/run/stage.js 删 verify.mode=skip 短路块（2026-11-26-verify-skip-switch 引入段，约 :290-318）
  - src/run/next.js:84-91 删「待验证」分支与 skip 改指 archive 分支（execute 全勾后直接指 run archive）
  - 删除 src/verify-mode.js；grep 全仓 import 清零（已知消费 src/stage-contract.js:10——该行随 task-05 契约层退役，本卡确保无其他残留）
  - src/config-schema.js 删 verify.mode 注册键
  - 新增 test/verify-mode-retired.test.mjs：存量 local.yaml 含 verify:{mode:skip} 时任意命令运行不报错、键无消费者（锚 FR-04 读到忽略承诺）
acceptance:
  - node --test test/verify-mode-retired.test.mjs 全绿
  - grep -rn "verify-mode" src --include=*.js 零命中
  - sillyspec next 对全勾变更指 run archive
verify:
  - node --test test/verify-mode-retired.test.mjs
  - node test/check-syntax.mjs
constraints:
  - 与 task-04 共写 gates.js 由 W2 到 W3 Wave 屏障消化（本卡在 W3）
  - next.js 只删分支不动 detectNextStep 其余推断逻辑
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
     implementation/acceptance 里的源码位置同样写仓根相对全路径+行号（形如 src/foo.js:<行号>——行号写实际数字）——
                    裸文件名在 docs-check 层1 靠 basename 全仓扫描找候选，找不到候选或关键词
                    窗口不匹配即失效，到 pre-push 才拦（2026-09-19 实证 64 处返工）。
     可选字段按需插进上方 frontmatter（规则见 taskcard-rules）：
     repo:          仅跨仓 task 填（local.yaml repos: 注册的仓 key；缺省=main。allowed_paths 相对该仓根写，
                    禁止带仓库名前缀/绝对路径——review 对账按仓根相对路径匹配，带前缀永不命中）
     provides:      仅当本 task 给其他 task 提供接口/DTO/响应时填
     expects_from:  仅当本 task 消费其他 task 的契约时填
     related_tests: 仅当本 task 改动导致既有测试断言失效时填（测试路径须同时进 allowed_paths） -->
