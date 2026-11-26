---
id: task-04
title: '编排 prompt 增量分支+facts scope 限定'
title_zh: '编排 prompt 增量分支+facts scope 限定'
author: 't'
generated_by: sillyspec-taskcard
created_at: 2026-11-14 22:24:55
priority: P0
depends_on: [task-01, task-02]
blocks: []
requirement_ids: [FR-02]
decision_ids: ['D-009@v1']
allowed_paths:
  - src/stages/scan.js
  - src/scan-facts.js
  - test/scan-paths.test.mjs
  - test/scan-facts.test.mjs
target_files:
  - src/stages/scan.js
  - src/scan-facts.js
expects_from:
  task-02:
    - contract: computeIncrementalPlan
      needs: [docsToRegenerate, docsToSkip, affectedModules, unmappedFiles]
related_tests:
  - test/scan-paths.test.mjs
  - test/scan-facts.test.mjs
goal: >
  scan 编排的四条生成步骤 prompt 增加增量分支（增量计划注入段：受影响面清单+跳过集+
  conditionalWait 豁免声明+压制「已存在则跳过」），scan facts 支持 scope 限定——
  增量路径下子代理只处理受影响面，未受影响产物零触碰。
implementation:
  - src/stages/scan.js 四步骤 prompt 增量注入段（步骤名/顺序/optional 不动）：「构建环境探测」注入「增量模式：sillyspec scan facts --scope <受影响模块 paths>」；「深度扫描 — 7 份文档」注入「增量模式：只为 docsToRegenerate 命中篇章启动子代理，docsToSkip 篇章跳过并在输出报状态（⛔ 未受影响篇章零触碰）」；「生成模块映射」注入「增量模式：_module-map.yaml 已存在时不再整体跳过——增量更新受影响模块条目+unmapped 新文件归属建议（agent 判断后写入；压制『已存在则跳过』规则）」；「生成模块卡片」注入「增量模式：只为 affectedModules 重生成（保留 MANUAL_NOTES 块）；覆盖等待豁免（授权=启动时路径判定输出）；未受影响模块卡零触碰」
  - 注入段格式：前置「⚡ 增量计划」标记块（读 .sillyspec/.runtime/scan-incremental-plan.json 渲染），非增量（计划文件不存在或 mode=full）时四步骤 prompt 逐字与现行一致（C1 零回归关键——注入段是条件前缀不是无条件改动）
  - src/scan-facts.js：buildAndWriteScanFacts 增加 opts.scope（POSIX 路径前缀数组）——非空时 facts 抽取（端点/依赖/规模统计）限定在 scope 内；空/缺省行为与现行逐字一致
  - 既有测试适配核对：test/scan-paths.test.mjs 与 test/scan-facts.test.mjs 若断言 prompt 全文/函数签名，按新增可选参数与条件前缀补断言（增量注入段在无计划文件时不出现的负例）
acceptance:
  - 注入段为条件前缀（「仅当本次 scan 启动输出过⚡增量路径」生效+「否则忽略本段」声明）——非增量会话子代理行为不变（执行期校准：原「prompt 文本逐字一致」措辞过强，设计意图即条件前缀，D-009）
  - 增量计划存在时四步骤 prompt 含注入段（受影响面清单/跳过集/豁免声明/压制声明四要素可见，D-009）
  - buildAndWriteScanFacts({scope:[...]}) 限定抽取；scope 缺省时行为与现行一致（单测正反例）
  - 步骤名/顺序/optional/perProject 元数据与改动前一致（进度库兼容——test/scan-paths.test.mjs 既有断言不红）
verify:
  - node --test test/scan-paths.test.mjs test/scan-facts.test.mjs（既有面回归）
  - node --test test/scan-workflow-anyfailed-block.test.mjs test/stage-definitions.test.mjs（步骤定义面回归）
constraints:
  - 步骤名与顺序零改动（存量进度库按名匹配）；只加条件前缀注入段，不重写既有 prompt 语义
  - 注入段文案中文、自足（子代理只读注入段即可执行增量收窄，不需追问）
  - scan-facts scope 是可选参数——缺省路径零变化
  - 不动 workflow scan-docs.yaml 的角色/检查规则（那是 task-05 文档同步面之外的既有契约）
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
     implementation/acceptance 里的源码位置同样写仓根相对全路径+行号（src/foo.js:123）——
                    裸文件名在 docs-check 层1 靠 basename 全仓扫描找候选，找不到候选或关键词
                    窗口不匹配即失效，到 pre-push 才拦（2026-09-19 实证 64 处返工）。
     可选字段按需插进上方 frontmatter（规则见 taskcard-rules）：
     repo:          仅跨仓 task 填（local.yaml repos: 注册的仓 key；缺省=main。allowed_paths 相对该仓根写，
                    禁止带仓库名前缀/绝对路径——review 对账按仓根相对路径匹配，带前缀永不命中）
     provides:      仅当本 task 给其他 task 提供接口/DTO/响应时填
     expects_from:  仅当本 task 消费其他 task 的契约时填
     related_tests: 仅当本 task 改动导致既有测试断言失效时填（测试路径须同时进 allowed_paths） -->
