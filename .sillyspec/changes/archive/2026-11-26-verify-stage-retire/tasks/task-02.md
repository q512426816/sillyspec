---
id: task-02
title: 'archive 前置门——archive.js 插 noAI「收口实测门」（3→4 步）、verify-quality-scan 更名 archive-quality-scan 并改挂载（前缀同更名、阻断只认 commands.test、本仓 unavailable 关闭态）+门两态测试（依赖 task-07）'
title_zh: 'archive 前置门——archive.js 插 noAI「收口实测门」（3→4 步）、verify-quality-scan 更名 archive-quality-scan 并改挂载（前缀同更名、阻断只认 commands.test、本仓 unavailable 关闭态）+门两态测试（依赖 task-07）'
author: 't'
generated_by: sillyspec-taskcard
created_at: 2026-11-26 10:36:04
priority: P0
depends_on: [task-07]
blocks: [task-08]
requirement_ids: [FR-02]
decision_ids: [D-001@v1, D-005@v1, D-008@v1]
allowed_paths:
  - src/stages/archive.js
  - src/run/verify-quality-scan.js
  - src/run/archive-quality-scan.js
  - test/archive-quality-scan.test.mjs
target_files:
  - src/stages/archive.js
  - NEW:src/run/archive-quality-scan.js
  - NEW:test/archive-quality-scan.test.mjs
goal: >
  在 archive 步骤表头部挂载 noAI 收口实测门（3 到 4 步）：verify-quality-scan 更名 archive-quality-scan 并改调用点，测试实测失败阻断归档；本仓落点为 unavailable 关闭态归 CI。
implementation:
  - src/run/verify-quality-scan.js 更名 NEW:src/run/archive-quality-scan.js：runner/动态子集三源推断/指纹缓存全保留，只改导出名与内部日志文案；产物前缀同更名 archive-quality-scan-（runtime-paths 注册键由 task-08 承接，本卡先在文件内声明新前缀常量）；.runtime/verify-runs/ 取证目录名保留
  - src/stages/archive.js 步骤表头部插 noAI 步「收口实测门」（_cliAction: archiveCloseGate，3 到 4 步；分发点 run/stage.js 的 noAI 分支加 case——该行改动属本卡）
  - 门阻断语义：实测失败 exit 1 + 步骤不盖 completed + 可重入断点续；阻断只认 commands.test 失败（smoke/coverage/metrics 为记录面不阻断）
  - 本仓落点：.sillyspec/local.yaml 将 commands.test 标 unavailable（注释留痕归 pre-push/CI；local.yaml 为 gitignored 仓主配置，task-10 在 file-lifecycle 记说明）
  - 新增 test/archive-quality-scan.test.mjs：门两态（测试失败阻断/测试通过放行）+ 指纹缓存复用（同指纹二跑免重跑）
acceptance:
  - node --test test/archive-quality-scan.test.mjs 全绿（含 worktree 在场时测试面推断不回归——沿用既有 resolveVerifyChangedFiles 推断面）
  - archive 步骤数为 4，首步 noAI；测试失败时 run archive exit 1 且步骤未盖 completed
verify:
  - node --test test/archive-quality-scan.test.mjs
  - node test/check-syntax.mjs
constraints:
  - 不新增 CLI 命令（D-005/D-006 rejected）
  - lint 不在门内（归 flow done/pre-push/CI）；机制保留服务无 CI 仓，本仓 unavailable 关闭（D-008/AGENTS 00）
  - 更名后旧文件名零残留引用（grep verify-quality-scan 仅剩历史归档区命中）
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
