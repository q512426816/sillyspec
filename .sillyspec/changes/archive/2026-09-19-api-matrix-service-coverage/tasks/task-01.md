---
id: task-01
title: 'verdict layer: covered-service in stage-contract (whitelist/evidence-anchor/accounting/advisory/gate copy)'
title_zh: '判定层——src/stage-contract.js 白名单五枚举/matrixEvidenceMissing 联动/covered-service 测试锚点分支/记账分子并入+advisory/门禁文案四处'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-19 06:32:08
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-01, FR-02]
decision_ids: [D-001@v1, D-002@v1]
allowed_paths:
  - src/stage-contract.js
target_files:
  - src/stage-contract.js
goal: >
  在判定层 src/stage-contract.js 引入第五判定形态 covered-service（service 层承接）——计入覆盖分子满足覆盖等式、证据列强制测试锚点（缺锚点 error）、单独 advisory 计数；两矩阵门（探针 7 门 :872 / 接口矩阵门 :1062）的 unfilled 判定与门禁文案同步认新枚举。消灭「端点行为由 service 层测试锁定、无端点级用例却被迫虚标 covered」的诚实性漏洞（design 背景 dispatch-now 实证）。
implementation:
  - 步骤一（白名单五枚举，design Wave1.1）：src/stage-contract.js :789 MATRIX_VERDICT_WHITELIST 数组加入 'covered-service'——两消费点（:872 extractAcceptanceMatrixSlots / :1062 extractApiCoverageMatrixSlots 的 unfilled 判定）经 Set.has 自动认新值，无需单独改；同步 :788 JSDoc「判定列四枚举白名单」为「判定列五枚举白名单」、:785-786 段格式注释中「判定槽 <待填：四选一>」字样为五选一口径（注释与白名单实态同源）。
  - 步骤二（matrixEvidenceMissing 联动，design Wave1.2）：:829-835 首行条件（:830）verdict !== 'covered' && verdict !== 'partial' && verdict !== 'non-testable' 追加 && verdict !== 'covered-service'——covered-service 行与 covered 同口径（证据非 TODO 非空且须含 matrixEvidenceHasAnchor :817 三形态锚点 .test. / file:line / 反引号），缺则 evidenceMissing=true；:826 JSDoc 口径注释同步列 covered-service；函数签名不动。
  - 步骤三（接口矩阵锚点校验分支，design Wave1.3）：:1181-1191 循环加 covered-service 分支——verdict === 'covered-service' 的行只做 matrixEvidenceHasAnchor(r.evidence) 测试锚点校验（缺锚点 anchorViolations.push，行文案含 rowLabel(r) 与 covered-service 字样），随后跳过 covered/partial 的 design接口表# matchAll 空指核对与 apiEvidenceHasAnchorForm 五形态校验（covered-service 的证据就是测试本身，不要求 design 侧锚点）；:1194-1196 聚合 error 文案补 covered-service 三形态口径一句；covered/partial 行为逐字不变。
  - 步骤四（记账分子并入 + advisory，design Wave1.4）：:1213-1232——:1217 coveredCount 改为 covered 行 + covered-service 行合计（serviceCoveredCount 单独计数）；:1218 coveredSet 过滤条件并入 verdict === 'covered-service' 行的 METHOD /path 命中（missingEndpoints 随之不含这些端点，覆盖等式满足）；:1229 缺覆盖 error 分子口径改「covered+covered-service 分子 ${coveredCount}」；serviceCoveredCount > 0 时 warnings.push 形如「[advisory] ${serviceCoveredCount} 端点由 service 层测试承接（非端点级）……（不阻断）」——放 covered 记账块内，只进 warnings 不进 errors。
  - 步骤五（门禁文案五枚举四处，design Wave1.5）：:928 探针 7 门 unfilled「（四选一 covered/partial/uncovered/non-testable）」改「（五选一 covered/covered-service/partial/uncovered/non-testable）」、:929 占位指引「<待填：四选一>」改「<待填：五选一>」；:936 探针 7 门 missingEvidence 枚举列举补 covered-service（covered/covered-service/partial 证据须含测试锚点）；:1175 接口矩阵 unfilled 同步五选一、:1176 占位指引同步「<待填：五选一>」（占位字面与 verify-probes.js render 产出同源，见 design 接口定义）。
  - 步骤六（缺覆盖修复指引，design Wave1.6）：:1230 修复句补 covered-service 出路——追加「端点行为由 service 层测试锁定的改 covered-service 并填测试锚点（.test. / file:line / 反引号）」，保留既有 non-testable 与移交出路句不删。
  - 步骤七（零改动核验，design Wave1.7 只读确认不改）：:1246-1250 移交联动 partialRows 过滤条件为 partial/uncovered（covered-service 天然不进）；PASS 封顶 evaluatePassEligibility 条件④消费 facts.matrixPartialRows（探针 7 矩阵计数），接口矩阵 covered-service 行不进该计数——执行期不得顺手改这两处。
acceptance:
  - MATRIX_VERDICT_WHITELIST 为五枚举 {'covered','covered-service','partial','uncovered','non-testable'}（node -e 打印 Set 可证）。
  - judgeApiCoverageMatrix 对最小矩阵（apiFace 端点全部 covered-service 且证据含 .test. 锚点）返回 ok=true、errors 为空——coveredCount 计分子使分子不小于有效分母且 coveredSet 命中使 missingEndpoints 为空。
  - judgeApiCoverageMatrix 对 covered-service 行证据缺测试锚点（<TODO> 或无锚纯文本）返回 errors 含该行锚点缺失项（anchorViolations 路径）。
  - serviceCoveredCount > 0 时返回 warnings 含「端点由 service 层测试承接（非端点级）」advisory，且 ok 不因此变 false。
  - matrixEvidenceMissing('covered-service', '<TODO>') === true 且 matrixEvidenceMissing('covered-service', '`test/foo.test.mjs`') === false（node -e 可证；函数未导出则经 extractAcceptanceMatrixSlots 的 missingEvidence 计数间接断言）。
  - 纯四枚举路径逐字不变——git diff -- src/stage-contract.js 确认 :1182 既有 covered/partial 校验、:1190 五形态校验、:1200 non-testable 校验、:1246-1250 移交联动零改动；文件内「四选一」字样清零。
verify:
  - node --check src/stage-contract.js（语法冒烟）
  - node -e 定向行为冒烟（不跑全量，测试收口归 task-04）——内联 import('./src/stage-contract.js') 取 judgeApiCoverageMatrix，构造最小 covered-service 矩阵（apiFace.endpoints + matrix.rows 合成）断言 acceptance 第 2-4 条（计分子放行 / 缺锚点 error / advisory 在场）
  - git diff -- src/stage-contract.js 核对 acceptance 第 6 条零改动面（:1182/:1190/:1200/:1246-1250）
constraints:
  - 存量四枚举文档校验行为逐字不变——covered/partial/uncovered/non-testable 路径零改动，covered-service 是纯新增分支（plan 全局硬约束第 1 条）。
  - covered-service 锚点校验复用同文件 matrixEvidenceHasAnchor（:817 三形态），禁第二套解析文法（第 2 条）。
  - 零 facts schema 变更——verify-facts.json 零新字段，advisory 由 stage-contract 从 MD 槽直接判（第 3 条）。
  - stage-contract 零 import verify-probes 铁律不破（零新增依赖边，第 4 条）。
  - 移交联动（:1247/:1248）与 PASS 封顶条件④零改动——covered-service 不进 partial/uncovered 集是设计核验事实，不许顺手改（第 5 条）。
  - 不做 service 承接占比上限；不动回执门禁/集成证据门/写端点权限 advisory（第 6 条）。
  - 零新正则零路径拼接（第 8 条）。
  - 本卡不加测试不改 test/——五组新用例与既有断言同步（api-coverage-matrix.test.mjs :118/:155/:201/:204 文案与分子口径）归 task-04 收口。
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
