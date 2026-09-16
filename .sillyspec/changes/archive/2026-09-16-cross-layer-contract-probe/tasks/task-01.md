---
id: task-01
title: 'Probe8 contract dimensions: parseDesignContracts export + contractOrphans/missingRequired extension in runProbe8PayloadParity + render/facts metrics rows (zero touch on existing dimensions)'
title_zh: '探针8 契约维度核心——verify-probes.js 新增 parseDesignContracts 导出 + runProbe8PayloadParity 扩展 contractOrphans/missingRequired + 渲染段与 metrics 两行（既有三维度零触碰）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-16 12:40:58
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-01, FR-02, FR-03, FR-05]
decision_ids: [D-001@v1, D-002@v1]
allowed_paths:
  - src/verify-probes.js
target_files: [src/verify-probes.js]
goal: >
  扩展现有探针8（ed540c6「载荷字段契约对账」）两个跨层契约维度——契约外载荷键 contractOrphans
  与契约必填漏发 missingRequired，盖住无词法映射错位（sourceShdId↔safelyHiddenId）与 diff 无
  SQL DDL 时必填漏发两类盲区；既有三维度语义零触碰。
implementation:
  - 新增导出 parseDesignContracts(designPath)（置于 src/verify-probes.js 探针8 纯函数区 :150-190 一带）：解析 design.md 契约类章节（标题含「接口定义/数据模型/接口契约/字段」之一）内表格，表头首列须含「字段/Field」判据（防文件清单表首列「操作」、风险表首列「#」误入）；每张命中表产出 {name, fields:Set, required:Set}——字段名取首列（剥反引号/类型注记），required=说明列含「必填/required/※」；含 <!-- probe8-skip --> 的章节整章跳过并计 skippedSections；design.md 不存在返回 null（design §1 + 接口定义）。
  - 两维度挂 runProbe8PayloadParity（src/verify-probes.js:200-307）内：design.md 路径 :207 已构造，契约解析与 :214 parseFileChangeListDetailed 同文件面读取；契约字段并集归一化复用 :150 normFieldKey。
  - contractOrphans 维度：落入既有 feOnly/mispairs 疑似面（:296-297 分流结果）的前端键若 ∉ 契约字段归一化并集 → 收 contractOrphans 数组（元素形态 {fe, hint?}）；hint 用 :268-269 fieldTokens 的 token-Jaccard 对契约字段集跑一遍（低阈值 0.4，仅提示性）；sourceShdId 类无 hint 也照报（契约外即信号）。
  - missingRequired 维度：契约 required 字段（归一化）在 feKeys 全集（:262-263 feNorm）零出现，且「接口定义」章含 POST/PUT 行 → 收 missingRequired 数组（元素形态 {field, contract}）；无提交端点行不启用（防查询载荷误报，R-02）。
  - 输出结构扩展（:201-205 out 初始面新增 contractCount/contractOrphans/missingRequired 三键，既有键零变动）；无契约面（null/空 contracts）→ 两新维度空数组 + notes 注记（skipped 不产新告警、不干扰既有维度输出）。
  - 渲染段 renderProbe8Lines（:882-905）扩两行：contractOrphans 行（hint 折叠展示）+ missingRequired 行；无契约面输出 skipped 注记行不空段；不适用分支 :884-888 与口径注记 :889 零变动；runVerifyProbes fail-soft 包装 :761-766 与调用点 :871 零变动。
  - facts metrics：buildVerifyFacts probe8 段（:964-973）metrics 扩 contractOrphans/missingRequired 两行计数（contractCount 随新返回键一并落；undefined 少列惯例 :918 保持）。
acceptance:
  - FR-01 契约面解析：design.md 含契约类章节且表头首列含「字段/Field」→ parseDesignContracts 每张命中表产出 {name, fields, required}（required=说明列含「必填/required/※」）；design.md 不存在/无契约面/含 probe8-skip 章节 → 返回 null 或空契约面，不报错不误报。
  - FR-02 契约外载荷键：前端载荷键 ∉ 契约字段归一化并集且已落既有 feOnly/mispairs 疑似面 → contractOrphans 含该键（hint 可选，token-Jaccard≥0.4），advisory 不阻断；载荷键 ∈ 契约字段 → 不进 contractOrphans、既有维度照常输出。
  - FR-03 必填漏发：契约 required 字段在 feKeys 全集零出现且「接口定义」章含 POST/PUT 行 → missingRequired 含 {field, contract}，advisory；无提交端点行 → 本维度不启用。
  - FR-05 渲染与 metrics：PROBE8 渲染段新增 contractOrphans/missingRequired 两行（无契约面时注记不空段），buildVerifyFacts probe8 metrics 同步扩展。
  - 返回结构契约：runProbe8PayloadParity 返回值在既有字段外新增 contractCount/contractOrphans/missingRequired，既有 mispairs/feOnly/missingNotNull 及各计数键原样保留（npm test 全量、既有 probe8-payload-parity 五组零失败佐证）。
verify:
  - node --test test/probe8-contract-pivot.test.mjs（task-03 落地后五用例全绿；本卡不建/不改测试文件）
  - npm test（全量零回归——含既有 test/probe8-payload-parity.test.mjs 五组）
constraints:
  - 既有三提取器（extractJavaFields :153 / extractSqlNotNullColumns :164 / extractPayloadKeys :178）与配对逻辑（:260-302）语义零变动——mispairs/feOnly/missingNotNull 输出与 ed540c6 完全一致（FR-04 由既有测试锁定）。
  - 两新维度恒 advisory 不升硬门（不进任何阻断/exit code 逻辑；升门是后续独立决策）。
  - 提取语言面不扩：js/jsx/ts/tsx + java/sql 之外（含 .vue）维持现状不覆盖。
  - 不新增跨模块 import——扩展全在 verify-probes.js 内（parseDesignContracts 为纯新增导出，既有导出面零变动）。
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
