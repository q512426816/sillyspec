---
author: flow-machine-draft
created_at: 2026-10-10T11:04:18.181Z
---
# 需求规格（Requirements）— 2026-10-10-repo-inline-worktree-placement

## 功能需求

### FR-01: parseRepoRegistry 双形态解析：字符串条目行为逐字节不变；对象条目（块式 key: 后缩进子键 / inline {path:.., worktree:..}）Map 值恒取 path（13 个消费文件零改动）；新增 parseRepoWorktreePlacements 导出读 worktree 子键

- 必须：repos 条目为字符串形态（`key: <路径>`）时 parseRepoRegistry 返回值与升级前逐字节一致；条目为块式对象或 inline 对象时 Map 值必须取 `path` 子键，且 'path'/'worktree' 键名禁止作为 repoKey 混入 Map。
- 必须：parseRepoWorktreePlacements 必须只对对象条目返回 `worktree` 子键值（字符串条目无落位语义不入 Map）。
- 禁止：块式子键行（path:/worktree: 行）被当成条目重复匹配。

#### 场景：主路径
- Given local.yaml repos 段混排字符串/块式/inline 三形态
- When parseRepoRegistry 与 parseRepoWorktreePlacements
- Then registry 值全部为各仓 path（键名无污染）、placements 只含对象条目的 worktree 值

### FR-02: ensureCrossWorktrees 落位优先级：repos.<key>.worktree > worktree.crossPlacement.<key> > 默认公式；仓根内拒绝/注册表/WSL 警告语义对两配置源一致

- 必须：两配置源同时在场时落位取 repos 内联值；仅 legacy 段在场时取 crossPlacement；均缺席走默认公式（逐字节不变）。
- 必须：经任一配置源解析出的落位根在跨仓仓根内时必须拒绝创建（fail-closed），注册表写入与 WSL 分裂警告语义与配置源无关。

#### 场景：主路径
- Given repos.front 配内联 worktree=A 且 crossPlacement.front=B
- When ensureCrossWorktrees
- Then worktree 落 A、B 目录无任何产物

### FR-03: hooks/worktree-guard analyzeCrossRepoCd 与 worktree-deps registeredRepoRoots 对对象形态不失效（cd 纠偏取 path；roots 集合不含 worktree 子键值）

- 必须：repos 条目为块式对象时跨仓 cd 纠偏必须按 path 子键解析仓根；inline 对象字符串形态同样取 path。
- 禁止：worktree 子键值（落位根）混入 registeredRepoRoots 越界豁免集合。

#### 场景：主路径
- Given repos.urgent 为块式对象条目
- When verify 阶段从主仓跑 `cd ../urgent && npx eslint`
- Then 纠偏/放行判定与字符串形态行为一致

### FR-04: config-schema 文档：repos.<key>.worktree 键条目 + crossPlacement 标注兼容保留（推荐 repos 内联）

- 必须：`sillyspec config schema` 输出的 worktree.crossPlacement 条目必须标注推荐迁移 repos 内联与优先级关系；示例注释区必须含 repos 内联形态样例。

#### 场景：主路径
- When sillyspec config schema
- Then crossPlacement 条目 desc 含「推荐迁移」与优先级说明，example 注释含 repos 内联样例

### FR-05: 测试：双形态解析/优先级/旁路消费方不失效，全绿

- 必须：本变更触达面的测试（parse-repo / cross-worktree-placement / deps 全家 / guard / cross-repo 系列 / plan-postcheck 系列）在收口时全部通过。

#### 场景：主路径
- When 跑相关面测试
- Then 0 fail

## 测试绑定（每条 FR 至少一行）

FR-01: test/parse-repo.test.mjs「场景 16：对象条目块式 + inline」「场景 17：块式条目后紧跟下一条目」
FR-02: test/cross-worktree-placement.test.mjs「repos 条目内联 worktree 落位 + 优先级高于 crossPlacement」
FR-03: test/worktree-guard-cross-repo-cd.test.mjs（既有 cd 纠偏回归）+ test/worktree-deps-sibling-repo.test.mjs（roots 豁免回归）
FR-04: 不适用：纯文档键条目——收口时 `sillyspec config schema` 实测输出含标注（verify 回执留痕）
FR-05: test/cross-worktree-placement.test.mjs + test/parse-repo.test.mjs 全文件（收口 CLI 实测门复跑）
