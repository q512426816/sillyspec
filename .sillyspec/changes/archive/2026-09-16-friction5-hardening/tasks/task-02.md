---
id: task-02
title: 'TaskCard 重复键检测——plan-postcheck.js detectDuplicateTopKeys 纯函数 + feasibility 接线硬报错 + test/taskcard-duplicate-key.test.mjs'
title_zh: 'TaskCard 重复键检测——plan-postcheck.js detectDuplicateTopKeys 纯函数 + feasibility 接线硬报错 + test/taskcard-duplicate-key.test.mjs'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-16 11:39:03
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-02]
decision_ids: [D-004@v1]
allowed_paths:
  - src/stages/plan-postcheck.js
  - test/taskcard-duplicate-key.test.mjs
target_files:
  - src/stages/plan-postcheck.js
  - NEW:test/taskcard-duplicate-key.test.mjs
goal: >
  feasibility 检测 frontmatter 顶层键重复（骨架反填 depends_on 后 agent 又手填同键场景），重复即 error 阻断，消灭 jsYaml 消费方静默吞字段。
implementation:
  - '新增导出纯函数 detectDuplicateTopKeys(fmText)——CRLF 归一、按行匹配 ^([A-Za-z_][\w-]*): 收集键→行号（1-based），返回出现 ≥2 次的 {key, lines[]} 列表'
  - 'validatePlanFeasibility 每卡循环（正则字段检查前）调用 detectDuplicateTopKeys，非空则 errors.push『<taskId|file>: frontmatter 顶层键 <key> 重复出现 N 次（L<a>、L<b>…）——骨架已自动反填的键（如 depends_on）勿重复手填，保留正确一处删除其余』'
acceptance:
  - 'depends_on 重复两行的卡被 error 阻断且报错含键名 + 两个行号'
  - '无重复键的卡零新 error'
  - '块列表（allowed_paths: 换行缩进 - x）与缩进子键不误报'
  - 'goal: > 折叠块的缩进续行不误报'
verify:
  - 'npm test -- test/taskcard-duplicate-key.test.mjs'
  - 'npm test（全量回归，重点 test/plan-postcheck*.test.mjs 零回归）'
constraints:
  - '不改 parseDependsOn/parseAllowedPaths 等正则消费方'
  - '检测只在 feasibility 单点接线'
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
