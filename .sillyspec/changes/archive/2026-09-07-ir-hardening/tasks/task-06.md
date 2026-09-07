---
id: task-06
title: 'buildDeltaReport withSummary + last-delta sidecar 两路径写入 + scanResumeCheck advisory'
title_zh: 'buildDeltaReport withSummary + last-delta sidecar 两路径写入 + scanResumeCheck advisory'
author: 'qinyi'
created_at: 2026-09-07 23:13:34
priority: P0
depends_on: ['task-05']
blocks: []
requirement_ids: [FR-03]
decision_ids: [D-006@v1]
allowed_paths:
  - src/archive-delta.js
  - src/index.js
  - src/run/complete-handlers.js
  - src/run/scan-profile.js
target_files: [src/archive-delta.js, src/index.js, src/run/complete-handlers.js, src/run/scan-profile.js]
goal: >
  last-delta sidecar 回灌：buildDeltaReport 结构化返回 → 两路径写 sidecar → scan 断点续扫步 14 天窗口 advisory。
implementation:
  - buildDeltaReport 增 opts.withSummary → 返回 { markdown, change, affectedFiles, affectedModules }（affectedFiles=matched+undeclared/deliverables 兜底；affectedModules=module-map 归属——复用函数内既有推导，单一真相源）
  - 新增 writeLastDeltaSidecar(runtimeRoot, summary)：写 .runtime/last-delta.json（schemaVersion 1 四字段+updatedAt，幂等覆盖，写失败 fail-soft 不阻断 delta 输出）
  - index.js delta case + complete-handlers 归档确认步两处接 sidecar 写入
  - executeScanResumeCheck：读 sidecar，updatedAt 14 天内 → 打印 advisory（上次归档变更涉及模块——本轮 scan 优先核对其文档与 staleRefs）；缺失/过期/解析失败静默
acceptance:
  - 两 delta 生成路径都落 sidecar 且字段齐全
  - advisory 三态（在场打印/过期静默/缺失静默）
  - sidecar 写失败不影响 delta.md 生成
verify:
  - node --check src/archive-delta.js src/run/scan-profile.js
  - 测试在 task-09（delta-scan-feedback，含写失败 fail-soft）
constraints:
  - advisory 不改变 scan 步骤结构不阻断
  - 不读 sidecar 做 scan 拆分（非目标）
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
