---
id: task-01
title: '新建 src/redlines.js——parseRedlines（七字段+四无效判据）/resolveScopeFiles（** 与 * glob，排除 node_modules 等）/evaluateRedlines（forbid 命中 file:line + require 缺失 + severity）+ module-map/模块卡登记'
title_zh: '新建 src/redlines.js——parseRedlines（七字段+四无效判据）/resolveScopeFiles（** 与 * glob，排除 node_modules 等）/evaluateRedlines（forbid 命中 file:line + require 缺失 + severity）+ module-map/模块卡登记'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-20 00:26:16
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-01, FR-02]
decision_ids: ['D-001@v1', 'D-002@v1']
allowed_paths:
  - src/redlines.js
  - .sillyspec/docs/sillyspec/modules/_module-map.yaml
  - .sillyspec/docs/sillyspec/modules/redlines.md
target_files:
  - NEW:src/redlines.js
  - .sillyspec/docs/sillyspec/modules/_module-map.yaml
  - NEW:.sillyspec/docs/sillyspec/modules/redlines.md
goal: >
  红线断言评估器纯函数模块 + 模块登记（归属卫生）。
implementation:
  - 新建 src/redlines.js：parseRedlines（js-yaml→条目；无效四判据：缺id/缺scope/forbid与require全空/坏正则→跳过+warnings）
  - resolveScopeFiles（glob：** 跨层、* 单段；walk 排除 node_modules/.git/.sillyspec/.runtime；仅文件；单文件2MB上限跳过+warn）
  - evaluateRedlines（逐条 scope→逐文件逐 forbid 多行正则收 {file,line,snippet}；require scope 全集无命中=缺失；severity 透传；单条异常跳过+warn）
  - _module-map.yaml 增 redlines 模块（paths: src/redlines.js）+ 新建 modules/redlines.md 卡（定位/契约摘要/关键逻辑）
acceptance:
  - parseRedlines 七字段解析正确、四无效判据各自跳过+warning
  - resolveScopeFiles 的 ** 与 * 语义正确且排除目录生效
  - evaluateRedlines forbid 命中带 file:line、require 缺失、severity 透传
verify:
  - node test/redlines.test.mjs（task-03 落地后）
constraints:
  - 纯函数：root 注入，不读 env/时钟
  - 不改 verify-probes（接线是 task-02）
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
