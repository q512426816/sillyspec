---
id: task-02
title: 'outputStep 接线——{PREFLIGHT_FAILURES} 占位符渲染（产出型步骤声明驱动：brainstorm 写文档/生成规范、plan 生成计划、execute 任务步）+ 注入分叉（首步全量/后续摘要行+digest+Read 路径+.runtime/prompt-inject-<change>.json 账本幂等）'
title_zh: 'outputStep 接线——{PREFLIGHT_FAILURES} 占位符渲染（产出型步骤声明驱动：brainstorm 写文档/生成规范、plan 生成计划、execute 任务步）+ 注入分叉（首步全量/后续摘要行+digest+Read 路径+.runtime/prompt-inject-<change>.json 账本幂等）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-18 21:12:40
priority: P0
depends_on: ['task-01']
blocks: []
requirement_ids: [FR-01, FR-02]
decision_ids: [D-001@v1, D-002@v1, D-005@v1]
allowed_paths:
  - src/run/prompt.js
expects_from:
  task-01:
    - contract: preflight-pure-functions
      needs: [renderPreflightFailures, shouldInjectFullContext]
target_files:
  - src/run/prompt.js
goal: >
  在 outputStep 把 task-01 纯函数接进渲染管线——{PREFLIGHT_FAILURES} 占位符（含防应试清单头固定行）
  与阶段感知注入分叉（首步全量/后续摘要行），prompt-inject 账本 withFileLock 幂等写。
implementation:
  - outputStep（:536 async）渲染产出型步骤时消费 stages 步骤声明的 preflightValidators，调 task-01 renderPreflightFailures 渲染 {PREFLIGHT_FAILURES} 占位符；步骤未声明 preflightValidators 时占位符零出现（旧 prompt 逐字节不变——兼容红线，亦是既有测试零回归的依赖）
  - 渲染模板清单头固定行「已知失败项（非全部要求），清单外仍需按步骤说明自检」（R-07/FR-01，计划评审 gap②）；清单尾部固定「完整清单：sillyspec gate <stage> --json」
  - 防打架三约束（评审红线）写死渲染路径：只注本步相关 validator、条数帽 5 截断、单步 prompt 中位长度不反弹（中位统计钩子归 task-05 验收）
  - 注入分叉：shouldInjectFullContext 为真时本阶段首步全量注入模块上下文/scan 事实；为假时改摘要行「本阶段上下文已于步骤 N 注入（digest 前 8 位）；需要时 Read <module-map 路径>/<scan 文档路径>」
  - 账本 .runtime/prompt-inject-<change>.json（stages 按阶段记 firstStep/digest/at）用 withFileLock 幂等写（quicklog.js:40 先例，防多会话 read-modify-write 丢更新 R-06）；账本读写异常静默回退每步全量
  - 只做渲染机制：不碰 stages 的 preflightValidators 声明定义（三 stages 声明统一归 task-04——计划评审 gap①）
acceptance:
  - 未配 preflight 声明的 stage/步骤渲染输出与现状逐字节一致
  - 有失败项的产出步 prompt 含清单头固定行、帽 5 截断后的条目、尾部完整清单行
  - 同阶段首步全量注入、后续步骤注摘要行（digest 前 8 位+可 Read 路径）
  - 删除或损坏账本后渲染回退每步全量，无异常抛出
verify:
  - node --test test/prompt-placeholders.test.mjs test/knowledge-inject.test.mjs
  - npm run lint
constraints:
  - 只动 allowed_paths 单文件；LF 行尾；兼容 Windows/Linux/macOS
  - fail-open 注入面：前置清单/注入分叉任何异常静默降级（不注/回退全量），绝不阻塞 prompt 渲染与门判定
  - 占位符实现层不动 _module-map 匹配逻辑，只改注入分叉；不新增测试文件（四相位直测归 task-05）
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
