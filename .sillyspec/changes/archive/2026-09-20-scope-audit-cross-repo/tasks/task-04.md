---
id: task-04
title: '测试——NEW:test/scope-audit-cross-repo.test.mjs（collectRepoActual 锚点四态真 git 夹具/跨仓行真实三态/degraded 四边界/单仓变更 --json 逐字节等价断言/双仓 e2e 三仓合并表）；test/scope-audit.test.mjs「改进点 2」两项断言按新形态更新；npm test 全量+lint'
title_zh: '测试——NEW:test/scope-audit-cross-repo.test.mjs（collectRepoActual 锚点四态真 git 夹具/跨仓行真实三态/degraded 四边界/单仓变更 --json 逐字节等价断言/双仓 e2e 三仓合并表）；test/scope-audit.test.mjs「改进点 2」两项断言按新形态更新；npm test 全量+lint'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-20 16:36:27
priority: P0
depends_on: ['task-02', 'task-03']
blocks: []
requirement_ids: [FR-01, FR-02, FR-03, FR-04, FR-05, FR-06]
decision_ids: [D-001@v1, D-002@v1]
allowed_paths:
  - test/scope-audit-cross-repo.test.mjs
  - test/scope-audit.test.mjs
target_files:
  - NEW:test/scope-audit-cross-repo.test.mjs
  - test/scope-audit.test.mjs
related_tests:
  - test/scope-audit.test.mjs
expects_from:
  - task-01: "collectRepoActual 四级锚点内核"
  - task-02: "rows 跨仓行真实三态+repos[] 信封+settled 快照语义"
  - task-03: "渲染 per-repo 汇总+getFileDiff 跨仓路由"
goal: >
  专项测试：collectRepoActual 锚点四态真 git 夹具、跨仓行真实三态、degraded 三类边界、
  单仓变更逐字节等价回归、双仓 e2e 三仓合并表；既有 scope-audit 测试「改进点 2」断言
  按新形态更新。
implementation:
  - 新建 test/scope-audit-cross-repo.test.mjs：真 git 夹具（主仓+两跨仓仓 local.yaml repos 注册）造 execute-runs reviews（base/head 区间 commit）/无 reviews B 档/单 commit 仓 C 档/坏仓三类 degraded；computeChangeScopeAudit --json 形态断言（rows 跨仓行/repos[] 信封/anchor 档）；单仓变更 JSON.stringify 逐字节等价断言；双仓 e2e 三仓合并表（AC-01）
  - test/scope-audit.test.mjs 「改进点 2」（:1337 ⊘ 标注/:1399 附近）与「改进点 3」断言按新形态更新：跨仓行从恒 ⊘ 改真实三态（行为升级——断言目标本就是「跨仓不恒 untouched」中间态）
  - npm test 全量 + npm run lint 回归
acceptance:
  - 新测试文件覆盖：内核锚点四态/跨仓行真实三态/degraded 三类边界/单仓逐字节等价/双仓 e2e（AC-01~AC-04 各有对应用例）
  - test/scope-audit.test.mjs 其余用例全绿（主仓行为零回归）
  - npm test 全量 exit 0 + lint 绿（AC-05）
verify:
  - npm test
  - npm run lint
constraints:
  - 夹具零 mock 网络/git 真实执行（仓内既有 e2e 测试同款 mkdtemp+git init 风格）
  - Windows 兼容（路径正斜杠归一断言；不依赖符号链接）
  - 非测试逻辑有误时禁改测试凑绿——修逻辑（AGENTS 规则 11）
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
