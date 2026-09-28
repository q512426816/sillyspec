---
author: flow-machine-draft
created_at: 2026-09-28T06:08:30.980Z
---
# 提案书（Proposal）— roadmap-copy-purge

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:5d0780c1022ba457583dc67f6e52ff15b5a46ed33eee5075118d89e0559ed689:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change roadmap-copy-purge 留痕重锚 -->
任务原话转写：本仓 .sillyspec/ROADMAP.md 是平台仓同名文件的过时污染拷贝（进仓提交 f8637765 坑5：多代理 import 链污染有意提交止血、P2 架构级延后；内容全是 SillyHub 平台变更条目，自称 09-13 更新却含 09-20 条目），status 阶段每轮把它 cat 进 sillyspec 会话属主动误导。清偿坑5 挂账：删除本文件。
成功标准：
- .sillyspec/ROADMAP.md 自本仓删除并显式 pathspec 提交
- CLI 读侧零改动：next.js 绿地探测（面向用户自备文档的通用功能）保留、status 阶段 cat 带 2>/dev/null 自失活、stages/archive.js 指令本就条件化（存在→）不触发重建
- 纯 doc 删除，收口实测自动跳过代码面
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:4775f103e4c6943c7652f4a331abe3b45a713ac4c916bd27484d490ea0394565:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change roadmap-copy-purge 留痕重锚 -->
按成功标准机械推导，共 3 条验收面：
1. .sillyspec/ROADMAP.md 自本仓删除并显式 pathspec 提交
2. CLI 读侧零改动：next.js 绿地探测（面向用户自备文档的通用功能）保留、status 阶段 cat 带 2>/dev/null 自失活、stages/archive.js 指令本就条件化（存在→）不触发重建
3. 纯 doc 删除，收口实测自动跳过代码面
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:27818e1139603fdea052bbbe058f32d53660bc2172ba60e0d09624bb2fa3092a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change roadmap-copy-purge 留痕重锚 -->
1. .sillyspec/ROADMAP.md 自本仓删除并显式 pathspec 提交
2. CLI 读侧零改动：next.js 绿地探测（面向用户自备文档的通用功能）保留、status 阶段 cat 带 2>/dev/null 自失活、stages/archive.js 指令本就条件化（存在→）不触发重建
3. 纯 doc 删除，收口实测自动跳过代码面
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
