---
id: task-01
title: '探针 7 主体——verify-probes.js acceptance 自解析+双源结构归属+关键词提示+骨架渲染/幂等补段 + NEW:test/acceptance-matrix-probe.test.mjs'
title_zh: '探针 7 主体——verify-probes.js acceptance 自解析+双源结构归属+关键词提示+骨架渲染/幂等补段 + NEW:test/acceptance-matrix-probe.test.mjs'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-14 23:45:45
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-01]
decision_ids: [D-001@v1]
allowed_paths:
  - src/verify-probes.js
  - src/index.js
  - NEW:test/acceptance-matrix-probe.test.mjs
target_files:
  - src/verify-probes.js
  - src/index.js
  - NEW:test/acceptance-matrix-probe.test.mjs
goal: >
  在 verify-probes.js 落地探针 7（验收×测试覆盖矩阵）机械半边——acceptance 自解析、双源测试归属、关键词提示、骨架渲染与幂等补段，并在 --init 接线，让每条 TaskCard acceptance 的测试承接从隐式变显式可核对。
implementation:
  - runVerifyProbes 新增探针 7 段：verify-probes.js 内自行 jsYaml 解析 tasks/*.md frontmatter 的 acceptance（string/array 双形态，口径锚 src/stages/plan-postcheck.js:1322-1326——parseTaskContracts 只返回 provides/expects_from 不含 acceptance，不走它）
  - 双源结构归属：每 task 归属测试文件 = allowed_paths 中匹配测试模式（test/ 前缀或 *.test.* / *_test.* / spec 惯例）的路径 ∪ execute-runs 当前 runId 下该 task review.json changedFiles 中 test/ 前缀路径；runId 由内联读取 marker current-execute-run-id-<change> 解析（目录扫描兜底）——禁静态 import task-review（task-review→verify-postcheck→verify-probes 三步环，先例 verify-probes.js:438 分层注释）
  - 关键词提示：从 acceptance 行提取 [A-Za-z_][A-Za-z0-9_]{2,} 标识符与 ≥2 字 CJK 片段，在归属测试文件内容 grep，记录命中词与命中文件（上限 5 词防膨胀；命中≠判定）
  - 骨架渲染「#### 探针 7：验收×测试覆盖矩阵」插在探针 3 段后（3.5 已被断言有效性抽查占用，顺延取 7 兼容锚定正则 /#### 探针 (\d+)/）：每 task 一表五列（acceptance 条目 / 归属测试文件 / 关键词命中提示 / 判定 / 证据），判定列预填 <待填：四选一>、证据列 <TODO>；无 TaskCard 整段渲染「不适用」；与探针 3 并排输出时注记口径差异（3=模块目录递归存在性面，7=结构归属承接面，冲突以 7 为准）
  - runVerifyProbes 返回值新增 probe7 字段（applicable 顶层键，无 tasks/ 为 false）：tasks 数组每卡含 task、acceptance 列表、testFiles 并集、hints——hints 用普通对象（键为 acceptance 行序号，值 {terms, files}），可 JSON 序列化
  - 新增 ensureAcceptanceMatrixSection 幂等补段：verify-result.md 已存在但缺矩阵段时仅追加骨架段不触既有正文（学 backfillMissingEvidenceSlots 形态）；src/index.js --init 接线（动态 import + 调用，先例 backfillMissingEvidenceSlots 调用点 src/index.js:1112 一带），追加成功后同步镜像 verify-result.md
  - 边界形态：acceptance 为空的卡渲染「（卡无 acceptance——plan-postcheck 已拦缺失，此处防御）」不产生待填槽；归属测试为空时提示列写「无归属测试——判定大概率 uncovered」；关键词提取空时提示列写「—」
  - 新建 test/acceptance-matrix-probe.test.mjs：覆盖归属判定（allowed_paths∪review 双源各一例）、关键词提示、无 TaskCard 不适用、骨架渲染，以及补段幂等二跑零改动用例
acceptance:
  - probe7 输出符合接口定义——applicable 为顶层布尔（无 tasks/ 时 false，brownfield 零行为变化），每卡含 acceptance 列表、归属测试文件并集、hints 普通对象可 JSON 序列化
  - 归属双源均有测试证明：allowed_paths 测试模式命中例 + 当前 runId review.json changedFiles test/ 前缀例（runId 经内联 marker 解析，全文件零 task-review 静态 import）
  - 骨架含「#### 探针 7：验收×测试覆盖矩阵」且位于探针 3 段后，四枚举槽+证据列在位，无卡场景渲染「不适用」
  - ensureAcceptanceMatrixSection 幂等——补段后对同一文件二跑零改动（单测断言）
  - node test/acceptance-matrix-probe.test.mjs 全绿，既有探针相关测试零回归
verify:
  - node test/acceptance-matrix-probe.test.mjs
  - npm run lint
constraints:
  - 只动 allowed_paths 三文件；probe7 不进 buildVerifyFacts 机器段（白名单显式枚举 1/3/5/6 不扩，verify-facts.json fixtures 零牵动）
  - 关键词提示不参与门禁判定（防误报阻断，R-03），提示列头部固定标注「命中≠判定」
  - 禁新增 verify-probes→task-review 静态 import（三步环），review runId 读取内联完成
  - 幂等补段与骨架渲染不触碰既有正文；hints/applicable 结构按接口定义落地（applicable 顶层键）
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
