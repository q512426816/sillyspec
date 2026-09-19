---
id: task-02
title: 'skeleton and guidance copy sync to five-enum verdict (render/probe7 note/verify stage/template/init hint)'
title_zh: '骨架与指引文案——verify-probes.js（render 五选一+占位、probe7 注记 :1929/:1930）、stages/verify.js、templates/prompts/verify-probes.md、src/index.js :1212'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-19 06:32:08
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-02]
decision_ids: [D-001@v1]
allowed_paths:
  - src/verify-probes.js
  - src/stages/verify.js
  - templates/prompts/verify-probes.md
  - src/index.js
target_files:
  - src/verify-probes.js
  - src/stages/verify.js
  - templates/prompts/verify-probes.md
  - src/index.js
goal: >
  骨架与指引文案六面同步五枚举口径（covered/covered-service/partial/uncovered/non-testable）——renderApiCoverageMatrixLines 口径注记与占位两处、probe7 骨架注记 :1929 与预填说明 :1930、verify 阶段指引 :165、模板 :36、--init 提示 :1212。行为面（Wave1 判定层）已认 covered-service，文案面不跟即「行为认、文案不认」漂移；:1930 尤其关键——它是唯一主动指令 agent 不得填新枚举的文案，不改则 covered-service 在 probe7 侧骨架指引下不可达。
implementation:
  - 步骤一（renderApiCoverageMatrixLines，design Wave2.1）：src/verify-probes.js :2485-2512——:2490 口径注记「判定枚举（四选一）：covered / partial / uncovered / non-testable」改「判定枚举（五选一）：covered / covered-service / partial / uncovered / non-testable」并补一句 covered-service 口径说明（适用——端点行为由 service 层等非端点层测试锁定；证据须测试锚点三形态 .test. / file:line / 反引号）；:2504 端点行与 :2507 声明降级行两处占位「<待填：四选一>」改「<待填：五选一>」；:2477 JSDoc「判定列 `<待填：四选一>` 占位」同步「<待填：五选一>」。
  - 步骤二（ensure 复用核对，零新改动）：ensureApiCoverageMatrixSection（:3079）在 :3084 经 renderApiCoverageMatrixLines(apiFace) 复用 render——步骤一改 render 即自动同步两条新写路径（generateVerifyResultSkeleton 骨架 + 缺段补齐），不单独改 ensure；核对 :3084 调用行未动。
  - 步骤三（probe7 骨架注记，design Wave2.2）：src/verify-probes.js :1929 口径注记「判定枚举（四选一）：covered / partial / uncovered / non-testable（文档/部署类显式逃生门）」改五选一（covered / covered-service / partial / uncovered / non-testable）；:1930 预填说明两处口径——「枚举须保持 covered/partial/uncovered/non-testable 纯值」加 covered-service、「covered/partial 证据须含测试锚点三形态之一」改「covered/covered-service/partial 证据须含测试锚点三形态之一」（对齐 Wave1 matrixEvidenceMissing 扩展后口径）。
  - 步骤四（verify 阶段指引，design Wave2.3）：src/stages/verify.js :165（任务蓝图验收 prompt 内探针 7 指引句）——「逐行填判定（covered/partial/uncovered/non-testable 四选一）与证据」改五选一并补 covered-service 一句说明（端点行为由 service 层测试锁定的填 covered-service，证据附测试锚点）；「covered/partial 附测试锚点」同步「covered/covered-service/partial 附测试锚点」。
  - 步骤五（模板，design Wave2.4）：templates/prompts/verify-probes.md :36（探针 7 补充段）——「逐行填判定槽四枚举（covered / partial / uncovered / non-testable——non-testable 是文档/部署类显式逃生门）」改五枚举并补 covered-service 说明；「covered/partial 附测试锚点（.test. 文件或 file:line）」同步含 covered-service。
  - 步骤六（--init 提示，design Wave2.5 / Grill N-02）：src/index.js :1212 console.log 提示串「判定=四选一/证据两槽待填」改「判定=五选一/证据两槽待填」。
acceptance:
  - renderApiCoverageMatrixLines 两种形态（endpoints 非空逐端点行 / declared 声明降级行）产出均含「<待填：五选一>」占位，且 :2490 注记串含「五选一」与「covered-service」（经导出面 ensureApiCoverageMatrixSection 写临时文件读回可证）。
  - src/verify-probes.js :1929 与 :1930 注记均为五枚举口径——:1930 不再含旧串「枚举须保持 covered/partial/uncovered/non-testable 纯值」。
  - ensureApiCoverageMatrixSection 函数体零改动——git diff 无 :3079-3104 区间改动行，其产出经 :3084 render 复用自动带新占位。
  - src/stages/verify.js :165、templates/prompts/verify-probes.md :36、src/index.js :1212 三处文案均含 covered-service 或五选一/五枚举口径。
  - 文案清零 grep——四文件 grep「四选一」仅剩 src/verify-probes.js :1877/:1917 历史叙事注释（描述占位淘汰前旧态，不改）；「四枚举」四文件零残留（templates :36 已改五枚举）。
  - 本卡零 test/ 改动——test/api-coverage-matrix.test.mjs :332-333（占位字面断言）与 test/acceptance-matrix-probe.test.mjs :213（probe7 图例断言）在本卡后转红属预期中间态，归 task-04 断言同步收口。
verify:
  - node --check src/verify-probes.js 且 node --check src/stages/verify.js 且 node --check src/index.js（语法冒烟；templates/prompts/verify-probes.md 为 markdown 不适用）
  - grep 冒烟——四文件 grep 四选一/四枚举 输出仅 src/verify-probes.js :1877/:1917 两行历史注释，其余零残留
  - node -e 定向冒烟——import('./src/verify-probes.js') 取导出面 ensureApiCoverageMatrixSection，对系统临时目录写最小 verify-result.md（不落仓内文件），端点行/声明降级行两形态断言占位「<待填：五选一>」与注记五枚举
  - 不跑全量 npm test（既有文案断言预期红，收口归 task-04）
constraints:
  - 八面文案全部呈现五枚举口径——本卡覆盖六面（render/probe7 注记/verify 指引/模板/index 提示），门禁文案两面归 task-01（plan 全局硬约束第 7 条）。
  - 存量四枚举文档校验行为逐字不变——本卡只改骨架 render 新写路径产出与提示文案，不写已渲染存量文档的迁移逻辑；ensure 幂等口径（段在场不触碰）不动（第 1 条）。
  - 零 facts schema 变更（第 3 条）。
  - stage-contract 零 import verify-probes 铁律不破（第 4 条）。
  - 零新正则零路径拼接（第 8 条）。
  - 本卡不改 test/——既有断言失效（占位字面 :332-333 / probe7 图例 :213）归 task-04 收口。
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
