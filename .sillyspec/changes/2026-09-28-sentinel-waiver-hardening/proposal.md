---
author: flow-machine-draft
created_at: 2026-09-28T14:57:31.391Z
---
# 提案书（Proposal）— 2026-09-28-sentinel-waiver-hardening

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:113974433c9984b1c255475ca77a9dca07d3fdb98f7c4688f888680b0cd34abe:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-sentinel-waiver-hardening 留痕重锚 -->
任务原话转写：镜像豁免两窟窿加固：零交付不豁免＋基线完整性锚定。

动机：多角度攻击面实测两个回归窟窿（旧哨兵本会拦、镜像豁免放开）——① 零提交空转：镜像任务全勾＋区间零提交照样收口归档（live 实证，design「实测门/patch/review 整体背书」论证在纯文档变更有缺口：实测门跳过、评审可豁免、patch 面接受空）；② 基线篡改：route-hindsight-baseline 在 .runtime 不进 git，agent 可改写其 tasks 字段与覆写后任务对齐→全部伪装镜像→豁免绕过守卫（纯函数实证 status=complete）。

成功标准：
- 镜像豁免仅在区间提交非空时生效——零提交＋镜像全勾仍拒收（空转变更不许过门）
- flow-state 锚定基线文件 sha256（start/adopt 快照时点）；flow done 校验哈希不符→按无基线从严＋篡改告警文案
- 混合面（镜像＋覆写带 token）、重编号从严、CRLF 归一等已验行为零回归
- 单测覆盖零提交从严/篡改从严/哈希锚定；live 复测 A（零提交→拒收）与 C（篡改→拒收）双通过；npm test 与 test:core 全绿
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:30a312af124afe2b90d47cf1cc82251d6086ccb1d879a261cccd98177258f8de:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-sentinel-waiver-hardening 留痕重锚 -->
按成功标准机械推导，共 7 条验收面：
1. 镜像豁免仅在区间提交非空时生效——零提交＋镜像全勾仍拒收（空转变更不许过门）
2. flow-state 锚定基线文件 sha256（start/adopt 快照时点）
3. flow done 校验哈希不符→按无基线从严＋篡改告警文案
4. 混合面（镜像＋覆写带 token）、重编号从严、CRLF 归一等已验行为零回归
5. 单测覆盖零提交从严/篡改从严/哈希锚定
6. live 复测 A（零提交→拒收）与 C（篡改→拒收）双通过
7. npm test 与 test:core 全绿
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:25971ef0417400ee8844d4b92a54a7aef79e71bae98e79d9f9a24e18b9a36fed:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-sentinel-waiver-hardening 留痕重锚 -->
1. 镜像豁免仅在区间提交非空时生效——零提交＋镜像全勾仍拒收（空转变更不许过门）
2. flow-state 锚定基线文件 sha256（start/adopt 快照时点）
3. flow done 校验哈希不符→按无基线从严＋篡改告警文案
4. 混合面（镜像＋覆写带 token）、重编号从严、CRLF 归一等已验行为零回归
5. 单测覆盖零提交从严/篡改从严/哈希锚定
6. live 复测 A（零提交→拒收）与 C（篡改→拒收）双通过
7. npm test 与 test:core 全绿
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
