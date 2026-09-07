---
id: task-05
title: 'delta 手动补跑 project 同口径修复'
title_zh: 'delta 手动补跑 project 同口径修复'
author: 'qinyi'
created_at: 2026-09-07 23:13:34
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-03]
decision_ids: [D-005@v1]
allowed_paths:
  - src/index.js
target_files: [src/index.js]
goal: >
  delta 手动补跑 project 同口径修复：从 progress.project 取值，null 兜底降级不变。
implementation:
  - index.js delta case：构造 ProgressManager（或读 progress 快照）取 project 传 buildDeltaReport
  - 「口径互补」注释退役，改为「与归档自动路径同源（progress.project），null 兜底降级」
acceptance:
  - 有 project 名时手动补跑命中 module-map（报告不再恒「无 module-map」注记）
  - 无 project 时降级注记不变
verify:
  - node --check src/index.js
  - 测试在 task-09（delta-scan-feedback）
constraints:
  - 不动 buildDeltaReport 签名（withSummary 在 task-06）
  - 平台模式 specRoot 解析沿用 case 既有逻辑
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
