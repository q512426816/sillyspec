---
id: task-01
title: 'commands.smoke 配置登记 + quality-scan 亲跑执行段（300s 帽/快照超时回退主仓/指纹含新键/实测记录 smoke 面/回执记录落盘）'
title_zh: 'commands.smoke 配置登记 + quality-scan 亲跑执行段（300s 帽/快照超时回退主仓/指纹含新键/实测记录 smoke 面/回执记录落盘）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-17 22:06:55
priority: P0
depends_on: []
blocks: ['task-02']
requirement_ids: [FR-01]
decision_ids: [D-001@v1, D-010@v1]
allowed_paths:
  - src/config-schema.js
  - src/run/verify-quality-scan.js
target_files:
  - src/config-schema.js
  - src/run/verify-quality-scan.js
provides:
  - contract: smoke-exec-record
    fields: [smokeExit, smokeLog, smokeRanSource]
goal: |
  登记 commands.smoke 配置键并在 quality-scan 实测段增加 CLI 亲跑执行段（300s 超时帽／快照内超时回退主仓复跑一次／失败记失败态非崩溃），
  指纹自动含新键、实测记录 additive smoke 段、回执 log 实录落盘——补上运行时验证的机械执行地板（design §1，FR-01）。
implementation: |
  1. src/config-schema.js :65-75 commands 段 keys 数组登记 commands.smoke 键（type string／optional true／status live，readers 含 executeVerifyQualityScan (src/run/verify-quality-scan.js)，desc 注明 verify 阶段 CLI 亲跑、300s 超时帽、失败记失败态不阻断本步，example 如 node scripts/smoke.mjs）——与 test/lint/install 同信任级，detect 不自动写、缺省零行为变化。
  2. src/run/verify-quality-scan.js executeVerifyQualityScan（:266-338 实测段，与 commands.test 同段亲测对账）增 smoke 亲跑：local.yaml 配置 commands.smoke 且非 unavailable 时执行（unavailable／未配置口径对齐 coverage 先例 :191-192，执行段休眠）。spawnSync shell 跑、cwd=gateCwd（隔离快照内）、timeout 300_000（gate-snapshot.js :243 先例同款帽）。
  3. 快照内超时 → 回退主仓 cwd 复跑一次（lint 快照超时回退先例 :296-301 同款策略——junction I/O 病态慢时保实测不假败）；复跑仍超时／非零 exit → smokeResult 记失败态——不 throw（封顶信号非崩溃，与 test failed 的 throw 语义刻意区分，封顶消费归 task-03 第五条件）。
  4. 回执记录落盘：stdout/stderr tee 实录写 .runtime/verify-logs/smoke-<change>.log（mkdirSync recursive + 写盘，跨平台 path.join）。
  5. storeQualityScan 实测记录 additive smokeResult 段——{ status, exitCode, logPath, ranAt, durationMs, source: 'cli-noai-smoke' }；RECORD_SCHEMA_VERSION 保持 1 不变（additive 兼容：存量记录无 smoke 段照常读回）；loadReusableQualityScan 复用条件不动（只判 testResult，smoke 段随整条记录复用）。
  6. 指纹零改动核对：computeQualityScanFingerprint（:63-86）已哈希 commands 段原文——配置 smoke 后指纹自动变化、代码未变时复用不重跑（FR-01 第二条款）；本步骤零代码改动，仅核对确认。
acceptance: |
  - 配置 commands.smoke → verify 质量扫描步亲跑：.runtime/verify-quality-scan-<change>.json 新增 additive smokeResult 段（exitCode/logPath/ranAt/source='cli-noai-smoke'），log 实录落 .runtime/verify-logs/smoke-<change>.log
  - 快照内超时 → 主仓复跑一次；仍超时／非零 exit → smokeResult=failed 且质量扫描步不因此 throw（失败态非崩溃，test 全绿时步骤照常完成）
  - 指纹自动含新键：配置 smoke 前后指纹不同（commands 段原文入哈希）；代码未变重跑 → loadReusableQualityScan 复用含 smoke 段的上次记录不重跑
  - 未配置或值 unavailable → 执行段零行为、记录 json 无 smoke 段（存量行为不变，FR-01 第三条款）
  - npm test 全量通过（既有用例零回归）；npm run lint 通过
verify:
  - npm test
  - npm run lint
constraints: |
  - 本 task 不新增／修改测试文件——测试面统一归 task-07（NEW test/smoke-gate.test.mjs，plan 任务总表划界）
  - smoke 失败只记失败态不 throw（不改变 test/lint 既有阻断语义；封顶消费归 task-03）
  - RECORD_SCHEMA_VERSION 不变、smokeResult 为 additive 字段（schemaVersion 1 兼容；不碰 facts schemaVersion 与结论枚举——全局硬约束 4）
  - 零新依赖、纯 JavaScript ESM、Node >= 22.13（全局硬约束 1/2）；spawnSync shell 执行兼容 Windows/Linux/macOS、路径 path.join、CRLF/LF 容忍（全局硬约束 6）
  - verify-result.md 回执槽机器段注入归 task-02——本 task 只落 .runtime 记录面（record json + verify-logs log）
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
