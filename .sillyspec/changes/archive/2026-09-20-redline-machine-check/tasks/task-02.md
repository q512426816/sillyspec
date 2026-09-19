---
id: task-02
title: 'verify-probes.js 探针 11 接线——runRedlineConsistencyProbe（fail-soft，读 specBase/redlines.yaml，root=wtRoot||cwd）+ PROBE11_HEADING 渲染（❌/⚠️/✅/不适用）+ core-engine changelog 登记'
title_zh: 'verify-probes.js 探针 11 接线——runRedlineConsistencyProbe（fail-soft，读 specBase/redlines.yaml，root=wtRoot||cwd）+ PROBE11_HEADING 渲染（❌/⚠️/✅/不适用）+ core-engine changelog 登记'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-20 00:26:16
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-02, FR-03]
decision_ids: ['D-002@v1', 'D-003@v1', 'D-004@v1']
allowed_paths:
  - src/verify-probes.js
  - .sillyspec/docs/sillyspec/modules/core-engine.changelog.md
target_files:
  - src/verify-probes.js
  - .sillyspec/docs/sillyspec/modules/core-engine.changelog.md
goal: >
  verify 探针 11 红线一致性接线（advisory + fail-open 全链）。
implementation:
  - 动态 import redlines.js（同探针 8/9/10 fail-soft 纪律，不进通用启动路径）
  - runRedlineConsistencyProbe({specBase, cwd, wtRoot, changeName})：读 <specBase>/redlines.yaml，缺→applicable:false；root=wtRoot||cwd
  - 调用区插探针 10 块后；渲染区 PROBE11_HEADING + renderProbe11Lines（不适用/❌error命中/⚠️warning命中与require缺失/✅计数，statement+origin 随行）
  - core-engine changelog 边车登记
acceptance:
  - 缺清单→「不适用（仓未配置 redlines.yaml）」一行
  - 坏 yaml→不适用+注记不炸
  - 命中渲染带 file:line+statement+origin
verify:
  - node test/redlines.test.mjs 探针段（task-03）
constraints:
  - 不动 facts schema / 探针 1-10 渲染序
  - 不进 PASS 封顶（advisory，D-003）
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
