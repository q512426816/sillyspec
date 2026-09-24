---
id: task-01
title: '锚点集+残差计算+悬空硬错'
title_zh: '锚点集+残差计算+悬空硬错'
priority: P0
depends_on: []
blocks: [task-02, task-03, task-05]
requirement_ids: [FR-01, FR-02, FR-05]
decision_ids: [D-001@v1, D-004@v1]
allowed_paths:
  - src/verify-postcheck.js
  - src/test-bindings.js
  - test/verify-trace-residual.test.mjs
target_files:
  - NEW:test/verify-trace-residual.test.mjs
provides:
  - contract: 锚点集与残差计算
    fields: [anchors, rows, files, dangling]
goal: >
  verify 门的 trace 消费入口：解析锚点集（task 卡 requirement_ids 并集）、过滤
  active 行算残差文件集、门入口悬空 fail-fast（先于任何执行，不烧墙钟再拦）。
implementation:
  - src/verify-postcheck.js 增 resolveVerifyAnchorSet({specBase, changeName})：扫 tasks 目录 frontmatter requirement_ids 并集（fail-open 空）
  - 增 resolveTraceResidual({specBase, changeName, cwd})：readChangeTrace 过滤（anchor 命中+state=active+status 非 superseded；orphan/candidate 不进）得 anchors/rows/files/dangling（dangling=tests 相对 cwd 缺失清单）
  - runVerifyTestCheck 入口：dangling 非空直接返回 failed 硬拦，reason 含缺失清单与 sillyspec tests --unbind 修复指引
acceptance:
  - active+锚命中行进残差；candidate/orphan/superseded 行不进（fixture 直测）
  - dangling 非空 failed 且零执行（不启动测试进程）
  - 无 tasks 目录/无 trace → 锚点集空残差空（fail-open）
verify:
  - node --test test/verify-trace-residual.test.mjs
  - npm run lint
constraints:
  - 不改 decideVerifyTestAction 与既有执行分支
  - 悬空检查先于任何测试执行
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
