---
id: task-03
title: 'completeStepBurst loop wrapper + command.js dispatch wiring'
title_zh: 'completeStepBurst 循环包装与两处 --done 分发接线'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-23 00:23:08
priority: P0
depends_on: ['task-01']
blocks: ['task-05']
requirement_ids: [FR-03, FR-06]
decision_ids: [D-003@v2, D-004@v2, D-005@v1, D-009@v1, D-011@v1]
expects_from: 'task-01 readStageBurst(cwd) -> Promise<boolean>'
allowed_paths:
  - src/run/complete.js
  - src/run/command.js
  - test/stage-burst.test.mjs
target_files:
  - src/run/complete.js
  - src/run/command.js
goal: >
  burst 完成侧：completeStepBurst 循环调既有 completeStep（守卫零改动、失败 exit 即断点、重跑幂等续推）+ command.js 两处 --done 分发按 burst 门接线。
implementation:
  - src/run/complete.js 新增 export async function completeStepBurst(pm, progress, stageName, cwd, outputText, inputText=null, options={})：整体 --output 打一行「📦 burst 收口摘要：<outputText>」横幅（D-009；省略跳过）
  - 循环上限 50 轮，每轮：①轮首尾随 stale 拉回（首个非 completed/skipped 步为 stale→拉回 pending+pm._write，钉死先于退出判定，D-003@v2）②重算 pending（谓词 pending|in-progress|blocked 与 src/run/complete.js:165 一致），无 pending→退出 ③轮前快照全部步 waitAnswer ④调 completeStep(pm, progress, stageName, cwd, null, inputText, {...roundOptions, printNext:false})——每轮 outputText=null 走 P0-2 合成 ⑤轮后 pm.read 重读（null→报错 exitCode=1，对齐 src/run/command.js:2078-2084）⑥快照比对：任一步 waitAnswer 新变为===doneAnswer→剥离 doneAnswer（D-004@v2）⑦首轮后剥离 stepAssert（D-005）⑧返回 {stageCompleted:false} 即透传返回
  - 循环耗尽仍有 pending → 报错防死循环；正常退出透传末轮返回值
  - src/run/command.js:1727 主 --done 分发：burst 门（白名单+readStageBurst）→ completeStepBurst（options 原样透传）；:2073 auto --done 同款接线且 burst 分支跳过 :2064-2070 的 --output 预合成（防横幅重复）
acceptance:
  - burst 开启：一次 --done 逐步推进打印每步完成行直至阶段完成；守卫失败（WAIT/waiting/requiresWait 无答案/门禁/漂移）exit 停在失败步、progress 态与单步失败态一致；重跑幂等续推
  - --answer 至多写入一个步的 waitAnswer（双 requiresWait 场景第二次等待步断点）
  - completeStep 函数本体零 diff
verify:
  - node --test test/stage-burst.test.mjs
  - npm test（burst 缺省 OFF 零回归）
constraints:
  - completeStep 本体零改动（D-003 铁律）——全部新逻辑在 completeStepBurst 与 command.js 接线层
  - auto 路径 burst 分支后的既有推进逻辑（nextPendingIdx/nextInFlow）不动
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
