---
id: task-02
title: 'burst render branch in runStage (fold remaining steps into one render)'
title_zh: 'burst 渲染分支（剩余步说明书一次下发 + noAI 就地完成）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-23 00:23:08
priority: P0
depends_on: ['task-01']
blocks: ['task-05']
requirement_ids: [FR-02]
decision_ids: [D-002@v2, D-006@v1, D-008@v1]
expects_from: 'task-01 readStageBurst(cwd) -> Promise<boolean>'
allowed_paths:
  - src/run/stage.js
  - test/stage-burst.test.mjs
target_files:
  - src/run/stage.js
goal: >
  burst 渲染折叠：白名单阶段一次渲染下发全部剩余步说明书——渲染器本体零改动（逐个调既有 outputStep），noAI 步就地 CLI 执行。
implementation:
  - 抽取 src/run/stage.js:592-629 的 _cliAction if-链为模块局部助手 executeNoAiCliAction({cliAction, stageName, stepName, cwd, specBase, changeName, platformOpts, progress, pm, scanProfile})，常规单步 noAI 路径改调助手（行为零变化，D-008）
  - 抽取 src/run/stage.js:640-653 阶段完成收尾块为模块局部助手（completeStageGates 调用+exitCode+persist），noAI 末步路径与 burst 共用
  - runStage 在 defSteps 计算后（src/run/stage.js:585-586 块内、noAI 单步判定前）加 burst 门：stageName ∈ {brainstorm,plan,execute}（D-006）且 readStageBurst(cwd) 为真 → 单趟遍历 defSteps：跳过 completed/skipped；noAI 步打 ⚙️ 行→调助手→标 completed+completedAt+pm._write；AI 步 await outputStep(stageName, i, defSteps, cwd, changeName, progress.project||null, platformOpts, null, collectStageWaitHistory(progress, stageName))
  - 遍历后重查：无剩余→收尾助手（镜像 :640-653）；有剩余→打 burst 尾提示「📦 burst 模式：本阶段全部说明书已一次下发。干完全部步骤后用一次 --done 收口（CLI 内部逐步推进+逐步校验，失败即停在失败步）。」
acceptance:
  - burst 开启时 run <stage> 一次输出全部剩余 AI 步说明书+尾提示，noAI 步已就地 completed 落库
  - 非白名单阶段（verify/archive/quick/scan/doctor/explore）或 burst 关闭时渲染输出与现状一致
  - waiting 步在 burst 前被 src/run/stage.js:245-254 既有硬拦（零新增判定）
verify:
  - node --test test/stage-burst.test.mjs
  - npm test（burst 缺省 OFF 零回归）
constraints:
  - outputStep/渲染器本体零改动（只调用不改）
  - 白名单外的阶段零路径变化
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
