---
author: flow-machine-draft
created_at: 2026-10-28T06:03:11.596Z
---
# 需求规格（Requirements）— 2026-10-28-overlap-route

## 功能需求

### FR-01: 两个活跃变更声明同一文件时 detectDeclaredOverlaps 检出（文件+归属变更清单），声明不相交返回空（测试断言）

- `detectDeclaredOverlaps({cwd, specBase})` **必须**枚举活跃变更（changes/ 下非 archive 目录），按声明加载单一源（design §6 清单 ∪ task 卡 allowed_paths/target_files——复用 loadOwnDeclaredSet）构建文件→变更集反查表，声明同一文件的变更数 ≥2 时**必须**返回 `{file, changes[]}` 条目；全部不相交时**必须**返回空数组；任何读取失败**必须** fail-open 对该变更取空集，**禁止**抛出。

#### 场景：双变更同声明

- Given：临时 spec 根下两个活跃变更的 design §6 都声明 src/main.js
- When：detectDeclaredOverlaps
- Then：返回含 {file:'src/main.js', changes:[两变更名]}；再建一个声明不相交的变更后仍只检出该一条

### FR-02: 已归档变更的声明不参与重叠判定（测试断言）

- 已归档变更（changes/archive/ 下）的声明**禁止**参与重叠判定——活跃枚举只扫 changes/ 顶层非 archive 目录，归档件不进反查表（测试：归档一个重叠方后重叠消失）。

#### 场景：归档退出

- Given：FR-01 的重叠在案
- When：把其中一个变更目录移入 changes/archive/
- Then：detectDeclaredOverlaps 返回空

### FR-03: sillyspec overlap 列重叠并附分流指引（先到主检出、后到建议 worktree apply；落地序列：先落地干净进、后落地三方合并、并发由 main-repo.lock 串行）

- `sillyspec overlap` **必须**列出仓级重叠（文件 ← 归属变更），并在有重叠时输出分流指引（其一转 worktree 形态：`sillyspec worktree apply --change <名>`）与落地序列说明（先落地者干净进主线；后落地者 apply --3way 三方合并；并发落地由既有 main-repo.lock 串行）；无重叠时**必须**输出零重叠确认行；命令**禁止**非零退出（advisory 查询面）。

#### 场景：有重叠查询

- Given：FR-01 fixture
- When：sillyspec overlap
- Then：exit 0，输出含文件名、两变更名、worktree apply 指引

### FR-04: flow verify-drafts 自查通过后，当前变更声明与他人活跃变更相交时输出一行路由提示（advisory 非阻断，检测失败静默不拦批准）

- verify-drafts 人类渲染在「自查通过」输出后，若当前变更声明与≥1 个其他活跃变更相交，**必须**输出一行路由提示（重叠文件 + 对方变更 + worktree 分流建议 + 落地序列一句）；检测任何异常**必须**静默跳过（advisory fail-open），**禁止**影响退出码与批准门判定。

#### 场景：批准前路由提示

- Given：变更 A 已有 design §6 声明且与活跃变更 B 相交
- When：flow verify-drafts --change A
- Then：自查通过行后出现「重叠路由」提示行；exit 0 不变

### FR-05: 既有 verify-drafts/批准门零回归，零新依赖

- 既有 verify-drafts 判定与批准门行为**必须**零变化（重叠提示只在通过分支追加输出行）；实现**禁止**新增 npm 依赖。

#### 场景：零回归

- Given：本变更交付后
- When：跑 verify-drafts 相关既有测试 + 批准门测试
- Then：全部通过，无重叠时输出与改动前逐字一致

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/overlap-detect.test.mjs「双变更同声明检出/不相交返回空/损坏声明空集 fail-open（含反斜杠归一）」
FR-02: test/overlap-detect.test.mjs「归档方退出重叠判定」
FR-03: test/overlap-detect.test.mjs「sillyspec overlap 动词：有重叠列清单附分流与落地序列指引/零重叠确认行/恒 exit 0」
FR-04: test/overlap-detect.test.mjs「overlapAdvisoryFor 纯函数：相交出路由提示文案/无相交 null（flow.js 钩子为三行薄接线 fail-open，逻辑面在纯函数侧覆盖；集成路径经 FR-05 既有套件回归兜底）」
FR-05: test/flow-verify-drafts.test.mjs「verify-drafts 判定面既有 5 用例零回归」+ test/approve-gate-tick.test.mjs「批准门 7 用例零回归」
