---
id: task-04
title: 'doctor 泄漏维度 detectGateSnapshotLeak（warning 级，阈值 env/24h，零新增参数面）+ 单测'
title_zh: 'doctor 泄漏维度 detectGateSnapshotLeak（warning 级，阈值 env/24h，零新增参数面）+ 单测'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-24 14:39:34
priority: P1
depends_on: [task-01, task-03]
blocks: []
requirement_ids: [FR-03]
decision_ids: [D-001@v1, D-007@v1]
allowed_paths:
  - src/doctor-diagnostics.js
  - test/gate-snapshot-lifecycle.test.mjs
target_files:
  - src/doctor-diagnostics.js
  - NEW:test/gate-snapshot-lifecycle.test.mjs
goal: >
  doctor 增「门禁快照泄漏」维度（warning 级、零修复、零新增参数面）：让残留从静默攒变为可见
  可查；阈值与 create 前扫共用 env/24h 单源（D-007@v1——顶层 doctor 实际无 --stale-hours
  参数解析，原表述与代码事实不符已修正）。
implementation:
  - src/doctor-diagnostics.js 新增 detectGateSnapshotLeak({runtimeRoot,now,staleHours,isProcessAlive})：复用 task-01 readGateSnapshotLedger + selectStaleSnapshots，返回 {status:'ok'|'leak', leaked:[{root,ageHours}]}；runtimeRoot 缺失/账本损坏退 ok
  - 维度适配层：按既有 runDoctorDiagnostics.dimensions 契约输出 name='gate_snapshot_leak'、label='门禁快照泄漏'、pass=(leaked.length===0)、leak 时 severity=CHECK_SEVERITY.WARNING、findings 展开 root+账龄、safe_actions=[]；追加在末尾保持既有维度相对顺序
  - staleHours 读取与 create 前扫同一单源（SILLYSPEC_GATE_SNAPSHOT_STALE_HOURS，缺省 24；doctor-diagnostics 侧不新增 CLI 参数）
  - 单测补：三态（ok / leak 多条含 root+账龄 / 账本损坏退 ok），注入 runtimeRoot 与时钟
acceptance:
  - doctor 族测试零回归（既有维度顺序与输出逐字不变）
  - 三态单测绿；leak 输出含 root 与账龄且 severity=WARNING 不阻断
  - lint 绿
verify:
  - node --test test/gate-snapshot-lifecycle.test.mjs
constraints:
  - warning 级不阻断、零修复；不新增 CLI 参数面（阈值走 env/24h）
  - 不改既有维度判定与相对顺序；runtimeRoot 缺失退 ok（fail-open）
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
