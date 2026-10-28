---
author: flow-machine-draft
created_at: 2026-10-28T04:37:52.062Z
---
# 需求规格（Requirements）— 2026-10-28-shadow-checkpoint

## 功能需求

### FR-01: task tick 成功勾选时自动落影子提交到 refs/sillyspec/checkpoints/<change>，快照覆盖 tracked+untracked，全程零触碰共享 index（双会话并发测试断言暂存区不变）

- task tick 成功翻格后，CLI **必须**通过会话隔离的临时索引（GIT_INDEX_FILE，路径含会话标识）落一个影子提交到 `refs/sillyspec/checkpoints/<change>`：临时索引以 `read-tree HEAD` 起底、`add -A`（含硬排除清单）吸收 tracked 改动与未忽略 untracked，`write-tree` + `commit-tree` 成链（父=上一存档，首档父=当时 HEAD）。全程**禁止**读写共享 index（staged 面与 index 锁不得变更）；checkpoint 自身任何失败**必须** fail-open——跳过并留一行回显，禁止阻断 tick 主流程。

#### 场景：主路径（落档+零触碰）

- Given：临时 git 仓，HEAD 有基线提交，工作区有 tracked 修改 + 未忽略 untracked 新文件，暂存区已有他者 staged 条目
- When：task tick 成功翻格
- Then：`refs/sillyspec/checkpoints/<change>` 存在，其树同时含 tracked 修改与 untracked 新文件；`git diff --cached --name-only` 在 tick 前后逐字节一致；临时索引文件已清理

#### 场景：checkpoint 失败不阻断 tick

- Given：体积护栏触发跳过（见 FR-04）或 git 调用异常
- When：task tick
- Then：翻格照常成功（exit 0），仅回显一行 skip/warn 留痕

### FR-02: 无变化时跳过不落对象（tree SHA 相同 no-op）

- 相邻两次存档间工作区无任何变化时（`write-tree` 结果与现 ref 指向的树 SHA 相同），CLI **必须**跳过对象写入与 ref 翻转（no-op 判定），并**禁止**产生新的提交对象或变更 ref。

#### 场景：连续无改动

- Given：已存在一档，之后工作区无任何 tracked/untracked 变化
- When：再次触发存档（下一次 tick）
- Then：返回 noop 态，ref SHA 不变，对象库无新 commit

### FR-03: 支持列出与恢复：读档前 diff 预览，按路径选择性恢复

- CLI **必须**提供存档面：`sillyspec checkpoint --change <名>` 列出存档链（SHA、taskId、时间、增量文件数）；`--diff <sha> [--path <p>]` 给出工作区与该存档的差异预览；`--restore <sha> --path <p>` 按 pathspec 选择性恢复（`git restore --source`，仅写工作区，禁止触碰 index）。整树恢复（`--all`）**必须**要求显式 `--yes` 双确认；按路径恢复同样要求 `--yes`（或先 `--diff` 同参数预览后带确认执行）。

#### 场景：按路径读档

- Given：某文件在存档点之后被改崩
- When：`checkpoint --restore <sha> --path <该文件> --yes`
- Then：仅该文件回到存档内容，其余工作区文件与 index 不变

### FR-04: 体积护栏：未忽略 untracked 总量超阈值跳过并留痕，不阻断 tick

- 未忽略 untracked 文件总量超过阈值（缺省 200MB，`checkpoint.maxUntrackedMB` 可调）时，CLI **必须**跳过本次存档并留痕（skip 原因一行回显），**禁止**阻断 tick；阈值判定**必须**带早停（累计超限即止，不遍历全树）。

#### 场景：超阈值跳过

- Given：阈值设为极小值，untracked 存在超限文件
- When：task tick
- Then：翻格成功，存档 skipped 留痕，ref 不变

### FR-05: change-delete 时同步删除对应 checkpoint ref

- `change-delete --confirm` 删除变更时，CLI **必须**同步删除 `refs/sillyspec/checkpoints/<change>`（best-effort：删除失败仅警告，不阻断删除主流程）；变更归档**禁止**删除该 ref（审计面保留）。

#### 场景：删除变更清 ref

- Given：变更存在且已有存档链
- When：change-delete --confirm 成功
- Then：对应 checkpoint ref 不存在

### FR-06: local.yaml 配置开关（缺省开启）

- `.sillyspec/local.yaml` 的 `checkpoint.enabled: false` 时，CLI **禁止**落任何存档（tick 照常）；键缺失或无 local.yaml 时**必须**等价于开启；local.yaml 解析失败**必须** fail-open 取缺省值。

#### 场景：开关关闭

- Given：local.yaml 写有 checkpoint.enabled: false
- When：task tick
- Then：翻格成功，无 ref 写入

### FR-07: 纯 git plumbing 实现，无新依赖，Windows/Linux/macOS 兼容

- 实现**必须**仅使用 git plumbing 子进程（read-tree/add/write-tree/commit-tree/update-ref/restore）与 Node 内置模块，**禁止**新增 npm 依赖；路径处理**必须**三平台兼容（沿用仓内既有 quotepath 归一与跨平台路径口径）。

#### 场景：Windows 实测

- Given：Windows（本仓主开发平台）
- When：全套用例在本机执行
- Then：全部通过，package.json 依赖面零新增

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/shadow-checkpoint.test.mjs「create 落档：树含 tracked+untracked、共享 index 零触碰、临时索引清理」
FR-02: test/shadow-checkpoint.test.mjs「无变化 no-op：ref 与对象库不变」
FR-03: test/shadow-checkpoint.test.mjs「list/diff 预览/按路径 restore 仅写工作区」
FR-04: test/shadow-checkpoint.test.mjs「体积护栏超阈值跳过留痕且 tick exit 0」
FR-05: test/shadow-checkpoint.test.mjs「change-delete 后 ref 清除；deleteCheckpointRef 失败不阻断」
FR-06: test/shadow-checkpoint.test.mjs「enabled=false 不落档；无键/解析失败缺省开启」
FR-07: test/shadow-checkpoint.test.mjs「全套在 Windows 实测跑绿 + package.json 依赖零新增断言」
