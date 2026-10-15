---
author: flow-machine-draft
created_at: 2026-10-15T01:30:43.942Z
---
# 需求规格（Requirements）— 2026-10-15-pseudo-domain-clearance

## 功能需求

### FR-01: knowledge digest 伪域信号归零（pseudo=0，36 条全部迁入真域，ID 不变）

- 36 条 auto-* 伪域条目必须全部经 `tests --redomain --write` 迁入真域（release 18 / skills-docs 6 / docs-consistency 10 / core-engine 2），迁移必须保持 FR ID 逐字不变（迁域不换号身份铁律）；迁移后 `knowledge digest` 的伪域计数必须为 0。

#### 场景：主路径

- Given 13 批 redomain --write 全部执行完成，When 运行 knowledge digest，Then 输出「伪域条目 0」且三类信号全部在阈内。

### FR-02: 六个 auto-* 域文件删空壳，INDEX 路由行无 auto-* 残留、新域路由行在场

- 迁移完成后 fr/ 目录必须不存在任何 auto-*.md 文件（redomain 删空壳语义）；knowledge/INDEX.md 必须无 auto-* 域路由行残留，且必须在场 fr/release.md 路由行（新建域）。

#### 场景：主路径

- When 列举 knowledge/fr/ 与 grep INDEX.md，Then 无 auto-* 文件与路由行，release 路由行在场。

### FR-03: release 模块卡与 _module-map 注册在场，未来 release 变更触达 package.json 可路由真域

- modules/release.md 模块卡必须存在（含职责/定位/边界三节），_module-map.yaml 必须注册 release 模块（paths 含 package.json 与 test/quick-retired.test.mjs），使未来发布类变更的触达文件可被 resolveTouchedDomains 路由到真域而非伪域。

#### 场景：主路径

- Given release 卡与 map 注册落盘，When 后续变更 --input 含 package.json 触达，Then 触达域含 release。

### FR-04: 迁移后 knowledge validate 全绿（锚点/注册/幽灵条目零新增问题）

- 迁移后 `knowledge validate` 必须 ok:true 且 findings 为 0 增量（既有 advisory 如 flag_like_keyword 计数不得上升）。

#### 场景：主路径

- When 迁移前后各跑一次 knowledge validate，Then ok:true 且 advisory 计数前后一致（1=1）。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: 不适用：纯知识数据迁移（.sillyspec/knowledge/**）与模块卡注册，无 src/test 触达——验收靠 knowledge digest 伪域计数 0 与 validate ok:true 的 CLI 实测回执
FR-02: 不适用：同上——验收靠 fr/ 目录无 auto-* 文件、INDEX 无 auto-* 路由行的文件系统事实
FR-03: 不适用：纯文档/配置面——release 卡与 _module-map 注册在场由收口对账与后续 resolveTouchedDomains 路由实证
FR-04: 不适用：validate 为纯读 CLI 检查，回执留档 verify-result.md
