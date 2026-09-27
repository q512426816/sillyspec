---
author: flow-machine-draft
created_at: 2026-09-27T05:23:04.934Z
---
# 提案书（Proposal）— 2026-09-27-knowledge-digest

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:f74e672a1629c8c677d709495d3bb35eacef858faba524b13dac755f3d0c5ddc:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-knowledge-digest 留痕重锚 -->
任务原话转写：知识资产治理现状：通用知识有 propose→平台人工合并闭环，但规格资产（FR 索引/绑定）全自动入库零人审——rot 待复核标记、收件箱积压（R23-full 载体仓 40 条实证）、伪域落库（R17/R23 两轮实证 auto-* 伪域病）、坏绑定（FR-cli-entry-091）四类信号沉睡在库内无人工出口。用户确认出口=平台页面（信号卡），CLI 先行供数据。
成功标准：
- 新增 knowledge digest 命令：四类信号扫描（rot 待复核标记按域计数/收件箱积压/伪域 auto-* 与 unmapped 占比/绑定路径解析失败），带阈值（rot>100、inbox>20、伪域>0、unresolved>0 才进摘要），文本+--json 双出口（json 供平台 RPC 消费）
- 落域机械改进：归档蒸馏落域为伪域（auto-*/unmapped）时，按交付路径推导建议域（backend/app/modules/<seg> → <seg> 等）并在归档输出显式提示（advisory 不阻断）；伪域条目+建议进 digest 信号
- digest 的绑定扫描与 repair-paths 同口径（resolveTestFileRel 单源复用）
- 全仓测试绿
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:feb37e2160b3dc2aa2ee9a6a093628f2542c0b1ea091e8807a8780e6256db32d:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-knowledge-digest 留痕重锚 -->
按成功标准机械推导，共 5 条验收面：
1. 新增 knowledge digest 命令：四类信号扫描（rot 待复核标记按域计数/收件箱积压/伪域 auto-* 与 unmapped 占比/绑定路径解析失败），带阈值（rot>100、inbox>20、伪域>0、unresolved>0 才进摘要），文本+--json 双出口（json 供平台 RPC 消费）
2. 落域机械改进：归档蒸馏落域为伪域（auto-*/unmapped）时，按交付路径推导建议域（backend/app/modules/<seg> → <seg> 等）并在归档输出显式提示（advisory 不阻断）
3. 伪域条目+建议进 digest 信号
4. digest 的绑定扫描与 repair-paths 同口径（resolveTestFileRel 单源复用）
5. 全仓测试绿
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:fde754143af591315827f856cbd821819893e6e70468b15c080388995b3b1cf3:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-knowledge-digest 留痕重锚 -->
1. 新增 knowledge digest 命令：四类信号扫描（rot 待复核标记按域计数/收件箱积压/伪域 auto-* 与 unmapped 占比/绑定路径解析失败），带阈值（rot>100、inbox>20、伪域>0、unresolved>0 才进摘要），文本+--json 双出口（json 供平台 RPC 消费）
2. 落域机械改进：归档蒸馏落域为伪域（auto-*/unmapped）时，按交付路径推导建议域（backend/app/modules/<seg> → <seg> 等）并在归档输出显式提示（advisory 不阻断）
3. 伪域条目+建议进 digest 信号
4. digest 的绑定扫描与 repair-paths 同口径（resolveTestFileRel 单源复用）
5. 全仓测试绿
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
