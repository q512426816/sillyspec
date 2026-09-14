---
id: task-04
title: 'apply-conflict-hardening-tests-and-module-card-sync'
title_zh: '测试与模块卡——apply-conflict-hardening 集成测试（四块）+ worktree/change-management/core-engine 三卡同步'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-14 14:05:33
priority: P1
depends_on: ['task-01', 'task-02', 'task-03']
blocks: []
requirement_ids: [FR-01, FR-02, FR-03, FR-04]
decision_ids: [D-001@v1, D-002@v1, D-005@v1]
allowed_paths:
  - test/worktree-apply-rescue.test.mjs
  - test/apply-conflict-hardening.test.mjs
  - .sillyspec/docs/sillyspec/modules/worktree.md
  - .sillyspec/docs/sillyspec/modules/change-management.md
  - .sillyspec/docs/sillyspec/modules/core-engine.md
target_files:
  - NEW:test/apply-conflict-hardening.test.mjs
  - .sillyspec/docs/sillyspec/modules/worktree.md
  - .sillyspec/docs/sillyspec/modules/change-management.md
  - .sillyspec/docs/sillyspec/modules/core-engine.md
expects_from:
  task-01:
    - contract: ApplyManifest
      needs: [writeApplyManifest]
  task-02:
    - contract: GuardOverlapCheck
      needs: [collectActiveQuickGuardFiles, overlap-result]
  task-03:
    - contract: DoctorManifestCheck
      needs: [drift-check-item]
goal: >
  测试与文档收尾——新建 test/apply-conflict-hardening.test.mjs 集成测试四块（真 git 临时仓不 mock git）覆盖 merge 写回 staged/manifest 生成与篡改检测/guard 相交四态/rescue 文案，worktree/change-management/core-engine 三模块卡按各自格式登记本变更加点（FR-01~04 全收口）。
implementation:
  - 新建集成测试四块——①merge 写回后 staged 断言（git diff --cached 名单含该批全部写回文件，含新增）②manifest 生成与篡改检测（apply 后 manifest 存在且 sha256 对 staged 一致；改一字节后真跑 doctor 检查项断言漂移告警）③guard 相交四态（空集零变化/CLI exit 1 带会话×文件对清单/--force 放行留 overlapForced 痕/autoApply 软跳过+warning）④rescue 文案含 git add 锁定指引行
  - 测试形态用真 git 临时 init 仓（仓内既有 e2e 先例），不 mock git（R-04）；清理走 finally 保 Windows 兼容
  - 三模块卡按各自格式登记（裸路径+符号名——主仓无 apply 后锚点空窗先例）——worktree.md 记写回收口+三出口 manifest+相交拦截；change-management.md 记 collectActiveQuickGuardFiles 导出；core-engine.md 记 doctor 漂移检查项
acceptance:
  - npm test 全绿（四块测试全过）且既有 apply/doctor/quicklog 相关测试零回归
  - 三模块卡各自含本变更登记条目，docs check --paths 三卡全过
verify:
  - npm test && npm run lint
  - node src/index.js docs check --paths .sillyspec/docs/sillyspec/modules/worktree.md,.sillyspec/docs/sillyspec/modules/change-management.md,.sillyspec/docs/sillyspec/modules/core-engine.md
related_tests:
  - path: test/worktree-apply-rescue.test.mjs
    reason: task-01 rescue 输出新增 # 指引行致 A1/A2/A4 commands.length 精确计数断言失效（预期契约变更 fallout）——改为过滤 # 注释行后计数
constraints:
  - 测试不 mock git；不动其他模块卡（只登记三张涉改卡）
  - 本 task 只写测试与模块卡——发现 src 实现缺陷回对应 task 修，不在此打补丁
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
