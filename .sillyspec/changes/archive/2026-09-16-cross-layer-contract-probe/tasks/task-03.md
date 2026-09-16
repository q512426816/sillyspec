---
id: task-03
title: 'Tests: NEW test/probe8-contract-pivot.test.mjs five cases (contract orphan hit / missing required hit / aligned zero noise / no-contract skipped / non-contract table excluded)'
title_zh: '测试——NEW:test/probe8-contract-pivot.test.mjs 五用例（契约外键命中/必填漏发命中/对齐零新告警/无契约面 skipped/非契约表不入面）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-16 12:40:58
priority: P0
depends_on: ['task-01']
blocks: []
requirement_ids: [FR-01, FR-02, FR-03, FR-04]
decision_ids: [D-001@v1, D-002@v1]
allowed_paths:
  - test/probe8-contract-pivot.test.mjs
target_files: [NEW:test/probe8-contract-pivot.test.mjs]
goal: >
  为探针8 两新契约维度建 NEW:test/probe8-contract-pivot.test.mjs 五用例——锁定
  contractOrphans/missingRequired 命中语义、对齐零新告警、无契约面 skipped 与非契约表判据。
implementation:
  - 新建 test/probe8-contract-pivot.test.mjs：fixture 手法参照既有 test/probe8-payload-parity.test.mjs:26-28（mkdtempSync 临时仓 + test.after 递归清理）与 :81-146 端到端形态（mainRoot 临时主仓 + .sillyspec/changes/<name>/design.md fixture + runProbe8PayloadParity({specBase, cwd, wtRoot, changeName}) 调用）；契约面直接写进 design.md 的「接口定义」章节表格（章节判据 + 表头首列「字段」），纯函数用例直测 parseDesignContracts 导出。
  - 用例1 契约外键命中：契约表含 safelyHiddenId，前端载荷含 sourceShdId（无词法关系——归一化/子串/Jaccard 全不命中）→ contractOrphans 含 sourceShdId；断言既有 mispairs/feOnly 面不受影响（feOnly 仍含该键）。
  - 用例2 必填漏发命中：契约 reportOrgId 标必填 + 接口定义章含 POST 行，feKeys 无该键 → missingRequired 命中；同面去掉 POST 行（改 GET）→ 不报。
  - 用例3 契约内对齐零新告警：载荷键全 ∈ 契约字段 → contractOrphans/missingRequired 两数组空，既有维度照常输出。
  - 用例4 无契约面 skipped：design 无契约章节（仅文件清单）→ contractCount=0 + 注记（notes/渲染注记），两新数组空、不误报不空段。
  - 用例5 非契约表不入面：design 含文件清单表（首列「操作」）与风险登记表（首列「#」）→ 表头判据生效不被误当契约面，contractCount=0。
acceptance:
  - 用例1 契约外键命中：sourceShdId ∉ 契约面（含 safelyHiddenId）→ contractOrphans 命中且既有 mispairs/feOnly 输出不受影响。
  - 用例2 必填漏发命中：reportOrgId 标必填 + POST 行在场 + feKeys 无该键 → missingRequired 命中；无 POST 行不报。
  - 用例3 对齐零新告警：载荷键全 ∈ 契约字段 → 两新数组空、既有维度照常输出。
  - 用例4 无契约面 skipped：contractCount=0 + 注记，不误报不空段。
  - 用例5 非契约表不入面：文件清单表/风险表不被误当契约面（表头首列判据生效）。
verify:
  - node --test test/probe8-contract-pivot.test.mjs（五用例全绿）
  - npm test（全量——既有 test/probe8-payload-parity.test.mjs 五组零触碰零失败）
constraints:
  - 不改既有 test/probe8-payload-parity.test.mjs（直接比对面回归由其锁定）。
  - 不改 src/（纯测试卡——发现实现缺陷回流 task-01 修，不在本卡内改实现）。
  - fixture 独立可重复：临时目录自清理、跨平台路径（Windows/Linux/macOS 均可跑）、不依赖外部环境。
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
