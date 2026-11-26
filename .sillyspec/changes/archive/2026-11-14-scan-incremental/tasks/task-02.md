---
id: task-02
title: '增量计划计算层（基线锚/归属/篇章映射/对账/软门/quick 回退）+单测'
title_zh: '增量计划计算层（基线锚/归属/篇章映射/对账/软门/quick 回退）+单测'
author: 't'
generated_by: sillyspec-taskcard
created_at: 2026-11-14 22:24:55
priority: P0
depends_on: [task-01]
blocks: []
requirement_ids: [FR-01, FR-02, FR-04, FR-06]
decision_ids: ['D-007@v1', 'D-008@v1']
allowed_paths:
  - src/scan-incremental.js
  - test/scan-incremental.test.mjs
target_files:
  - NEW:src/scan-incremental.js
  - NEW:test/scan-incremental.test.mjs
expects_from:
  task-01:
    - contract: probeCodegraph
      needs: [available, reason, status]
    - contract: listIndexFiles
      needs: [path, language, nodeCount, size]
    - contract: affectedTests
      needs: [affectedTests, truncated]
provides:
  - contract: computeIncrementalPlan
    fields: [mode, reason, base, head, behindCommits, affectedModules, unmappedFiles, docsToRegenerate, docsToSkip, audit, affectedTests, guardDocs, warnings]
goal: >
  新建增量计划计算层：computeIncrementalPlan 把「基线..HEAD 变化集」换算成
  「受影响模块集 + 篇章重生成/跳过集 + _module-map 对账报告 + guard 白名单 + 软门回退判定」，
  秒级纯计算（git 只读 + codegraph 只读探测），供 scan 启动层与编排注入消费。
implementation:
  - 基线锚：读 specBase/docs/<projectName>/scan/ 下 SCAN_REQUIRED_DOCS 的 per-doc source_commit，聚合口径=落后最多（语义对齐 src/scan-diff.js:370-398 readSourceCommit，单源复用 parseSourceCommit/collectScope 等既有导出，不复制实现）；无基线 → mode:'full'
  - 变化集：git diff <base>..HEAD --name-status --find-renames（parseNameStatus 单源，src/scan-diff.js:447-464）；非祖先基线（merge-base --is-ancestor 失败）→ mode:'full' 留痕（语义对齐 scan-refresh 硬门②）
  - 归属：matchFilesToModules（src/docs-debt.js 单源）→ affectedModules + unmappedFiles；codegraph 可用时 unmapped 新文件的 import 归属线索（query 按文件名查符号→所属文件→模块匹配）仅作 hint 字段，不作归属结论（C3/D-unmapped-150）
  - 篇章影响映射：缺省 7 篇章全跳过；结构信号（module-map paths 差集触及模块边界/unmapped 新文件成新目录）→ STRUCTURE+ARCHITECTURE 入重生成；路由信号（受影响模块 entrypoints 引用文件命中变化集）→ INTEGRATIONS；证据不明确保守归入重生成集（宁多勿漏）
  - 对账：listIndexFiles 全量清单 × 单点排除常量（estimateSourceSize skipDirs 同源集合 + '.sillyspec-codegraph/' 前缀，src/run/scan-profile.js:28-37 为源集合）vs 全模块 paths 覆盖集 → uncoveredFiles/coverageRatio，写 docs/<projectName>/scan/_module-map-audit.md（frontmatter 含 source_commit=HEAD）
  - 软门：scope 内变更 >100 文件或落后 >200 commit（对齐 REFRESH_SOFT_GATE src/scan-refresh.js:41）→ mode:'full' 建议（forceIncremental=true 可越并在 warnings 留痕）；受影响文档含 scan_depth:quick → mode:'full'（D-007，与 refresh quick-depth 硬门同语义）
  - guardDocs 产出：docsToRegenerate + 受影响模块卡路径 + _module-map.yaml + _module-map-audit.md + _facts.md（POSIX 相对路径，供 task-03 guard 握手）
  - 单点排除常量导出（供 task-03 变化集过滤共用）；git 全失败 fail-soft mode:'full' 不抛（Review Focus #3）
  - 新建 test/scan-incremental.test.mjs：safeGit mock + task-01 探测 mock 注入——归属/篇章映射/对账/软门/quick 回退/绿地无基线/非 git 仓样本
acceptance:
  - computeIncrementalPlan 对绿地（无 scan 目录）/无基线（无 source_commit）/非祖先基线/软门超限/quick 深度/git 失败六类输入全部返回 mode:'full' + 中文 reason，零 throw（单测断言，Review Focus #3）
  - 归属与篇章映射：fixture 变更集（模块内 M 文件/模块边界 A 文件/新目录文件/路由文件）产出正确 affectedModules/docsToRegenerate/docsToSkip；unmapped 带 codegraph hint 但不入归属结论（单测）
  - 对账：含 '.sillyspec-codegraph/xx.js' 与 'node_modules/y.js' 的索引清单样本被排除常量过滤，uncoveredFiles 不含它们（单测，D-008/Review Focus）
  - 软门阈值 100/200 与 REFRESH_SOFT_GATE 同值；forceIncremental 越过后 warnings 留痕（单测）
verify:
  - node --test test/scan-incremental.test.mjs（按 test/ 目录既有 runner 形态）
constraints:
  - 纯计算层无终端渲染无状态写（对账报告与排除常量除外）；不做模块归属语义决策（C3）
  - 复用单源：parseSourceCommit/parseNameStatus/matchFilesToModules/collectScope——禁止复制实现双写
  - 不改 scan-refresh/scan-diff 行为（D-001）；增量判定秒级（git diff 一次 + 内存映射）
  - 文案中文
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
