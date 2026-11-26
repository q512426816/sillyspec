---
id: task-06
title: '命令与 prompt 面——run verify 路由/verify-probes 命令族删除、prompt.js verify 组装+HANDOVER_SUMMARY 删、archive.js:78-80 移交项块删、progress-confirm verify 档提示删（指路语带 doctor legacy 通道）（依赖 task-01）'
title_zh: '命令与 prompt 面——run verify 路由/verify-probes 命令族删除、prompt.js verify 组装+HANDOVER_SUMMARY 删、archive.js:78-80 移交项块删、progress-confirm verify 档提示删（指路语带 doctor legacy 通道）（依赖 task-01）'
author: 't'
generated_by: sillyspec-taskcard
created_at: 2026-11-26 10:36:07
priority: P0
depends_on: [task-01]
blocks: [task-08]
requirement_ids: [FR-01, FR-05]
decision_ids: [D-004@v1]
allowed_paths:
  - src/run/command.js
  - src/index.js
  - src/run/prompt.js
  - src/stages/archive.js
  - src/run/progress-confirm.js
target_files:
  - src/run/command.js
  - src/index.js
  - src/run/prompt.js
  - src/stages/archive.js
  - src/run/progress-confirm.js
goal: >
  删除 verify 命令面与 prompt 组装：run verify 路由、verify-probes 命令族、prompt.js verify 组装与 HANDOVER_SUMMARY 注入、archive.js 移交项展示块、progress-confirm verify 档提示——指路语改四阶段语义并带 doctor legacy 通道。
implementation:
  - src/run/command.js:1118/:2040 的 run verify 路由删除——调用时输出「verify 阶段已退役：execute 完成后请 run archive；存量在途 verify 变更请 sillyspec doctor 走 legacy 盖戳」（中文、状态/原因/修复路径一次给全）
  - src/index.js:125 帮助文本、:1473 verify-probes 命令族 case、:3359 顶层 verify 别名、:5909 topCommands 删除
  - src/run/prompt.js:1966-1996 HANDOVER_SUMMARY 注入与 verify prompt 组装分支删除
  - src/stages/archive.js:78-80「确认归档」步的移交项展示块（消费 verify-facts/handover）与对应占位符删除——该步 prompt 重写为不含移交项的确认清单
  - src/run/progress-confirm.js verify 档提示（「全量测试由 --done 统一执行」类）删除
acceptance:
  - sillyspec run verify 输出退役指路语且不进入阶段机；sillyspec verify 顶层别名同
  - verify-probes 命令不存在（帮助文本零提及）
  - archive 确认步 prompt 无 {HANDOVER_SUMMARY} 残留占位
verify:
  - node test/check-syntax.mjs
  - node --test test/stage-machine-verify-retired.test.mjs（回归）
constraints:
  - 指路语文案与门判定一致（防「提示说 A 实现是 B」漂移——cli-copy-selfsufficient 探针）
  - 报错一次给全，不依赖二跑定位
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
