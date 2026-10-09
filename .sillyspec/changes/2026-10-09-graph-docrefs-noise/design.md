---
author: flow-machine-draft
created_at: 2026-10-09T00:27:19.171Z
---
# 设计记录（Design Record）— 2026-10-09-graph-docrefs-noise

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/knowledge-graph.js | parseChangelogEntries 剥离优先归一；graphDangling 文档面双豁免（裸名/跨仓）+ crossRepo 标记；extractFilePaths 守卫（空/纯数字/前导斜杠/点段丢弃）；建图守卫（glob 跳过/tests 剥 #锚/deliverables 剥尾括号注记） |
| 修改 | src/knowledge-match.js | anchorFilePaths 同款守卫（前导斜杠剥除+纯数字丢弃）——repo:// URL 碎片归跨仓口径 |
| 修改 | src/doctor-diagnostics.js | graph-dangling-anchor 文案按 crossRepo 分流（本仓点名+跨仓聚合计数注记） |
| 修改 | test/knowledge-graph.test.mjs | ⑧ 增跨仓双豁免断言（全假存在性中桶归零）；判型函数改「顶级在场文件不在」 |
| 新增 | .sillyspec/docs/{backend,frontend,sillyhub-daemon,dashboard,multi-agent-platform,SillyHub,sillyspec}/modules/*.changelog.md ×64 | 空变更索引（标准头+空表，沿 core-engine.changelog.md 形态） |

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

doctor graph-doc-dangling-ref 报 1439 条悬空，普查分层：813 裸文件名短引用（合法文档语境，438 种中 304 种多义不可盲连——悬空判定对它们不成立）+ ~260 跨仓目标（backend/frontend/sillyhub-daemon 前缀，平台代码在独立仓）+ 少量解析伪影（URL 前导斜杠碎片、纯数字段、glob 模式、#锚后缀、（P2）类注记）。修法全部在口径侧：graphDangling 文档面双豁免（裸名/跨仓）+ crossRepo 分流标记；两个提取器守卫收紧；changelog 名字归一改剥离优先（旧前缀校验放行「日期名（P2）」整串致假悬空）。降噪后真欠账水落石出：64 个"模块文档缺口"实查全为仅缺 changelog 索引（卡全在）——批量建 64 个空索引（机械合法，modules split-changelog 迁出机制既有形态）；13 条本仓强边悬空为真历史欠账（声明交付物从未落地/改名，如 docs/agent-provider-onboarding.md），advisory 点名留人工判，不伪造文件。选口径修复而非逐条清文档：伪影占 96%，先修秤再称重。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- graphDangling 返回条目增 crossRepo:boolean 字段（doctor 消费分流）；dangling 数值口径变化（文档面裸名/跨仓出域）——summary.dangling_refs/dangling_refs_breakdown 字段与「本仓+跨仓总和」语义不变，数值随之下降。
- parseChangelogEntries/extractFilePaths/anchorFilePaths 为内部归一增强，签名零变化。
- doctor graph-dangling-anchor 文案分流（本仓点名样本+跨仓计数注记）。
- 64 个 changelog.md 为数据文件新增（模块卡配套索引，modules 机制既有格式）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

   不适用：全部为解析/纯函数判定，无事件面。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

   只读判定无共享态；64 个 changelog 为一次性新增文件（git 管理，无覆盖面——已核对全部不存在才写）。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

   无状态（图随建随用）；文件写入为新建非改写，中断无半态。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

   跨仓判定锚本仓文件系统顶级目录存在性（纯本地事实）；同顶级名歧义（src/ 两仓都有）保留在 65 条 advisory 中不强行归跨仓——诚实呈现歧义而非猜。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：跨仓豁免把"真失效的跨仓引用"也隐掉（文档引用了平台仓某文件而该文件确已被删）——本仓无法核验独立仓文件系统，豁免是诚实的能力边界而非判断。缓解：crossRepo 计数仍注记（2446 条），平台仓侧若有同类检查可对账。次风险：64 个空 changelog 索引若模块实际有变更史（散在卡内「变更历史」节），空表欠信息——头部注明来源指引，后续 split-changelog 迁移时补。放弃的方案：裸名 basename 唯一消解连边（304/438 多义，盲连错边比不连更糟）；逐条修 1439 条文档引用（96% 是伪影，修秤优先于迁就坏秤）；为 13 条真欠账伪造占位文件（篡改交付语义，点名留人工判才对）。
