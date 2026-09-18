---
id: task-01
title: 'decisions-io 加 hasDecisionId（## D-xxx@vN 标题字面存在性，机械）+ prompt.js 加 renderPreflightFailures（只读快跑/条数帽 5/超时帽 3s/异常返空）与 shouldInjectFullContext（阶段账本分叉）三纯函数面'
title_zh: 'decisions-io 加 hasDecisionId（## D-xxx@vN 标题字面存在性，机械）+ prompt.js 加 renderPreflightFailures（只读快跑/条数帽 5/超时帽 3s/异常返空）与 shouldInjectFullContext（阶段账本分叉）三纯函数面'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-18 21:12:40
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-01, FR-02, FR-03]
decision_ids: [D-001@v1, D-002@v1, D-003@v2]
allowed_paths:
  - src/decisions-io.js
  - src/run/prompt.js
provides:
  - contract: preflight-pure-functions
    fields: [hasDecisionId, renderPreflightFailures, shouldInjectFullContext]
target_files:
  - src/decisions-io.js
  - src/run/prompt.js
goal: >
  打三纯函数地基（decisions-io 决策 ID 字面存在性 + prompt.js 前置失败清单渲染/注入账本判定），
  供 task-02/03 接线消费；全部零副作用纯读，异常路径 fail-open 返空。
implementation:
  - src/decisions-io.js 新增导出 hasDecisionId(changeDir, id)——解析 decisions.md 的 ## D-xxx@vN 标题做字面存在性判断（机械零语义，不做版本归一/别名展开）
  - src/run/prompt.js 新增导出 renderPreflightFailures({ stageName, stepName, cwd, specBase, changeName }) 返回 Promise 字符串——只读快跑本步相关 validator 子集（按 stageName/stepName 查步骤声明；task-04 落声明前无命中返空串）：条数帽 5、超时帽 3s/validator、异常或无失败返空串（fail-open）
  - src/run/prompt.js 新增导出 shouldInjectFullContext({ changeName, stageName, runtimeRoot }) 返回 { full, digest?, firstStep? }——读 .runtime/prompt-inject-<change>.json 账本判定该阶段首步全量/后续摘要；账本不存在或解析异常按首步全量处理
  - 三函数均零副作用：不写任何文件、不改既有导出与渲染路径（账本写入归 task-02，validator 子集声明归 task-04）
acceptance:
  - hasDecisionId 对 decisions.md 中存在/不存在的 ## D-xxx@vN 标题分别返回 true/false；无 decisions.md 文件返回 false 不抛错
  - renderPreflightFailures 失败项超过 5 条截断为 5；单 validator 超 3s 丢弃该项；validator 抛错或无失败返回空串
  - shouldInjectFullContext 无账本时返回 full 为真；账本含该阶段记录时返回 full 为假并带 digest 与 firstStep
  - decisions-io/prompt 邻面既有测试零回归
verify:
  - node --test test/decisions-io.test.mjs
  - npm run lint
constraints:
  - 只动 allowed_paths 两文件；LF 行尾；兼容 Windows/Linux/macOS（路径分隔/换行）
  - 纯函数面零副作用：不写文件、不碰 stages 定义、不接 outputStep 渲染路径（接线归 task-02/04）
  - 本 task 不新增测试文件（四相位直测统一归 task-05）
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
