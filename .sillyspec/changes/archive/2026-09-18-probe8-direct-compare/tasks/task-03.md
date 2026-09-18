---
id: task-03
title: 'extractBackendFields 两趟——Controller 端点定位（类级+方法级拼接）+ @RequestParam 修正正则三态 + @RequestBody 类型收集 + 必填三形态 + 二趟全仓 DTO/实体解析 + 非 Java 跳过'
title_zh: 'extractBackendFields 两趟——Controller 端点定位（类级+方法级拼接）+ @RequestParam 修正正则三态 + @RequestBody 类型收集 + 必填三形态 + 二趟全仓 DTO/实体解析 + 非 Java 跳过'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-18 07:47:32
priority: P0
depends_on: ['task-01']
blocks: []
requirement_ids: [FR-02]
decision_ids: [D-003@v1]
allowed_paths:
  - src/verify-probes.js
target_files: [src/verify-probes.js]
provides:
  - contract: backend-extractor
    fields: [extractBackendFields, backendAllFields, requiredFields]
goal: >
  新增导出 extractBackendFields 两趟扫描——Controller 端点/参数/必填三形态提取 + 二趟全仓
  DTO/实体字段解析，为 task-04 对账供后端全集（backendAllFields）与端点必填集（requiredFields）。
implementation:
  - 新增导出 extractBackendFields(files, resolveTypeContent)（Grill B-4 签名——@RequestBody 类型名跨文件解析，单文件签名不可行）：files 为分类面 backend 文件集（path+content），resolveTypeContent(typeName) 由调用侧传全仓检索闭包返回类源码或 null
  - 第一趟 Controller 定位——.java 含 Mapping 注解（Request/Get/Post/Put/Delete/Patch）→ 类级 @RequestMapping 前缀 + 方法级注解 path 拼接完整端点（method 取注解动词）→ 方法签名参数提取
  - 修正正则提参数（Grill B-3）——@RequestParam 注解名后可选括号参数串 + 可选 final + 泛型类型 + 捕获组 2=参数名（最后一个标识符，前为类型）；注解参数串含 required=false → 该参数非必填排除；注解括号内 value 显式名命中时参数名取注解 value；数组类型方括号边界不误捕（Grill F-6）
  - 路径参数与请求体——@PathVariable 记参数名；@RequestBody 类型名收集入二趟待解析集
  - 必填三形态（D-003）——①NotNull/NotBlank/NotEmpty 注解行向下 5 行窗口内首个字段声明；②@RequestParam 排除 required=false 后全计必填（Spring 缺省 true）；③方法体前 30 行校验调用三模式（StringBlankValidator 首参字段名 / Valid.valid 同行或上一行字段名 / if 判空字段名）
  - 第二趟全仓 DTO/实体解析——@RequestBody 类型名集经 resolveTypeContent 全仓解析（src/ 递归、不限 diff 面、文件大小 cap，Grill F-6；R-07 已修——变更不动实体时不再全量假阳）→ private 字段声明的字段名集；diff 面实体文件直接解析（不依赖 @RequestBody 引用链）
  - 非 Java 后端（分类 backend 但非 .java）→ nonJavaSkip 计数；后端 escape hatch 同前端——首行 probe8-skip 跳过计数
  - 返回 entityFields（∪ 一趟 Controller 参数名集=backendAllFields 素材）/ endpoints（path+method+requiredFields+bodyFields）/ escapeHatchCount / nonJavaSkipCount
acceptance:
  - 请求参数注解三态正确——@RequestParam 正常参数名捕获（捕获组 2）/required=false 排除/value 注解显式名；数组边界不误捕
  - 类级+方法级 mapping 拼接正确；@RequestBody 类型名交二趟回调；resolveTypeContent 返 null 不炸（fail-soft）
  - 必填三形态均命中（注解 5 行窗口/@RequestParam 缺省必填/校验调用三模式）
  - 二趟全仓解析不限 diff 面（R-07）且有大小 cap；非 Java 跳过与后端 escape hatch 计数正确
verify:
  - npm run lint
  - node --test test/probe8-payload-parity.test.mjs test/probe8-contract-pivot.test.mjs
constraints:
  - 函数本体不直接做文件系统 IO——全仓检索经 resolveTypeContent 回调注入（纯函数可测）
  - 必填三形态宽收宁多勿漏（R-02——漏报侧 advisory 可接受，运行时兜底归批次 C smoke）
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
