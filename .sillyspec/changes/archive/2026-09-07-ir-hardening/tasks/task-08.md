---
id: task-08
title: '引用类诊断 supportedFixes 可执行化（--suggest no-op 清理）'
title_zh: '引用类诊断 supportedFixes 可执行化（--suggest no-op 清理）'
author: 'qinyi'
created_at: 2026-09-07 23:13:34
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-04]
decision_ids: [D-007@v1]
allowed_paths:
  - src/scan-postcheck.js
  - src/index.js
target_files: [src/scan-postcheck.js, src/index.js]
goal: >
  引用类诊断 supportedFixes 可执行化：两条文案改可逐字执行 CLI 命令，--suggest no-op 清理。
implementation:
  - scan-postcheck.js scan_doc_ref_invalid 两条 supportedFixes 改写：①sillyspec docs check --paths <file> --fix（原「docs check --suggest」指向 no-op 旗标）②先跑 sillyspec docs check --paths <file> 确认零候选锚点后再删除该引用（原「删除无法核验的引用」无核验前置）
  - index.js docs case：--suggest 旗标清理（置位无消费者——确认后删除解析行并同步 help 文案）
acceptance:
  - 两条 supportedFixes 均为可逐字执行命令形态（含 --paths 范围）
  - --suggest 不再作为推荐路径出现在任何诊断文案
  - 全仓 grep 引用类诊断无「查看/考虑/评估」类不可执行 supportedFixes 残留
verify:
  - node --check src/scan-postcheck.js src/index.js
  - grep -rn "docs check --suggest" src/ 应零命中（或仅历史注释）
constraints:
  - 只改引用失效类诊断（scan_doc_ref_invalid）；scan-fix-headers 等既有可执行条目不动
  - --suggest 清理若影响 help 输出需同步
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
