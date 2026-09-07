---
id: task-03
title: 'archive-delta 第五源（采集+After 端点增删节+降级门控）+ 既有 test/archive-delta.test.mjs:296-298 旧提示断言更新至降级口径'
title_zh: 'archive-delta 第五源（采集+After 端点增删节+降级门控）+ 既有 test/archive-delta.test.mjs:296-298 旧提示断言更新至降级口径'
author: 'qinyi'
created_at: 2026-09-07 07:52:45
priority: P0
depends_on: ['task-01']
blocks: []
requirement_ids: [FR-02]
decision_ids: [D-001@v1, D-002@v1]
allowed_paths:
  - src/archive-delta.js
  - test/archive-delta.test.mjs
target_files:
  - src/archive-delta.js
  - test/archive-delta.test.mjs
goal: >
  delta 第五源——归档时端点增删进 delta.md。
expects_from:
  task-01:
    - contract: diffEndpointSets
      needs:
        - added
        - removed
implementation:
  - collectDeltaSources 增 endpointBaseline（读 runtimeRoot/endpoint-baselines/<change>.json fail-soft null）
  - buildDeltaReport After 段：基线在 → 现算 scanBackendEndpoints（同口径）× diffEndpointSets → 「### 端点基线提示」节改造为端点增删表（added/removed 独立行，changed 不配对；空则「无增删」）；基线缺失 → 该节降级注记「无基线（变更未拍 baseline）」；门控保留 backendEndpoints>0
  - test/archive-delta.test.mjs :296-298 旧提示断言更新至降级口径
acceptance:
  - 有基线 fixture 出增删表；无基线出降级注记；backendEndpoints=0 无该节
verify:
  - node --test test/archive-delta.test.mjs
constraints:
  - 四源既有行为零变化（frontmatter sources 断言 includes 式兼容）

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
