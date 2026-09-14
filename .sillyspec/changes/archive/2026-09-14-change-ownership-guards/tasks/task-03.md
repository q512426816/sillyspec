---
id: task-03
title: archive-gate-admission-filter-and-attribution-mode-switch
title_zh: '收口与归因——归档 checkOnly 门+放行相交过滤（两路径）+归因模式分流（DB 判源+终态空源空集）+complete-handlers 所有权两接线'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-14 20:00:04
priority: P0
depends_on: ['task-01', 'task-02']
blocks: []
requirement_ids: [FR-02, FR-03]
decision_ids: [D-001@v1, D-002@v1, D-003@v1, D-004@v1]
allowed_paths:
  - src/run/command.js
  - src/run/complete.js
  - src/worktree-apply.js
  - src/run/complete-handlers.js
  - src/task-review.js
  - test/worktree-apply-review-allowlist.test.mjs
target_files:
  - src/worktree-apply.js
  - src/run/complete-handlers.js
  - src/task-review.js
  - test/worktree-apply-review-allowlist.test.mjs
  - src/run/command.js
  - src/run/complete.js
expects_from:
  task-01:
    - contract: OwnershipData
      needs: [owner-session-column]
  task-02:
    - contract: OwnershipCheck
      needs: [assertChangeOwnership]
provides:
  - contract: ArchiveGateAndAttribution
    fields: [archive-apply-gate, admission-filter, attribution-mode-switch]
related_tests:
  - test/worktree-apply-review-allowlist.test.mjs
goal: >
  收口与归因——归档 checkOnly 门（未 apply 面阻断+--skip-apply 留痕）+complete-handlers 所有权两接线+reviewAdmittedFiles 放行相交过滤（主仓/跨仓两路径）+归因模式分流（DB 判源+终态空源空集）（FR-02/FR-03/D-001~004）。
implementation:
  - complete-handlers.js archive step3 归档移动前调 applyWorktree checkOnly 模式——未 apply 交付面非空阻断（错误信息含 apply 指引），--skip-apply 显式跳过并留痕；无 worktree/零交付面零行为变化
  - complete-handlers.js 所有权两接线——archive 归档移动前与 quick 轻量链 closeSingleQuickLinkedChange（行1503/1521 区域）前调 task-02 导出的 assertChangeOwnership（消费契约不重复实现）
  - worktree-apply.js reviewAdmittedFiles 相交过滤两路径——主仓（行1042-1058）与跨仓（行766）review 声明文件须与 allow 面相交（allow 面=design 清单∪各 task target_files/allowed_paths∪linked-change 声明），不相交文件剔除进 violations 报告行（含「review 声明了越权文件」嫌疑标注），相交文件放行如常
  - task-review.js 归因模式分流——判定源=changes.isolation_mode 列（DB，meta 缺失也可判，meta 在时交叉校验不一致以 DB 为准）；worktree 模式（含 meta 缺失但 DB 判 worktree 的回退态）归因一律取 worktree 分支 diff，in-place 维持主仓窗口；verify-postcheck.js 行1171-1182 回退路径同口径（DB 判 worktree 不落主仓窗口）
  - 分支 ref 已删终态（cleanup 后态）fail-closed 空集+「不可归因（worktree 已清理）」注记，绝不回退主仓窗口；isolation_mode 为 NULL 的存量变更按 meta 在场路由（meta 在随 meta，meta 缺随主仓窗口+注记）
  - test/worktree-apply-review-allowlist.test.mjs 用例 1（行96-99 未列文件→放行）断言随 D-003 语义翻转改写——外来文件改判进 violations 报告
acceptance:
  - worktree 有未 apply 交付面时归档阻断且错误含 apply 指引，--skip-apply 留痕放行，无交付面零变化
  - 归档移动前与 quick 轻量链 closeSingleQuickLinkedChange 前均过所有权校验（他人活跃 change 拒绝）
  - 外来声明文件剔除进 violations 报告；allow 面内文件（含 facade 转发类有据越界）不受影响
  - worktree 模式归因零依赖主仓脏窗口；分支已删终态=空集+注记；NULL 存量按 meta 路由
verify:
  - npm test
constraints:
  - 归档只拦不代跑（不自动串联 apply——脏重叠场景人确认更稳）
  - 所有权校验消费 task-02 契约不重复实现；放行通道保留作审计报告位（外来声明显式列出，admission 增量归零）
  - 存量态不追求完美只保安全——NULL 路由与终态空源均 fail-closed（R-04）
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
