---
id: task-02
title: 'extractFrontendPayloadFields——三后缀提取（formData/payload/请求邻近窗口 DTO 键/name 属性/vue v-model/wxml value）+ URL 段边界关联 + escape hatch + 归一'
title_zh: 'extractFrontendPayloadFields——三后缀提取（formData/payload/请求邻近窗口 DTO 键/name 属性/vue v-model/wxml value）+ URL 段边界关联 + escape hatch + 归一'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-18 07:47:32
priority: P0
depends_on: ['task-01']
blocks: []
requirement_ids: [FR-02]
decision_ids: [D-002@v1]
allowed_paths:
  - src/verify-probes.js
target_files: [src/verify-probes.js]
provides:
  - contract: frontend-extractor
    fields: [extractFrontendPayloadFields, fieldLines, urlsByCall]
goal: >
  新增导出 extractFrontendPayloadFields——按后缀选匹配族提取前端 payload 构造点字段集
  （含首命中行号）与归一化 URL 关联素材，为 task-04 对账供前端面。
implementation:
  - 新增导出 extractFrontendPayloadFields(filePath, content)，返回 fields/fieldLines/urlsByCall/escapeHatch；文件首 5 行含 probe8-skip → 跳过并计 escapeHatch（probe9-skip 文件级豁免同款先例，verify-probes.js:774-776）
  - js/ts 匹配族（.js/.ts/.jsx/.tsx）四形态——formData. 前缀字段、payload. 前缀字段、请求调用邻近窗口 DTO 字面量键（请求调用行后 8 行窗口内键名，对齐 extractPayloadKeys :179 现行口径——不收全文件字面量，非请求区对象键污染即 R-08/Grill B-5）、name 属性值
  - vue 匹配族——.vue 在 js 族四形态之外追加 v-model 绑定值与 prop 属性值；wxml 匹配族——.wxml 追加 value 插值绑定值与 data- 前缀属性名
  - URL 捕获——fetch/post/put/delete/getRequest/postRequest/putRequest/deleteRequest/search 调用首参（引号或斜杠起始）；归一化三步——去 query（问号后截断）、去首 /api/ 前缀、去尾斜杠；urlsByCall 逐调用记归一 URL 与行号（段边界后缀匹配消费归 task-04，Grill B-8）
  - 字段名归一 lowerCamel（snake_case→camelCase）；fieldLines 用 Map 记每字段首命中行号（driftWarnings 行号来源）
acceptance:
  - js/ts 四形态提取正确；DTO 键仅收请求调用 8 行邻近窗口内（非请求区字面量键负例不收）
  - vue v-model/prop 与 wxml value 插值绑定/data-xxx 提取正确
  - URL 归一化三步正确（去 query/去 /api/ 前缀/去尾斜杠），urlsByCall 含行号
  - snake_case→lowerCamel 归一正确；首 5 行 probe8-skip 跳过并计数
verify:
  - npm run lint
  - node --test test/probe8-payload-parity.test.mjs test/probe8-contract-pivot.test.mjs
constraints:
  - 正则本地实现零 AST 依赖；不收全文件字面量键（仅请求邻近窗口，防 R-08 假阳）
  - 无 URL 文件不产关联素材（未关联端点面的处置归 task-04）
  - 零新增模块 import 边；probe1-7/9 零改动
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
