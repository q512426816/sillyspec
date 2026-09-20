---
id: task-02
title: 'src/scope-audit.js 集成——computeFullFlowAudit 非预执行分支：plannedEntries 按 repo 分组调内核，集成层 collectNumstatByPath 对该仓根+锚点采行数；跨仓行真实 verdict/additions/deletions/kind+crossRepo；degraded 仓退 ⊘ 形态+note；信封 repos[]（main 首位+anchor+三态计数，仅多仓非预执行输出）；settled 快照：新快照自动冻结、回放 return 增量透传 snap.repos、needsStats 补采跳过 crossRepo 行（防主仓根伪数据）、旧快照 ⊘+「冻结于跨仓对账上线前」注记；totals 含跨仓行'
title_zh: 'src/scope-audit.js 集成——computeFullFlowAudit 非预执行分支：plannedEntries 按 repo 分组调内核，集成层 collectNumstatByPath 对该仓根+锚点采行数；跨仓行真实 verdict/additions/deletions/kind+crossRepo；degraded 仓退 ⊘ 形态+note；信封 repos[]（main 首位+anchor+三态计数，仅多仓非预执行输出）；settled 快照：新快照自动冻结、回放 return 增量透传 snap.repos、needsStats 补采跳过 crossRepo 行（防主仓根伪数据）、旧快照 ⊘+「冻结于跨仓对账上线前」注记；totals 含跨仓行'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-20 16:36:27
priority: P0
depends_on: ['task-01']
blocks: []
requirement_ids: [FR-01, FR-03, FR-04, FR-06]
decision_ids: [D-001@v1, D-002@v1]
allowed_paths:
  - src/scope-audit.js
  - src/cross-repo-reconcile.js
target_files:
  - src/scope-audit.js
expects_from:
  - task-01: "collectRepoActual 返回 { repo, repoPath, anchor{source,base,head,label}, files, degradedReason }"
goal: >
  computeFullFlowAudit 非预执行分支集成共享内核：跨仓行真实三态+行数+crossRepo，
  信封 repos[]（main 首位，仅多仓非预执行输出），settled 快照回放透传+补采跳
  crossRepo 行——跨仓文件从恒 untouched 升级为按仓真实对账。
implementation:
  - src/scope-audit.js computeFullFlowAudit 非预执行分支：plannedEntries 按 .repo 字段分组（crossRepoKeys 现行汇总段 :1023-1027 处改造），每组调 collectRepoActual({repoKey, specBase:sb, cwd, runtimeRoot, changeName})
  - 集成层行数：collectNumstatByPath(该仓 repoPath, 该仓 files, { baseRef: anchor.base })（A/B 档；C 档 baseRef 缺 → 行数 null 降级档）；行数未命中 degradedStat 该仓根兜底
  - 跨仓三类差集：该仓 files × 该组声明面 pathMatches 双向容差 → 行级 {path,planned,additions,deletions,kind,verdict,crossRepo}；degraded 仓行退 ⊘ 形态（untouched+crossRepo）+降级注记进 note
  - 信封 repos[]：main 条目首位（anchor.source='main-<form>'、base=baseAnchor、totals 只计主仓行）+各跨仓仓条目（anchor/totals 三态计数/degraded/degradedReason）；仅计划侧含跨仓条目且非预执行时输出
  - settled 快照：回放两 return（src/scope-audit.js:949-963/:964-979）增量透传 snap.repos（旧快照无键不输出）；needsStats 补采（:934-947）跳过 crossRepo 行（防主仓根伪数据 {0,0,deleted}，G1）；旧快照跨仓行照旧 ⊘+note「快照冻结于跨仓对账上线前，跨仓段未对账」
  - totals 含跨仓行（多仓变更合计随真实化变化——现状恒 0/0 是失真）
acceptance:
  - 多仓变更跨仓行带真实 verdict/additions/deletions/kind+crossRepo，无恒 untouched 补行（degraded 仓除外）
  - repos[] 形状符合 design 接口定义（main 首位+anchor{source,base,head,label}+totals 三态计数）；单仓变更/预执行视图零新增字段
  - settled 回放：新快照 repos 透传；补采跳 crossRepo 行；旧快照 ⊘+注记
verify:
  - node --test test/scope-audit-cross-repo.test.mjs（集成用例，task-04 补全后全绿）
  - node --test test/scope-audit.test.mjs（主仓行为回归）
constraints:
  - 主仓行形状逐字段不变（additive 契约）；单仓变更 --json 与现状逐字节等价
  - 预执行形态（:761 三信号判定 return 路径）不调内核，跨仓行保持清单形态
  - buildFrozenPatch/patchSha256 链零改动（D-002@v1：patch 保持主仓单仓）
  - 全链 fail-soft：内核异常 → 跨仓组退 v1 ⊘ 形态+degradedReason，主仓表不受影响
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
