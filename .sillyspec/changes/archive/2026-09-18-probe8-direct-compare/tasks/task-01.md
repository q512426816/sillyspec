---
id: task-01
title: 'collectProbe8DiffFiles——diff 源三态 fallback（worktree 双源/in-place 含已提交/design-list）+ 文件分类规则（后缀+目录+.vue frontend）+ design 差集 advisory'
title_zh: 'collectProbe8DiffFiles——diff 源三态 fallback（worktree 双源/in-place 含已提交/design-list）+ 文件分类规则（后缀+目录+.vue frontend）+ design 差集 advisory'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-18 07:47:32
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-01]
decision_ids: [D-001@v1]
allowed_paths:
  - src/verify-probes.js
target_files: [src/verify-probes.js]
provides:
  - contract: diff-files-collector
    fields: [diffFiles, fileClassification, designOnlyPaths, fallbackMode]
goal: >
  新增导出 collectProbe8DiffFiles——probe8 文件源从 design 清单声明面切到 diff 实际面
  （三态 fallback 链），为 task-02/03 提取与 task-05 接线供实际变更文件的分类面与差集素材。
implementation:
  - 新增导出 collectProbe8DiffFiles（入参 cwd/changeName/specBase/repoKeys，独立区块+注释锚定）：主仓三态 fallback 链——worktree 可用时 _readWorktreeMeta（已 import :34）读 baseline（baselineCommit/actualBaseHash/baseHash 同款口径），gitQuiet 数组参数取 diff baseline..HEAD ∪ status --porcelain（-uall 防目录折叠，同构先例 _resolveDiffFilesForParity，contract-matrix.js:404）
  - worktree 缺失（in-place）时主仓退 git diff HEAD~1..HEAD ∪ porcelain（含已提交窗口，Grill B-9）；git 全失败时退 design 清单源（parseFileChangeListDetailed，:32 既有 import）+ 模式注记「文件源=design 清单（diff 不可用）」（fail-open 不抛）
  - 跨仓双源直采——parseRepoRegistry（已 import :33）读 local.yaml → 每注册仓根 git diff HEAD~1..HEAD ∪ porcelain，复刻 collectCrossRepoDiffRoots（run/complete.js:1035）只读口径（不 import run/ 目录，不反向依赖）；仓根不存在/取数失败跳过不炸；弃用 reconcileCrossRepoDeclarations 作采集器（声明触发对账器与 D-001 动机矛盾，Grill B-2）
  - 产物路径一律 unquoteGitPath 归一（git-helper.js:26，并入 :27 既有 git-helper.js import 的具名导出——零新增模块边）
  - 文件分类规则（Grill B-10）——.java→backend；.js/.jsx/.wxml/.vue→frontend（.vue 无条件 frontend，N-2）；.ts/.tsx 按目录启发式裁决（路径含 src/routes|src/pages|src/components|src/models→frontend；路径含 controller|service|mapper|entity|dto|api 或文件头 10 行含 @RequestMapping|@RestController|@Service→backend；两不中→other）；.css/.less/.json/.md/.sql 等→other
  - design 差集——design 清单有但 diff 无的路径收 designOnlyPaths（advisory 注记行素材，不参与对账、不阻断）
  - 返回 source（diff/in-place/design-list 三态）+ frontend/backend/other 三分类文件集 + designOnlyPaths
acceptance:
  - worktree 可用时 source=diff，文件集=baseline..HEAD ∪ porcelain（含未跟踪展开）；三态链各级 fail-open 不抛
  - in-place 态含已提交窗口（HEAD~1..HEAD ∪ porcelain）；git 全失败退 design-list 且带模式注记
  - 跨仓每注册仓双源直采，未注册/失败仓跳过不炸；路径经 unquoteGitPath 归一
  - 分类规则裁决正确（.ts 目录启发式二态/两不中 other/.vue 无条件 frontend/.java→backend）
  - designOnlyPaths 差集产出；零新增模块 import 边（unquoteGitPath 并入既有 git-helper.js import）
verify:
  - npm run lint
  - node --test test/probe8-payload-parity.test.mjs test/probe8-contract-pivot.test.mjs
constraints:
  - 零新增模块边——unquoteGitPath 仅并入 :27 既有 git-helper.js import，不新引任何模块
  - 不动 runProbe8PayloadParity 既有对账逻辑（接线归 task-05）；probe1-7/9 零改动
  - git 取数失败 fail-open 降级不崩；design 差集 advisory 不参与对账不阻断
  - 跨平台——ASCII 正则+utf8 读取+unquoteGitPath 归一（quotepath 关闭场景可解）
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
