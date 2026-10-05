---
author: flow-machine-draft
created_at: 2026-10-05T00:38:47.105Z
---
# 需求规格（Requirements）— 2026-10-05-status-empty-guide

## 功能需求

> FR 由你撰写：每条 = `### FR-NN: 标题` + 一句带强度词的行为规定（必须=硬性；禁止=红线；
> SHOULD=建议须注理由；可以=可选）；边界情形加场景块 `#### 场景：名` + Given/When/Then 行。
> 标题行是成功标准锚（收口做门柱对比）；正文与场景块归你。

### FR-01: 空仓库跑 sillyspec status 与 sillyspec run status 均输出引导行（含 flow start 字样）且 exit 0 不变

目标仓库无任何进度数据时，`sillyspec status` 与 `sillyspec run status` 在「未找到进度数据（只读查询不建变更）」之后必须再输出引导行——含 `flow start` 子串的起步命令与 brainstorm 备选各至少一行——且进程必须保持 exit 0、禁止落盘任何变更/进度数据（只读语义不变）。

#### 场景：主路径

- Given：临时空仓库（已 `init`，无任何活跃变更与 progress 数据）
- When：运行 `sillyspec run status`，再运行顶层别名 `sillyspec status`
- Then：两次 stdout 均含「未找到进度数据」与「flow start」；exit code 均为 0；`.sillyspec/changes/` 下无新建目录

### FR-02: 有活跃变更时输出与现状逐字节一致（不回归）

存在可读 progress 的活跃变更时，status 展示路径禁止出现空态引导行——引导必须仅在无进度数据的空态分支输出，既有变更展示行为保持不变。

#### 场景：主路径

- Given：仓库存在一个活跃变更且其 progress 可读
- When：运行 `sillyspec status --change <变更名>`
- Then：输出为既有变更展示（不含「未找到进度数据」亦不含 `flow start` 引导行）；exit 0

### FR-03: 新增测试断言空态引导行，全量测试绿

本行为必须有自动化测试锁定：空态引导行 + exit 0、顶层别名同构、有变更不回归三个面都必须有断言覆盖，且全量测试套必须绿。

#### 场景：主路径

- Given：新增 `test/status-empty-guide.test.mjs`
- When：单独运行该文件与全量测试
- Then：三个面的断言全部通过，全量测试无新增失败

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例」`）

FR-01: test/status-empty-guide.test.mjs「空仓库 run status 与顶层 status 均输出引导行且 exit 0 不落盘」
FR-02: test/status-empty-guide.test.mjs「有活跃变更时 status 展示不含空态引导行」
FR-03: test/status-empty-guide.test.mjs「三面断言齐全（空态/别名同构/不回归）+ 全量测试绿」
