---
author: flow-machine-draft
created_at: 2026-10-10T03:18:39.120Z
---
# 需求规格（Requirements）— 2026-10-10-worktree-salvage-archive-aware

## 功能需求

### FR-01: 归档态打捞必须逐文件识别归档搬运，禁止复制回原路径复活已归档目录

主仓 `changes/<name>/` 原路径缺失且 `changes/archive/<name>/` 已有对应文件时，打捞必须跳过该文件不复制（判定为归档搬运而非 worktree 独有），禁止因此重建 `changes/<name>/` 原路径目录；archive 副本内容禁止被 worktree 旧快照覆盖；跳过发生时必须在打捞输出中汇总一行 warn（含跳过数与归档搬运原因）。

#### 场景：归档后清理不复活（下游实证：2026-10-09-attachment-inline-reference 残留 13 文件）

- Given：变更已归档（目录在 `changes/archive/<name>/`，原路径 `changes/<name>/` 整体不存在），worktree 残留含 `changes/<name>/` 旧快照
- When：worktree cleanup（归档正常路径 / 归档自愈路径 / doctor 已归档清理 / 无 meta 孤儿 force 兜底 / 事后手动清理，任一入口）
- Then：`changes/<name>/` 原路径不被重建（目录不复活），archive 副本逐字节不变，输出含跳过计数的 warn

### FR-02: 未归档态打捞行为必须保持不变（坑 worktree-spec-artifact-misplace 不回归）

变更未归档（主仓无 `changes/archive/<name>/` 归档副本）时，打捞行为与现状完全一致：worktree 独有产物（主仓原路径缺失）必须照常复制回原路径；原路径同名但内容不同的文件必须照旧仅列冲突清单、禁止覆盖主仓版本。

#### 场景：既有打捞语义回归

- Given：未归档变更的 worktree 内有 `changes/<name>/verify-result.md`（主仓缺失）与 `changes/<name>/tasks/task-01.md`（主仓同名不同内容）
- When：worktree cleanup
- Then：前者复制回主仓原路径，后者主仓版本保留且列入冲突清单；`.sillyspec/docs/**` 树打捞行为不变

### FR-03: 真独有产物（原路径与 archive 副本均缺）必须仍打捞，归档态目标位置为归档副本

原路径与 `changes/archive/<name>/` 均缺的 worktree 独有产物必须照捞不蒸发：未归档态照旧捞回原路径；归档态（归档副本目录存在）捞进 `changes/archive/<name>/` 对应位置（原路径已注销，禁止重建），并在打捞输出中说明去向。

#### 场景：归档态独有产物进归档副本

- Given：已归档变更的 worktree 内存在 archive 副本没有的文件（如归档前仅写入 worktree 的 late-note.md）
- When：worktree cleanup
- Then：文件被复制到 `changes/archive/<name>/` 对应位置，`changes/<name>/` 原路径仍不重建

### FR-04: 上述三态必须有测试覆盖，触及 src 的实测全绿

新增测试必须覆盖 FR-01/02/03 三态判定；收口时本变更测试 ∪ FR 关联回归实测零失败。

#### 场景：收口实测

- Given：`test/worktree-spec-salvage.test.mjs` 含归档态新场景与未归档态既有回归
- When：收口 CLI 亲测（测试面按变更动态推断）
- Then：零失败

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`）

FR-01: test/worktree-spec-salvage.test.mjs「3. 归档态清理：archive 副本在 → 跳过不复活原路径、副本不被旧快照覆盖」
FR-02: test/worktree-spec-salvage.test.mjs「1. cleanup 打捞：缺失 copy 回 / 冲突不覆盖（未归档态既有回归）」
FR-03: test/worktree-spec-salvage.test.mjs「3. 归档态独有产物 → 捞进 archive 副本、原路径不重建」
FR-04: test/worktree-spec-salvage.test.mjs 全文件用例 + flow done 收口 CLI 实测
