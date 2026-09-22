---
id: task-03
title: 'Implement flow 2-call protocol with config and dispatch'
title_zh: '实现 flow 2-调用协议（start/done+配置+命令分发）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-22 10:58:49
priority: P0
depends_on: [task-02]
blocks: []
requirement_ids: [FR-03, FR-04, FR-05, FR-06]
decision_ids: [D-002@v1, D-003@v1, D-007@v1]
allowed_paths:
  - src/flow.js
  - src/config-schema.js
  - .sillyspec/local.yaml.example
  - src/index.js
  - test/flow-protocol.test.mjs
target_files:
  - NEW:src/flow.js
  - src/config-schema.js
  - .sillyspec/local.yaml.example
  - src/index.js
  - NEW:test/flow-protocol.test.mjs
expects_from:
  task-02:
    - contract: runArchiveChain
      needs: [skipPlanCheck]
goal: >
  协议必需交互折叠为 2——flow start 一次下发（建卡+材料路径清单+恢复简报+显式档），
  flow done 唯一裁决（六子步幂等+fail-closed 三句）；thin 缺省 legacy 一行回滚。
implementation:
  - NEW src/flow.js 的 flow start——initChange 建卡（ghost 免疫，不经 run brainstorm 多活跃门）；flow-state.yaml（tier/baseline_commit/子步标记，writeAtomicSync）；输出薄流程说明+材料路径清单（稳定前缀）；已存在 change 读盘面（checkbox/提交/P2 账本/dirty files）出恢复简报；--thick（起始即厚）与 --with-tasks（薄协议+任务卡）显式档——人声明不做覆盖度启发式
  - flow done 六子步幂等裁决——工件校验/P2 账本对账（consultTestLedger 优先，无记录经 runQuickTestLintGate 亲测，changedFiles=git diff 对 baseline_commit，实测后 recordTestLedger）/verify-probes/distill（distillIntoKnowledge 异态 rejected|needsWait→升厚）/归档（runArchiveChain skipPlanCheck 按 flow-state）/事件收口；fail-closed 三句——实测失败整单 FAIL exit 非 0、超时=失败、半态可重入不可假绿（归档子步未完成前 change 仍 active）
  - 混跑回退——thin change 上跑 run stage 族→flow-state 记 legacy_fallback，flow done 按厚档走
  - src/config-schema.js 注册 flow 键（thin|legacy 缺省 thin）+edit_ratio_threshold+edit_ratio_enforcement；.sillyspec/local.yaml.example 同步
  - src/index.js flow 命令分发（start/done/amend-draft 子命令+--json）
  - NEW test/flow-protocol.test.mjs——机械 harness 2 调用计数断言/恢复简报盘面三态/幂等重入/中断半态精确报告/legacy 零行为变化
acceptance:
  - 机械 harness 走通薄跑道，CLI 必需调用恰为 2（start+done）
  - 恢复场景新会话同命令从盘面状态生成恢复简报（checkbox/提交/账本/dirty files 三态注入）
  - 实测失败整单 FAIL exit 非 0 且不继续 distill/归档；中断重入从断点续不假绿
  - flow 配 legacy 后既有 run stage 族行为零变化
verify:
  - node --test test/flow-protocol.test.mjs
  - npm run lint
  - npm test
constraints:
  - 判定语义零改动（只复用 runQuickTestLintGate/consultTestLedger/recordTestLedger）
  - DB schema 不动（flow-state 落 yaml 文件）
  - 多活跃门对 flow start 不设限（自带 --change，多 change 并存合法）
  - watcher 事件收口只读 jsonl 不依赖 watcher 存活
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
