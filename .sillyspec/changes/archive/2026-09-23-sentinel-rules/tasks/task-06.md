---
id: task-06
title: 'Sentinel test suite and module-map registration'
title_zh: '测试交付+module-map 登记+全量门（收尾门卡）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-23 00:36:34
priority: P0
depends_on: [task-01, task-02, task-03, task-04, task-05]
blocks: []
requirement_ids: [FR-01, FR-02, FR-03, FR-04, FR-05, FR-06, FR-07, FR-08, FR-09]
decision_ids: [D-001@v1, D-002@v1, D-003@v1, D-004@v1, D-005@v1, D-006@v1]
allowed_paths:
  - test/sentinel-rules.test.mjs
  - .sillyspec/docs/sillyspec/modules/_module-map.yaml
target_files:
  - NEW:test/sentinel-rules.test.mjs
  - .sillyspec/docs/sillyspec/modules/_module-map.yaml
goal: >
  验收面交付：NEW test/sentinel-rules.test.mjs 纯函数 fixture 测试（四规则正负例+三态+
  回补幂等+事件形态+token 边界钉），module-map sync 模块补录 src/sentinel-assertions.js；
  lint+全量 npm test 绿。
implementation:
  - NEW test/sentinel-rules.test.mjs：R1 正（翻格零证据→warning rule=fake-check）负×2（commit subject 含 task-NN / review mtime 变更）；R2 正（FAIL→新测试脏→PASS→warning）负×2（无测试改动 / src-only 改动）；R3 正（声明外脏文件→warning）负×2（面内 / 无声明面跳过）+去重钉；R4 正负（early 21/19min、execute 16/14min）+episode 去重+活动复位；三态×3+token 边界+无 id 行；回补幂等（同水位二次零事件）+水位缺失全新启动+backfill/provisional 标记
  - 快照 fixture 直构对象（不跑真 git）；L0 的 review 探测注入 listReviewsImpl
  - .sillyspec/docs/sillyspec/modules/_module-map.yaml sync 模块 paths 增 src/sentinel-assertions.js
acceptance:
  - node --test test/sentinel-rules.test.mjs 全绿（≥1 正 ≥1 负 per 规则）
  - 既有 test/watcher.test.mjs 零改动零回归
  - npm run lint 绿；npm test 全量绿
  - module-map 含 sentinel-assertions.js（sync 模块 paths）
verify:
  - node --test test/sentinel-rules.test.mjs
  - npm run lint
  - npm test
constraints:
  - 测试零 CLI 依赖零真 git（纯函数直测——快照 fixture 注入面是 task-01 契约）
  - 不改既有测试文件（watcher.test.mjs 零回归是验收钉）
  - 测试环境双模式纪律（knowledge：env 敏感测试须可注入/可跳过）
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
     implementation/acceptance 里的源码位置同样写仓根相对全路径+行号（src/<file>.js:<行号>）——
                    裸文件名在 docs-check 层1 靠 basename 全仓扫描找候选，找不到候选或关键词
                    窗口不匹配即失效，到 pre-push 才拦（2026-09-19 实证 64 处返工）。
     可选字段按需插进上方 frontmatter（规则见 taskcard-rules）：
     repo:          仅跨仓 task 填（local.yaml repos: 注册的仓 key；缺省=main。allowed_paths 相对该仓根写，
                    禁止带仓库名前缀/绝对路径——review 对账按仓根相对路径匹配，带前缀永不命中）
     provides:      仅当本 task 给其他 task 提供接口/DTO/响应时填
     expects_from:  仅当本 task 消费其他 task 的契约时填
     related_tests: 仅当本 task 改动导致既有测试断言失效时填（测试路径须同时进 allowed_paths） -->
