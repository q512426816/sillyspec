---
id: task-01
title: '账本模块（NEW:src/run/gate-snapshot-ledger.js）+ 幂等/TTL×pid 双闸/回收单测'
title_zh: '账本模块（NEW:src/run/gate-snapshot-ledger.js）+ 幂等/TTL×pid 双闸/回收单测'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-24 14:39:34
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-01, FR-04]
decision_ids: [D-003@v2, D-004@v2, D-005@v1]
allowed_paths:
  - src/run/gate-snapshot-ledger.js
  - test/gate-snapshot-lifecycle.test.mjs
target_files:
  - NEW:src/run/gate-snapshot-ledger.js
  - NEW:test/gate-snapshot-lifecycle.test.mjs
provides:
  - registerGateSnapshot / unregisterGateSnapshot / readGateSnapshotLedger / gateSnapshotLedgerPath
  - isSafeSnapshotRoot（路径守卫）/ isSafeLedgerEntry（条目结构守卫，删除原语唯一前置闸）
  - selectStaleSnapshots（纯判定）/ reclaimStaleGateSnapshots（回收执行）
goal: >
  新建门禁快照账本模块：create 登记 / cleanup 销账的幂等账本（runtime 域 JSON，原子写），
  外加 fail-closed 路径与条目双守卫、「TTL×pid 三态」纯判定、「目录+worktree 注册双清」回收
  执行（双清确认才销账）——为 task-03 接线与 task-04 doctor 维度提供唯一账本源与判定源。
implementation:
  - 先写测试：建 test/gate-snapshot-lifecycle.test.mjs，用例覆盖 ①同 root 幂等登记/销账 ②账本损坏退空数组 ③TTL×pid 三态真值表（成功=活/EPERM=活/ESRCH=死/无效 pid=活/探针 throw=活/staleHours 非法值回退 24h）④isSafeSnapshotRoot 路径守卫（合法 tmpdir 直接子目录过；非 sillyspec-gate-* 前缀、.. 嵌套、非直接子目录、绝对盘符外路径均拒）⑤isSafeLedgerEntry 结构守卫（pid 非正整数/非整数、createdAt 非有限数一律拒；结构非法时零删除原语调用）⑥回收双清（目录删+注册清）与双失败保留条目 ⑦runtimeRoot 缺失退 no-op
  - 新建 src/run/gate-snapshot-ledger.js：gateSnapshotLedgerPath/registerGateSnapshot/unregisterGateSnapshot/readGateSnapshotLedger，原子写复用 src/fs-atomic.js；register 同 root 幂等、unregister 缺失不抛、读取损坏退 []
  - 实现 isSafeSnapshotRoot(snapshotRoot)：path.resolve 后校验为 resolve(tmpdir()) 直接子目录 ∧ basename 匹配 /^sillyspec-gate-/ ∧ 无 .. 嵌套
  - 实现 isSafeLedgerEntry(entry)：isSafeSnapshotRoot(entry.snapshotRoot) ∧ Number.isInteger(entry.pid) ∧ entry.pid>0 ∧ Number.isFinite(entry.createdAt)；**selectStaleSnapshots 与 reclaimStaleGateSnapshots 均先过此守卫，不通过直接跳过（绝不调用删除原语）**
  - 实现 selectStaleSnapshots(entries,{now,staleHours,isProcessAlive}) 纯函数：守卫过滤 ∧ age>TTL ∧ 明确死（探针返回 false）才 stale；staleHours 非有限正数时回退 24（口径单一入口）
  - 实现 reclaimStaleGateSnapshots({runtimeRoot,cwd,now,staleHours,isProcessAlive})：逐条 git worktree remove --force → rmSync（maxRetries）→ git worktree prune；**双清确认（目录不存在 ∧ worktree list --porcelain 无该 root）后才 unregister**，否则计入 skipped 保留条目
  - 回收摘要返回 {reclaimed,skipped} 供调用方输出；内部异常一律吞（fail-open 退现状）
acceptance:
  - test/gate-snapshot-lifecycle.test.mjs 全绿（上述六组用例 ≥18 断言）
  - 篡改/损坏账本用例证明零 rmSync、零 git worktree remove 调用
  - 双失败（remove 失败 ∧ rmSync 失败）用例证明条目仍在账本且计入 skipped
  - npm run lint 绿（未引用导出 0；本模块导出均有单测或 task-03/04 消费）
verify:
  - node --test test/gate-snapshot-lifecycle.test.mjs
constraints:
  - 判定与时钟/pid 探针/路径/tmpdir 均可注入（单测禁依赖真实 %TEMP% 残留与真实 pid）
  - pid 探针语义从严：EPERM/无效/异常=活（破坏性场景，与 bg-sync 终止扫描口径有意分歧）
  - 禁新增运行时依赖（仅 Node 内置 + src/fs-atomic.js）
  - 异常 fail-open：账本/回收任一异常吞掉，绝不向上抛
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
