---
id: task-04
title: 'P3 归档就绪度前置——verify 收口就绪度报告+apply 即时强提示（含 test/archive-readiness.test.mjs）'
title_zh: 'P3 归档就绪度前置（草拟不代写+apply 强提示）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-21 22:51:51
priority: P0
depends_on: ['task-01']
blocks: []
requirement_ids: ['FR-03']
decision_ids: ['D-003@v1']
allowed_paths:
  - src/run/complete-handlers.js
  - test/archive-readiness.test.mjs
target_files:
  - src/run/gates.js
  - NEW:test/archive-readiness.test.mjs
  - docs/sillyspec/platform-interface-map.md
goal: >
  archive 回到分钟级：三查前置到 verify 收口+窗口期基线老化强提示
implementation:
  - verify --done 尾部就绪度报告：未-apply 交付面（applyWorktree checkOnly 含合并感知）+manifest 缺行草拟（经 parseFileChangeList round-trip 校验）+module-impact 归因草拟——均带待确认标记不代写
  - apply 即时强提示：main HEAD 前进过基点∩前进文件与交付面交集（四态判定）
  - 无发现时零附加输出（逐字节回归钉）；归档门保持全查
acceptance:
  - 三草拟项格式可解析钉
  - 强提示四态（前进有交集/前进无交集/未前进/无 worktree）
  - 无发现零附加输出（逐字节）
verify:
  - node --test test/archive-readiness.test.mjs
  - npm test
constraints:
  - 草拟永不代 agent 落声明
  - 不取代归档门（verify→archive 状态变化由复查兜底）
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
     implementation/acceptance 里的源码位置同样写仓根相对全路径+行号（示例形态 src/foo . js:123——此处为格式教学非引用）——
                    裸文件名在 docs-check 层1 靠 basename 全仓扫描找候选，找不到候选或关键词
                    窗口不匹配即失效，到 pre-push 才拦（2026-09-19 实证 64 处返工）。
     可选字段按需插进上方 frontmatter（规则见 taskcard-rules）：
     repo:          仅跨仓 task 填（local.yaml repos: 注册的仓 key；缺省=main。allowed_paths 相对该仓根写，
                    禁止带仓库名前缀/绝对路径——review 对账按仓根相对路径匹配，带前缀永不命中）
     provides:      仅当本 task 给其他 task 提供接口/DTO/响应时填
     expects_from:  仅当本 task 消费其他 task 的契约时填
     related_tests: 仅当本 task 改动导致既有测试断言失效时填（测试路径须同时进 allowed_paths） -->
