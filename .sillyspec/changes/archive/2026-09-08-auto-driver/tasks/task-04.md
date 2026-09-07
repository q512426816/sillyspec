---
id: task-04
title: 'CLI 收尾总结（:1726 挂点 + :1616 复用 helper + last-delta 消费）'
title_zh: 'CLI 收尾总结（:1726 挂点 + :1616 复用 helper + last-delta 消费）'
author: 'qinyi'
created_at: 2026-09-08 06:38:23
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-04]
decision_ids: [D-005@v1]
allowed_paths:
  - src/run/command.js
target_files: [src/run/command.js]
goal: >
  CLI 收尾总结：全完成时打印结构化摘要（:1726 挂点 + :1616 复用）。
implementation:
  - 抽 printAutoCompletionSummary(pm, cwd, changeName) helper：变更名/各阶段状态/tasks 勾选（readPlanCheckboxStatus）/产物存在清单（proposal/design/tasks/plan/verify-result/delta）/last-delta.json 模块清单（缺失跳过）
  - 挂 :1726（--done 后 next==null 自然收尾）；:1616 重进入分支复用同 helper
  - :1659 步骤全勾但阶段未关 → 仍提示 --done 收口（不打印总结）
  - 纯 console 无新文件；分隔线包裹
acceptance:
  - 全完成打印五段信息
  - 未完成不打印
  - sidecar 缺失跳过不报错
verify:
  - node --check src/run/command.js
  - 测试在 task-06
constraints:
  - 不写新文件
  - 不动平台 sync 输出
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
