---
id: task-02
title: 'No-op file exclusion in applyWorktree (worktree hash-object vs main HEAD blob)'
title_zh: 'no-op 文件剔除（`applyWorktree` hash-object vs 主仓 HEAD blob 对照）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-15 21:34:09
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-02]
decision_ids: [D-002@v1]
allowed_paths:
  - src/worktree-apply.js
target_files:
  - src/worktree-apply.js
goal: >
  修坑②——applyWorktree step 2 的 changedFiles 锚 baseline checkpoint（deliverableBase），
  主仓 HEAD 在 execute 期间前进后，worktree 中「内容=主仓 HEAD」的自救/重同步文件 diff 非空
  但 apply 回主仓实为 no-op，被 assess 误判「变更文件超出 allowed_paths」BLOCKED。本 task 在
  filterDeliverableFiles 之后增 no-op 剔除段（单点 choke point，apply 与 assess checkOnly 同
  口径）——候选文件 worktree 工作区 blob（hash-object 分批）对照主仓 HEAD ls-tree blob map，
  相等者剔出交付三集并计 warnings 逐文件可见。
implementation:
  - 在 applyWorktree step 2 的 changedFiles = filterDeliverableFiles(allChangedRaw) 之后（src/worktree-apply.js:1209，droppedScaffold 可见性段附近）新增 no-op 剔除段；勿动 step 2 其余锚定语义（deliverableBase = baselineCommit || baseHash，:1145）
  - 候选集收窄（R-03）——statusFiles ∪ untrackedFiles（:1186-1203）中「worktree 工作区文件存在（existsSync(join(worktreePath, f))）」者，删除类（worktree 无文件）天然出局；再与「主仓 HEAD 树存在该路径」者取交集
  - 主仓 blob map 复用既有 getBlobHashMap（:430——git ls-tree 口径、内部已 chunkPaths 分批）；worktree 工作区 blob 用 git hash-object --stdin-paths 于 worktreePath 分批执行——复用既有 chunkPaths（:454，8000 字符/批），批次输出按行序拼接与候选路径索引对齐（ql-20260912-010 先例；worktree.js _changesAlreadyOnMain:1801-1816 的 argv 分批同型实现可参照）
  - hash-object 某批失败 → 该批各文件保守不剔（保留 changed——退回现状误报而非误放行，D-002 故障面契约）；每调用现算不缓存（R-02——assess 与 apply 间主仓 HEAD 推进时以各自当下事实为准）
  - 相等文件集对 changedFiles/deletedFiles/absentAfterMerge 三集做防御性剔除（候选已限工作区存在，正常不命中后两集，防御性过滤保不变式）；result.warnings 追加 no-op 告警行——数量 + 截断文件列表 + 语义说明（worktree 内容=主仓 HEAD，apply 实为 no-op，已剔除出交付集）
  - 路径对齐——blob map 键与候选路径的对照键统一 unquoteGitPath（git-helper.js:26）+ 正斜杠归一（core.quotepath 非 ASCII 引号、Windows 反斜杠）；changedFiles 内路径字面保持现状口径不变（下游 pathMatches/gates/archive-delta 零改动）
  - 新增 NEW:test/worktree-dual-truth-gates.test.mjs（本 task 段）——①构造 base 提交后主仓 HEAD 前进至新内容、worktree 内同步成同内容的文件，断言 changedFiles 不含该文件且 warnings 列出，apply 与 assess（checkOnly）两道同口径；②内容≠主仓 HEAD 的文件保留 changed；主仓 HEAD 无该路径的新文件保留；③删除类不参与判定、deletedFiles 行为不变；④零回归——无 no-op 候选的常规场景 changedFiles 与现状一致
acceptance:
  - 'FR-02 GWT1：worktree 工作区内容与主仓 HEAD blob 相等的文件（相对 baseline checkpoint 有 diff）从 changedFiles/deletedFiles/absentAfterMerge 剔除，result.warnings 含 no-op 清单行（文件名可见）；apply 与 assess（checkOnly 复用 applyWorktree）同口径'
  - 'FR-02 GWT2：内容 ≠ 主仓 HEAD blob 的文件与「主仓 HEAD 无该路径」的新文件保留在 changedFiles（判定不受影响）；删除类（worktree 无文件）不参与判定、行为不变'
  - hash-object 批失败 fail-safe——该批文件保守保留在 changedFiles（不误放行）
  - 不缓存——assess 与 apply 两次调用间主仓 HEAD 推进时判定以各自当下事实为准（现算）
  - test/worktree-apply-meta-exclude.test.mjs、test/worktree-allow-list-violations.test.mjs 与新增测试全绿
verify:
  - '本卡新增用例由 task-06 统一收口（test/worktree-dual-truth-gates.test.mjs 五组）'
  - node --test test/worktree-apply-meta-exclude.test.mjs test/worktree-allow-list-violations.test.mjs
  - npm test && npm run lint （全量回归零红零告警，task-06 收口后全量跑）
constraints:
  - 单点 choke point——只在 applyWorktree step 2 过滤，勿在 assessApplyRisk / gates 侧另加同款过滤（D-002 否决双口径漂移）
  - 勿改 getBlobHashMap / chunkPaths / filterDeliverableFiles 既有签名与语义（只复用）；除 warnings 外无对外 result 字段新增
  - fail-safe 方向固定——hash-object/ls-tree 失败保守不剔，禁反向误放行
  - changedFiles 路径字面与现状一致（unquote/归一仅用于对照键，不回写）
  - Edit 前重读文件最新态（R-06——worktree-apply.js 有并行会话在途改动）；保持 LF 行尾、frontmatter 闭合
related_tests:
  - test/worktree-apply-meta-exclude.test.mjs
  - test/worktree-allow-list-violations.test.mjs
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
