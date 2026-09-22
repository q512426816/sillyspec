---
id: task-02
title: 'Extract archive chain into reusable module'
title_zh: '归档执行链抽取为可导入函数'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-22 10:58:49
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-05, FR-07]
decision_ids: [D-003@v1, D-004@v1]
allowed_paths:
  - src/run/complete-handlers.js
  - test/archive-chain.test.mjs
target_files:
  - src/run/complete-handlers.js
  - NEW:test/archive-chain.test.mjs
provides:
  - contract: runArchiveChain
    fields: [changeDir, specBase, skipPlanCheck, archived]
goal: >
  把内联在 complete-handlers.js 640-722 的归档执行链抽为可导入函数，供 flow done 归档
  子步复用（纯搬运，既有 archive 流程零语义变化）。
implementation:
  - 读 src/run/complete-handlers.js 的 640-722 区段（apply 检查→plan.md 硬校验→目录搬移→unregisterChange→窄化 git add）
  - 抽为导出函数 runArchiveChain（参数含 skipPlanCheck——flow 薄工件面跳过 plan.md 硬校验的判据入口，本卡只留参数不接消费方）
  - 原调用点改为调新函数，行为逐字等价（纯搬运）
  - NEW test/archive-chain.test.mjs——函数可导入+skipPlanCheck 两态+冒烟
acceptance:
  - runArchiveChain 从 src/run/complete-handlers.js 可导入且原调用点行为不变
  - skipPlanCheck=true 跳过 plan.md 硬校验、false 走原校验（两态断言）
  - 既有 archive 流程测试族零回归
verify:
  - node --test test/archive-chain.test.mjs
  - npm test
constraints:
  - 纯搬运不改判定语义（plan.md 硬校验逻辑本身不动，只加旁路参数）
  - 不在本卡接 flow 消费方（task-03 接线）
  - 不动 unregisterChange/change-registry 语义
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
