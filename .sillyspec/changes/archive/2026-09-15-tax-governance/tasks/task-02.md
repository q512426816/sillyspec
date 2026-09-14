---
id: task-02
title: '台账+税面——complete.js 两处 consume 主滚动 + complete-handlers.js prune 兜底 + doctor-diagnostics.js self_maintenance_tax 维度 + NEW:test/tax-governance-ledger.test.mjs'
title_zh: '台账+税面——complete.js 两处 consume 主滚动 + complete-handlers.js prune 兜底 + doctor-diagnostics.js self_maintenance_tax 维度 + NEW:test/tax-governance-ledger.test.mjs'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-15 01:20:32
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-02, FR-03]
decision_ids: [D-001@v1, D-001@v2]
allowed_paths:
  - src/friction-ledger.js
  - src/run/complete.js
  - src/run/complete-handlers.js
  - src/doctor-diagnostics.js
  - test/tax-governance-ledger.test.mjs
target_files:
  - NEW:src/friction-ledger.js
  - src/run/complete.js
  - src/run/complete-handlers.js
  - src/doctor-diagnostics.js
  - NEW:test/tax-governance-ledger.test.mjs
goal: >
  摩擦历史不再归档即失忆——verify 收尾 consume 后按 change 滚动合并进 friction-ledger.json
  幸存台账（prune 兜底残余并落 archivedAt），doctor 新增自维护税面维度做聚合展示与阈值
  提示——「哪个变更税重」从回忆变成可查数据（FR-02 台账 + FR-03 税面）。
implementation:
  - 新建 src/friction-ledger.js 台账纯函数载体——readFrictionLedger（文件缺失/坏 JSON 按空数组起的容忍立场）/mergeFrictionEntry（merge-by-change——同 change 已有条目按类型累加合并非双计，verify 可 --reopen 重跑）/rollLedger（≤200 条掐头留最新）；台账文件为 runtimeRoot 下 friction-ledger.json，runtimeRoot 经 run/shared.js 的 resolveRuntimeRoot 同源解析（X-08 平台模式防分裂）；读改写包 withFileLock + writeAtomicSync（锁先例 friction-tally.js :180-193）；条目结构 {change, archivedAt 可选, counts 三类型计数, total}（design 接口定义，counts 含 gate_rollback/verify_run_failed/review_rejected）
  - 测试先行（AGENTS 规则 5）落 test/tax-governance-ledger.test.mjs——merge-by-change（reopen 双 consume 合并为一）、上限掐头（>200 留最新）、坏文件空数组起、空 counts 跳过写、prune 落 archivedAt+ledgerAppend、doctor 维度渲染（活跃+聚合+阈值+无台账四态）
  - src/run/complete.js 两处 verify 收尾（consume 点 :679/:1548）——consumeFrictionHint 返回 counts 后调用台账滚动 merge 进主账；空 counts 跳过写（防干净收尾落空条目/空文件）；archivedAt 此时不落（prune 侧落定）；台账写失败 fail-soft 包 try/catch 不阻断收尾（同 :681 先例）
  - quick 第三 consume 点 complete-handlers.js :1677 明确不动——tally 在 quick-sessions 树 session 目录随即删除，语义属会话内摩擦非变更级（plan-review gap 已裁决）
  - src/run/complete-handlers.js pruneArchivedChangeRuntime（:168）兜底——删 tally 前读残余 events[type].count（tally 结构 events 内 type 各含 count/lastAt，无 counts 字段——X-10）merge 进同 change 条目并落 archivedAt；返回值 additive 扩为 {ok, removed, ledgerAppend}（:166 JSDoc 同步）；全路径 fail-open 不抛
  - src/doctor-diagnostics.js 新维度 self_maintenance_tax——dimensions 数组（:1080）additive push；活跃非零 tally 列示 + 近 90 天 top5 + 累计总量聚合走 pass:true 纯信息（不拉低 overall_status），仅单变更 total≥3 记 WARNING（刻意——税重提示本就该拉状态，X-07）；台账缺失渲染「无台账数据」不告警；读 tally/台账两侧 runtimeRoot 同源 resolveRuntimeRoot
  - 编辑前 git log -1 + git diff 核对 complete.js/complete-handlers.js 最新态（收尾链是并行会话热点区，AGENTS 规则 16）
acceptance:
  - 构造非零 tally 走 complete verify 收尾 consume 路径——台账按 change merge 正确落盘；同 change --reopen 重跑二次 consume 合并非双计（merge-by-change）
  - 台账超 200 条掐头留最新；坏台账文件按空数组起不抛；空 counts 跳过写不落空条目
  - 台账读写任何失败 fail-soft——不阻断 verify 收尾/归档/doctor（红线）
  - prune 兜底——归档时残余 tally merge 进台账且条目落 archivedAt；返回值含 ledgerAppend，既有 {ok, removed} 消费方不受影响
  - doctor self_maintenance_tax 四态——活跃非零 tally 列示、聚合（近 90 天 top5+累计总量）、单变更 total≥3 记 WARNING、台账缺失渲染「无台账数据」不告警；聚合展示 pass:true 不拉低 overall_status
  - 台账只落 .runtime 树内永不落 changes/（隐私红线同 tally）
verify:
  - node test/tax-governance-ledger.test.mjs
  - npm run lint
constraints:
  - 不越 allowed_paths——quick 第三 consume 点 complete-handlers.js :1677 不入台账（明确不动）；friction-tally.js 埋点与既有行为零改动
  - fail-soft 红线——台账写失败不阻断任何收尾/归档/doctor 路径
  - 隐私红线——台账只落 .runtime 永不落 changes/；doctor 侧只读不写
  - prune 返回值 additive——不破坏既有 {ok, removed} 契约；dimensions 数组 additive 不动既有维度
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
