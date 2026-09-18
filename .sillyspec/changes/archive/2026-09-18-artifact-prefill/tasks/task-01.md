---
id: task-01
title: '新建 src/prefill.js——三纯函数（prefillFileChangeList/prefillDecisionTable/prefillCardIds）+hasUnconfirmedPrefill 注检测+runPrefillRefresh（已确认跳过）；来源注协议「（预填冒号 核对后删本注——字面量分散写防探针自咬）」'
title_zh: '新建 src/prefill.js——三纯函数（prefillFileChangeList/prefillDecisionTable/prefillCardIds）+hasUnconfirmedPrefill 注检测+runPrefillRefresh（已确认跳过）；来源注协议「（预填冒号 核对后删本注——字面量分散写防探针自咬）」'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-18 23:50:25
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-01]
decision_ids: [D-001@v1, D-002@v1, D-005@v1]
allowed_paths:
  - src/prefill.js
target_files:
  - NEW:src/prefill.js
goal: >
  新建 src/prefill.js 预填引擎——三槽白名单纯函数推导+来源注协议+refresh 重放（已确认跳过），供生成器与 refresh 命令单点复用。
implementation:
  - prefillFileChangeList({ tasksDir }) → string[]：各 task 卡 target_files 并集，NEW 前缀保形，产出 design.md 文件变更清单形态行
  - prefillDecisionTable({ changeDir }) → string[]：解析 decisions.md 的 ## D-xxx@vN 清单 → 决策追踪表行，状态列「待确认」
  - prefillCardIds({ changeDir }) → { requirementIds, decisionIds }：requirements.md FR-NN 抽取+decisions 清单 → TaskCard ids
  - hasUnconfirmedPrefill(filePath) → boolean：检测来源行内注「（预填冒号 核对后删本注——字面量分散写防探针自咬）」是否在场
  - runPrefillRefresh({ cwd, specBase, changeName }) → { filled, skipped, confirmed }：重放三槽预填；槽内注已删=已确认 → 跳过不覆盖人工内容
  - 全部预填输出统一带来源行内注「（预填冒号 核对后删本注——字面量分散写防探针自咬）」；无源文件（无 tasks/ 或 decisions.md）时对应槽留空+提示行，现状骨架行为不变
acceptance:
  - 三槽直测语义正确：清单=target_files 并集且 NEW 前缀保形；决策表行状态「待确认」；ids=FR-NN+D-xxx@vN 抽取——输出均带来源注
  - runPrefillRefresh 幂等：同输入二次重放，产物与 { filled, skipped, confirmed } 结果一致
  - 已确认跳过：预填注已删的槽 refresh 不覆盖人工内容（confirmed 计数）
verify:
  - npm run lint
  - npm test
constraints:
  - 三纯函数与 hasUnconfirmedPrefill 纯函数零 IO（runPrefillRefresh 是唯一 IO 例外）
  - 白名单外槽零触碰（D-001 红线）；不破坏既有 <!--TODO--> 骨架纪律
---

<!-- 骨架由 sillyspec taskcard 生成（LF 行尾 + frontmatter 已闭合 + 硬校验 9 字段齐全）。
     用 Edit tool 填充上方占位符（allowed_paths/goal/implementation/acceptance/verify/constraints 等），
     勿用 Write 整文件重写——会引入 CRLF 行尾/漏闭合 ---/漏字段回归。
     ⚠️ plan --done 硬校验会拦截未替换的占位符（FR-XX / D-XXX / src/example/file.ts /
     三纯函数+注协议+refresh 引擎（已确认跳过） / 具体步骤 1 / 可验证的验收条件 1 / 边界约束 1）——占位符视同缺字段。
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
