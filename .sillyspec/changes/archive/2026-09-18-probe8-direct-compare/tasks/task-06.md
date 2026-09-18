---
id: task-06
title: '测试补全——NEW test/probe8-direct-compare.test.mjs（~35 断言）+ 既有 probe8 两文件适配'
title_zh: '测试补全——NEW test/probe8-direct-compare.test.mjs（~35 断言）+ 既有 probe8 两文件适配'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-18 07:47:32
priority: P0
depends_on: ['task-01', 'task-02', 'task-03', 'task-04', 'task-05']
blocks: []
requirement_ids: [FR-01, FR-02, FR-03]
decision_ids: [D-001@v1, D-002@v1, D-003@v1, D-004@v1, D-006@v1]
allowed_paths:
  - src/verify-probes.js
  - test/check-syntax.mjs
  - .sillyspec/docs/sillyspec/modules/_module-map.yaml
  - test/probe8-direct-compare.test.mjs
  - test/probe8-payload-parity.test.mjs
  - test/probe8-contract-pivot.test.mjs
target_files: [src/verify-probes.js, NEW:test/probe8-direct-compare.test.mjs, test/probe8-payload-parity.test.mjs, test/probe8-contract-pivot.test.mjs]
expects_from:
  task-01:
    - contract: diff-files-collector
      needs: [diffFiles, fileClassification, designOnlyPaths, fallbackMode]
  task-02:
    - contract: frontend-extractor
      needs: [extractFrontendPayloadFields, fieldLines, urlsByCall]
  task-03:
    - contract: backend-extractor
      needs: [extractBackendFields, backendAllFields, requiredFields]
  task-04:
    - contract: compare-and-render
      needs: [comparePayloadFields, renderDirectCompareSection]
  task-05:
    - contract: probe8-wired
      needs: [runProbe8PayloadParity-diff-source, design-list-advisory]
goal: >
  测试补全——NEW test/probe8-direct-compare.test.mjs 约 35 断言覆盖提取三后缀五形态/后端
  三态/对账两类/分类/fallback 三态/锚点负例，既有 probe8 两测试文件随 diff 源切换适配。
implementation:
  - NEW test/probe8-direct-compare.test.mjs（约 35 断言，自研 assert+临时目录夹具，house 风格）——前端三后缀五形态（js formData/payload/请求邻近窗口 DTO 键/name 属性 + vue v-model/prop + wxml value 绑定/data-xxx）
  - DTO 邻近窗口负例（非请求区对象字面量键不收，Grill B-5）+ 后端 @RequestParam 三态（正常参数名捕获/required=false 排除/value 注解名）+ @RequestBody/@PathVariable + 校验调用三模式 + 注解 5 行窗口
  - URL 段边界关联（/orders 命中 /api/v1/orders 不误命中 /rporders）+ 文件分类（.ts 目录裁决二态/两不中 other/.java→backend/.vue 无条件 frontend）+ escape 双侧（前端+后端 probe8-skip）+ 非 Java 跳过
  - 对账两类 warning 语义——漂移含 file/line/field（行号自 fieldLines）/必填漏发含 endpoint/method/field/frontendFiles
  - diff 源 fallback 三态（worktree 双源/in-place 含已提交窗口/design-only 模式注记）
  - 渲染行不误中锚点负例——direct-compare 前缀行断言不匹配 verify-postcheck.js:2887/:2891 两 PROBE8 锚点正则
  - test/probe8-payload-parity.test.mjs 适配——diff 源替换后既有断言随行+fallback 链断言；test/probe8-contract-pivot.test.mjs——渲染面子段追加处断言随行（design 契约面零变化断言保留）
acceptance:
  - 新文件约 35 断言全绿且覆盖上述全态；两既有文件适配后全绿
  - 渲染锚点负例在列（direct-compare 行不匹配 PROBE8 系锚点正则）
  - 断言与实现不符时修实现侧——测试逻辑本身无误时禁改断言迁就
verify:
  - node --test test/probe8-direct-compare.test.mjs test/probe8-payload-parity.test.mjs test/probe8-contract-pivot.test.mjs
  - npm run lint
constraints:
  - 夹具不触真实 .sillyspec（临时目录构造，防污染共享仓）
  - 不为通过而弱化断言；测试全绿以真实跑 node --test 为准
  - src/verify-probes.js 仅允许为修实现缺陷而动（提取/对账逻辑面已由 task-01~05 定界）
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
