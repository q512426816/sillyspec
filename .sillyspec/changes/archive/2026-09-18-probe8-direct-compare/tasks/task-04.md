---
id: task-04
title: 'comparePayloadFields 纯函数+骨架 direct-compare 子段渲染（命中统计+明细行+advisory 档+渲染行不误中锚点）'
title_zh: 'comparePayloadFields 纯函数+骨架 direct-compare 子段渲染（命中统计+明细行+advisory 档+渲染行不误中锚点）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-18 07:47:32
priority: P0
depends_on: ['task-02', 'task-03']
blocks: []
requirement_ids: [FR-02, FR-03]
decision_ids: [D-002@v1, D-003@v1, D-004@v1, D-006@v1]
allowed_paths:
  - src/verify-probes.js
target_files: [src/verify-probes.js]
expects_from:
  task-02:
    - contract: frontend-extractor
      needs: [extractFrontendPayloadFields, fieldLines, urlsByCall]
  task-03:
    - contract: backend-extractor
      needs: [extractBackendFields, backendAllFields, requiredFields]
provides:
  - contract: compare-and-render
    fields: [comparePayloadFields, renderDirectCompareSection]
goal: >
  新增导出 comparePayloadFields 纯函数对账（漂移嫌疑含行号+必填漏发嫌疑）与
  renderDirectCompareSection 骨架子段渲染（advisory 档）——消费 task-02/03 提取面，
  产出 probe8 直比维度的渲染素材。
implementation:
  - 新增导出 comparePayloadFields(frontendByFile, backendEndpoints, backendAllFields) 纯函数——URL→端点关联用路径段边界后缀判定（前端归一 URL 是后端完整 path 的段首对齐后缀——/orders 命中 /api/v1/orders 但不误命中 /rporders；类级+方法级 mapping 拼接后判定，Grill B-8）
  - 漂移嫌疑——前端发送字段 ∉ backendAllFields（二趟全仓 DTO/实体字段集 ∪ 一趟 Controller 参数名集并集，Grill B-7）→ driftWarnings 逐条含 file/line/field（行号取 fieldLines 首命中）
  - 必填漏发嫌疑——后端端点 requiredFields 含字段 ∉ 该端点关联前端文件的发送集 → missingRequiredWarnings 逐条含 endpoint/method/field/frontendFiles；无 URL 文件归未关联端点面（仅漂移对账参与、必填漏发不参与）
  - escapeHatchCount/nonJavaSkipCount 自两提取面透传；对账输出零 IO 纯计算
  - 新增 renderDirectCompareSection——命中统计行（direct-compare 前缀——漂移嫌疑 N 条/必填漏发嫌疑 M 条/escape hatch K 文件/非 Java 后端跳过 J 文件）+ 逐条明细行（反引号「文件:行号」+说明，格式同 probe1 ⚠️ 明细行）
  - renderProbe8Lines（:1476-1508）尾部接子段——子段=if 块（删除即回退）；全部 advisory 不阻断、不进 errors/warnings 数组（命中统计供后续批次评估升格）
  - 渲染明细行前缀与既有 PROBE8 锚点字面前缀（verify-postcheck.js:2887/:2891 两正则——契约外载荷键/契约必填漏发汇总行）严格区分不误中（负例断言归 task-06）
acceptance:
  - 段边界后缀匹配正确——/orders 命中 /api/v1/orders、不命中 /rporders（段首对齐）
  - driftWarnings 含 file/line/field；missingRequiredWarnings 含 endpoint/method/field/frontendFiles
  - 渲染为独立子段+命中统计行+明细行；advisory 不阻断（对账结果不进 errors/warnings）
  - 渲染行不匹配 verify-postcheck.js:2887/:2891 PROBE8 系锚点正则（行前缀字面不同）
  - probe8 既有 design 契约面对账输出零变化；probe1-7/9 零改动
verify:
  - npm run lint
  - node --test test/probe8-payload-parity.test.mjs test/probe8-contract-pivot.test.mjs
constraints:
  - 纯函数零 IO；不改既有对账语义（contractOrphans/missingRequired 面原样）
  - 渲染行不得复用「契约外载荷键/契约必填漏发」既有 ⚠️ 汇总行前缀形态（防 verify-postcheck 锚点误中）
  - 零新增模块 import 边
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
