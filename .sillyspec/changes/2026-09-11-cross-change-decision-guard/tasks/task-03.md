---
id: task-03
title: 'semantic-guard aggregation module: delivery attribution + assertion-rewrite detection + advisory render + switch'
title_zh: 'semantic-guard 聚合模块（归因/断言检测/渲染/开关）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-11 14:45:11
priority: P0
depends_on: ['task-02']
blocks: [task-05, task-06]
requirement_ids: [FR-03, FR-04]
decision_ids: [D-001@v1]
allowed_paths:
  - src/semantic-guard.js
  - test/semantic-guard.test.mjs
target_files:
  - NEW:src/semantic-guard.js
  - NEW:test/semantic-guard.test.mjs
expects_from:
  - task-02: matchDecisionsByFiles(indexDir, files) → { [file]: [{ id, title, status, reason, file }] }
provides:
  - collectRecentForeignDelivery({ cwd, files, currentChange, days }) → { [file]: changeName }（git log 提交信息变更名标记归因；无标记/仅本变更/失败 → 不记）
  - detectAssertionRewrites({ cwd, files }) → { [file]: sampleLines[] }（git diff HEAD -U0，纯新增 hunk 不算，封顶 5 行/文件）
  - renderSemanticGuardBlock({ specBase, cwd, candidateFiles, currentChange }) → string（零命中空串）
  - readSemanticGuardEnabled(specBase) → boolean（默认 true，读取失败 true）
goal: >
  新聚合模块承载 quick 语义护栏的全部无副作用逻辑：近因他者交付归因、断言重写检测、
  advisory 渲染、开关读取——被 run/prompt.js（task-05）与 run/quick-audit.js（task-06）
  两端消费。
implementation:
  - collectRecentForeignDelivery：每文件 safeGit log --since=7.days --format=%s -- <file>（封顶 20 文件），提交信息解析两类标记——/\d{4}-\d{2}-\d{2}-[a-z0-9][a-z0-9-]*/（变更名）与 /ql-\d{8}-\d{3}-[a-z0-9]{4}/（quicklog ID）；取最新非 currentChange 标记；git 失败 → {}
  - detectAssertionRewrites：测试文件判定（test/ 前缀或 *.test.*/*_test.* 命名）跑 git diff HEAD -U0 -- <file>（HEAD 对比非 index——quick step3 先暂存时序下裸 diff 恒空转，Grill X-001）；hunk 内删除侧（- 行）含断言 token（expect(/assert/t.equal/toBe/toEqual/strictEqual/should.）计数；纯新增 hunk（无 - 行）不算；输出样例行封顶 5/文件
  - renderSemanticGuardBlock：组合 matchDecisionsByFiles 决策命中（含 rejected 标注「已否决，勿复潮」）+ collectRecentForeignDelivery 交付归因 → advisory 文本段；两类均零命中 → ''（不留空段）
  - readSemanticGuardEnabled：local.yaml semantic_guard.enabled，默认 true；解析异常 → true（fail-open）
  - git 交互单测用真实临时仓 fixture（test/scope-audit.test.mjs:42+93 先例：mkdtemp + git init + 配 user + 提交）
acceptance:
  - 归因：变更名与 ql-ID 两类标记解析命中；本变更标记跳过；无标记提交不归因
  - 断言：既有断言行被改（- 行含 token）→ 命中；纯新增断言 hunk → 不算；非测试文件 → 不查；暂存后（git add）检测仍命中（HEAD 口径）
  - 渲染：仅决策命中 → 决策段；仅交付命中 → 交付段；双零 → ''
  - 开关：semantic_guard.enabled=false → 调用方零输出/零检测（本 task 测 readSemanticGuardEnabled 返回 false 路径）
  - git 不可用 → 全部降级空结果不抛
verify:
  - node --test test/semantic-guard.test.mjs
constraints:
  - 纯模块无 CLI 副作用：不 console（渲染返回字符串，输出留给消费端）、不写盘（除读取）
  - git 调用一律走 git-helper safeGit/gitQuiet 封装（Windows 路径/引号坑）
  - 不 import run/ 下模块（避免与 task-05/06 循环依赖）
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
