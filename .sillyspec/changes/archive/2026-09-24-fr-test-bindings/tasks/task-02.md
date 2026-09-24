---
id: task-02
title: 'sillyspec tests CLI：视图+唯一合法修理工'
title_zh: 'sillyspec tests CLI：视图+唯一合法修理工'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-24 12:35:27
priority: P0
depends_on: [task-01]
blocks: []
requirement_ids: [FR-06, FR-07]
decision_ids: [D-002@v1]
allowed_paths:
  - src/index.js
  - test/test-bindings.test.mjs
target_files: []
expects_from:
  - task-01 提供的 queryByAnchor/queryByChange/upsert/write API
goal: >
  注册 `sillyspec tests` 命令：--anchor/--change 只读视图 + --bind/--unbind 修理工
  （锚可解析+路径存在硬校验、confirmed_by=agent 留痕、原子写）——悬空硬错（另案）
  的配套修复通道，修理工自身不得制造悬空。
implementation:
  - src/index.js 注册 tests 命令：视图（--anchor <锚> / --change <名>）合并两真源表格输出
  - --bind --anchor <锚> --tests <p1,p2> [--reason spec|capability|regression]：锚解析（FR=活库 active 条目 / ql=QUICKLOG 在册）+ existsSync 路径硬校验，违者非零退出零写入
  - --unbind --anchor <锚> --tests <…> | --row-id <id>：定向删行，同款硬校验
  - 成功写入 confirmed_by=agent + confirmed_at=HEAD（gitQuiet rev-parse）
acceptance:
  - bind→view→unbind 端到端（fixture 仓）：bind 后行可查询且 confirmed_by=agent；unbind 后行消失
  - 锚不可解析（FR 不存在/CAP-xxx）与路径不存在 → 非零退出且零写入
  - 变更期局部锚（未铸全局的 FR-NN）拒绝修改（只读）
verify:
  - node --test test/test-bindings.test.mjs
  - npm run lint
constraints:
  - 修理工仅面向提升后行（全局锚）；不触碰 verify 跑集/披露（另案）
  - 输出人读表格，无 JSON sidecar（披露载体属读侧另案）
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
