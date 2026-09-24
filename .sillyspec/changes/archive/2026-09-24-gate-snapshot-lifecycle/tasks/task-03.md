---
id: task-03
title: 'create 前 best-effort 回收接线 + create/cleanup/失败三路径账本登记销账'
title_zh: 'create 前 best-effort 回收接线 + create/cleanup/失败三路径账本登记销账'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-24 14:39:34
priority: P0
depends_on: [task-01, task-02]
blocks: []
requirement_ids: [FR-01, FR-02, FR-04]
decision_ids: [D-002@v1, D-003@v2, D-004@v2, D-006@v1]
allowed_paths:
  - src/run/gate-snapshot.js
  - src/run/quick-audit.js
  - test/gate-snapshot-lifecycle.test.mjs
target_files:
  - src/run/gate-snapshot.js
  - src/run/quick-audit.js
  - NEW:test/gate-snapshot-lifecycle.test.mjs
expects_from: [task-01, task-02]
goal: >
  接线生命周期：runtimeRoot 显式透传（D-006@v1）+ 建快照前 best-effort 回收（D-002@v1，
  空结果零输出）+ create 登记与 cleanup/失败 catch「双清确认后」销账（D-004@v2）——崩溃残留
  24h 内自愈，成功路径逐字节不变。
implementation:
  - src/run/gate-snapshot.js createGateSnapshot 签名加 runtimeRoot = null 形参；账本链路在 null 时退 no-op（禁从 cwd 拼路径）
  - src/run/quick-audit.js createGateSnapshot 调用点（src/run/quick-audit.js:539-540）按 test-ledger 既有先例（同文件 557-559）算 resolveRuntimeRoot(null, specBase) 并传入
  - createVerifyGateSnapshot（src/run/gate-snapshot.js:738-754）已内部持有 resolveRuntimeRoot(platformOpts, specBase)，直接下传（gates.js 零改动）
  - worktree add 成功后 registerGateSnapshot；建快照入口（worktree add 之前）调 reclaimStaleGateSnapshots，全 try/catch 恒吞，**仅 reclaimed.length>0 时输出一行摘要**（空结果零输出保逐字节不变）
  - cleanup 闭包（task-02 抽出的 cleanupSnapshot 外层）按返回的 {dirRemoved, worktreeCleaned} 双清确认才 unregisterGateSnapshot；未确认则保留条目
  - 基建失败 catch 分支（src/run/gate-snapshot.js:607-613）同样「先尝试清理、双清确认才销账」
  - 测试补：①接线源文本钉（runtimeRoot 形参/quick 调用点透传/create 前回收调用/双清确认后销账接线）②真实临时仓集成用例（mkdtemp+git init 范式）：create→cleanup 全程后账本归零、目录与注册双清 ③真实子进程 kill 场景：建快照后杀进程，账本/目录/注册俱在，下个 create 触发回收 ④活跃条目（pid 活/age 小/无效 pid）零回收 ⑤无泄漏账本时 create 输出与基线逐字一致
acceptance:
  - 集成用例绿：create→cleanup 账本归零且 worktree list 无残留注册
  - 真实 kill 自愈用例绿：被杀后账本留条目→下个 create 回收并销号
  - 活跃/无效 pid 零回收用例绿；篡改条目零删除用例绿（task-01 守卫）
  - 正常路径（reclaimed 空）create 输出逐字节不变
  - quick/verify 门禁既有路径零回归 + lint 绿
verify:
  - node --test test/gate-snapshot-lifecycle.test.mjs test/verify-gate-snapshot.test.mjs
constraints:
  - 回收/账本异常绝不阻断建快照（try/catch 全吞，fail-open 退现状）
  - 禁从 cwd 猜 runtimeRoot；quick-audit.js 改动仅限调用点传参一行（不碰门禁判定逻辑）
  - 不改门禁判定语义、血统三态与信任边界；env 名固定 SILLYSPEC_GATE_SNAPSHOT_STALE_HOURS
  - 集成用例用临时仓与注入 runtimeRoot，禁依赖真实 %TEMP% 既有残留
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
     implementation/acceptance 里的源码位置同样写仓根相对全路径+行号（src/foo.js:<行号>）——
                    裸文件名在 docs-check 层1 靠 basename 全仓扫描找候选，找不到候选或关键词
                    窗口不匹配即失效，到 pre-push 才拦（2026-09-19 实证 64 处返工）。
     可选字段按需插进上方 frontmatter（规则见 taskcard-rules）：
     repo:          仅跨仓 task 填（local.yaml repos: 注册的仓 key；缺省=main。allowed_paths 相对该仓根写，
                    禁止带仓库名前缀/绝对路径——review 对账按仓根相对路径匹配，带前缀永不命中）
     provides:      仅当本 task 给其他 task 提供接口/DTO/响应时填
     expects_from:  仅当本 task 消费其他 task 的契约时填
     related_tests: 仅当本 task 改动导致既有测试断言失效时填（测试路径须同时进 allowed_paths） -->
