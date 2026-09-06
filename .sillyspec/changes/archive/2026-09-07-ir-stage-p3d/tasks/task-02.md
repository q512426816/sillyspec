---
id: task-02
title: 'index.js delta 命令 case（--change/--spec-dir/--json）+ complete-handlers.js 归档自动生成'
title_zh: 'index.js delta 命令 case（--change/--spec-dir/--json）+ complete-handlers.js 归档自动生成'
author: 'qinyi'
created_at: 2026-09-07 06:36:52
priority: P0
depends_on: ['task-01']
blocks: []
requirement_ids: [FR-01, FR-02]
decision_ids: [D-002@v1, D-003@v1]
allowed_paths:
  - src/index.js
  - src/run/complete-handlers.js
target_files:
  - src/index.js
  - src/run/complete-handlers.js
goal: >
  delta CLI + 归档自动生成双入口。
expects_from:
  task-01:
    - contract: buildDeltaReport
      needs:
        - report
implementation:
  - index.js 新 case delta --change <名> [--spec-dir] [--json]（design-init 先例口径；幂等覆盖；--json 输出 {command,change,ok,path,written}）
  - complete-handlers.js handleArchiveConfirmStep：archiveChangeDirectory 调用（:439）前插 buildDeltaReport 落盘 changeDir/delta.md（fail-soft：异常 console.error 留痕归档继续，提示可手动 sillyspec delta 补）
acceptance:
  - delta 命令生成/覆盖 + --json；归档后 delta.md 在 archive/<变更>/（fail-soft 验证）
verify:
  - node --test test/archive-delta.test.mjs
constraints:
  - 归档主流程零阻断（fail-soft）；不改 handleArchiveConfirmStep 既有门控

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
