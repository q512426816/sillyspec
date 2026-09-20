---
id: task-01
title: 'src/cross-repo-reconcile.js 抽共享采集内核 `collectRepoActual({repoKey, specBase, cwd, runtimeRoot, changeName})`——仓注册解析→仓根→锚点四级（reviews-range[resolveLatestExecuteRunIdWithTasks+readReview 按 repo 切片，diffPaths 收窄，区间并集∪status] > head~1-window > head-uncommitted-window > degraded 三类判据[未注册/路径不可达/git 双源失败合并]）→actual 文件集（行数采集不进内核防循环 import）；`reconcileCrossRepoDeclarations` 重构为消费内核（签名增量可选 {runtimeRoot, changeName} 喂 A 档，声明差集与既有字段形状不动，增量 anchor 字段）+ 既有 verify 侧测试回归'
title_zh: 'src/cross-repo-reconcile.js 抽共享采集内核 `collectRepoActual({repoKey, specBase, cwd, runtimeRoot, changeName})`——仓注册解析→仓根→锚点四级（reviews-range[resolveLatestExecuteRunIdWithTasks+readReview 按 repo 切片，diffPaths 收窄，区间并集∪status] > head~1-window > head-uncommitted-window > degraded 三类判据[未注册/路径不可达/git 双源失败合并]）→actual 文件集（行数采集不进内核防循环 import）；`reconcileCrossRepoDeclarations` 重构为消费内核（签名增量可选 {runtimeRoot, changeName} 喂 A 档，声明差集与既有字段形状不动，增量 anchor 字段）+ 既有 verify 侧测试回归'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-20 16:36:27
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-02, FR-07]
decision_ids: [D-001@v1]
allowed_paths:
  - src/cross-repo-reconcile.js
  - test/scope-audit-cross-repo.test.mjs
target_files:
  - src/cross-repo-reconcile.js
provides:
  - collectRepoActual: "per-repo 采集内核——返回 { repo, repoPath, anchor{source,base,head,label}, files, degradedReason }；anchor.source ∈ reviews-range|head~1-window|head-uncommitted-window|degraded"
goal: >
  从 cross-repo-reconcile 抽共享采集内核 collectRepoActual（锚点四级：reviews-range >
  head~1-window > head-uncommitted-window > degraded），reconcileCrossRepoDeclarations
  重构为消费内核（锚点分级升级，声明差集与既有字段形状不动）——scope-audit 与 verify
  双侧单一真相源，防口径漂移（D-001@v1）。
implementation:
  - src/cross-repo-reconcile.js 新增导出 collectRepoActual({repoKey,specBase,cwd,runtimeRoot,changeName})：仓注册解析（parseRepoRegistry 同源）→仓根（isAbsolute/resolve）→锚点四级判定
  - A 档 reviews-range：resolveLatestExecuteRunIdWithTasks({runtimeRoot,changeName})（src/task-review.js:946）→ readReview 逐 task 按 review.repo===repoKey 切片 → git diff --name-only base..head（有 diffPaths 按其收窄）求并集 ∪ status porcelain untracked；anchor.base=最早 base、head=最晚 head
  - B 档 head~1-window（无可用 reviews）：diff HEAD~1..HEAD ∪ status（现行 reconcile 口径）；C 档 head-uncommitted-window（HEAD~1 不可得）：仅 status；degraded 三类判据：未注册/路径不可达/git 双源失败合并（G4 定稿，不拆「非 git 仓」）
  - reconcileCrossRepoDeclarations 重构为消费内核：签名增量可选 {runtimeRoot,changeName}（缺省 null 跳 A 档向后兼容），既有 matched/missing/undeclared/scaffoldCount/degradedReason 字段形状不动，增量 anchor 字段
  - 行数采集不进内核（G3：内核不 import scope-audit 防循环 import）——stats 由调用方对产物跑 collectNumstatByPath
acceptance:
  - collectRepoActual 四级锚点各自就位：reviews-range（reviews base..head 区间并集+diffPaths 收窄）/head~1-window/head-uncommitted-window/degraded 三类判据文案
  - reconcileCrossRepoDeclarations 既有字段形状零变化（verify 侧消费点 src/verify-postcheck.js:2918 无感），增量 anchor 字段可读
  - 内核纯读 fail-soft：单仓异常 catch 并入 degradedReason 不炸整体
verify:
  - node --test test/scope-audit-cross-repo.test.mjs（内核锚点四态用例，task-04 补全后全绿）
  - npm test（verify 侧 cross-repo-reconcile 既有测试回归）
constraints:
  - 不改 reconcileCrossRepoDeclarations 既有字段形状（verify 侧消费点零改动兼容）
  - 内核不 import src/scope-audit.js（循环 import 禁令，G3）
  - 路径归一/大小写折叠沿现行 normalizeRepoPath/pathKey 本地实现，不另造口径
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
