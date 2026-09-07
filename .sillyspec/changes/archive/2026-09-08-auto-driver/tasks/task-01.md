---
id: task-01
title: 'SS-META 块——outputStep autoMeta 参数 + requiresUser 四源纯函数 + 正文模板同源'
title_zh: 'SS-META 块——outputStep autoMeta 参数 + requiresUser 四源纯函数 + 正文模板同源'
author: 'qinyi'
created_at: 2026-09-08 06:38:23
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-01]
decision_ids: [D-002@v1]
allowed_paths:
  - src/run/prompt.js
target_files: [src/run/prompt.js]
goal: >
  SS-META 元数据块：outputStep 增 autoMeta 第 10 参 + requiresUser 四源纯函数 + 正文模板同源。
implementation:
  - outputStep 签名增 autoMeta = null（单阶段零变化）
  - 导出 requiresUser(step, promptText)：三键（requiresWait/conditionalWait/requiresConfirm）|| WAIT_MARKER_RE.test(promptText)，全缺 false
  - autoMeta 非 null 时：正文「完成后执行」模板改渲 run auto --done 形态（doneCommand 同源单点构造），prompt 尾部追加单行 <!--SS-META:{json}-->（stage/stepIndex/stepName/requiresUser/doneCommand/waitHint）
  - noAI 步不渲染 prompt（天然无块）
acceptance:
  - auto 模式每步尾部有块且单行 JSON 可正则提取
  - requiresUser 四源各一例 + execute Wave 全缺步=false
  - 单阶段 run（autoMeta null）输出与改前逐字节一致
  - doneCommand 内嵌解析后 changeName
verify:
  - node --check src/run/prompt.js
  - 测试在 task-06
constraints:
  - 不改 wait 门语义
  - SS-META 纯渲染产物不落盘不入库
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
