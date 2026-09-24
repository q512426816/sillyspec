---
id: task-06
title: '归档提升：fr-index 局部锚→全局锚+条目子块 upsert+supersede'
title_zh: '归档提升：fr-index 局部锚→全局锚+条目子块 upsert+supersede'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-24 12:35:27
priority: P0
depends_on: [task-01, task-03]
blocks: [task-07]
requirement_ids: [FR-03, FR-04]
decision_ids: [D-002@v1]
allowed_paths:
  - src/fr-index.js
  - test/test-bindings.test.mjs
target_files: []
expects_from:
  - task-01 upsertEntryBindings；task-03 test-trace.json 行
goal: >
  归档 indexRequirements 时消费本变更 test-trace.json：局部 FR-NN 用发号映射铸
  全局 FR-<域>-NNN，绑定行 upsert 进活库条目「测试绑定:」机器子块；supersede
  翻链同步绑定 status；重放不覆盖绑定字段（四硬约束落点）。
implementation:
  - src/fr-index.js indexRequirements 主入口尾部：读 test-trace.json→锚映射→upsertEntryBindings（source_change=变更名）
  - 承接翻链处置退役条目时，其子块绑定行 status→superseded（禁死锚）
  - 重放保护：既有条目非绑定字段照旧重放；绑定子块只按 source_change+row_id 合并，agent 行保留
acceptance:
  - 归档后条目含绑定子块且行=晋升后 trace（锚=全局 id）；test-trace.json 随归档包保留
  - 同源重放零漂移；混入 agent --bind 修复行后重放不冲掉（字段级所有权②）
  - FR superseded→其绑定行 status=superseded（fixture 回测）
verify:
  - node --test test/test-bindings.test.mjs
  - npm run lint
constraints:
  - 不改发号/承接/幂等闸门既有语义
  - 提升失败 fail-visible（归档报错重跑，不留半提升态）
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
