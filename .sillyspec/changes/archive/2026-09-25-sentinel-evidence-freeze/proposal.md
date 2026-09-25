---
author: flow-machine-draft
created_at: 2026-09-25T10:35:38.654Z
---
# 提案书（Proposal）— 2026-09-25-sentinel-evidence-freeze

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:764f474e63d166bc86d66216d07fae12d0e770b6766bd7d44c1c545b3ff1c734:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-sentinel-evidence-freeze 留痕重锚 -->
任务原话转写：动机：记档的两条负面也要解决——②哨兵证据只认提交 subject（agent 在 commit body 写了 task-NN 白写）⑤冻结面归属被陈旧声明抢文件（已提交的文件被从未归档的旧变更的声明偷走，静默排除+无重冻结通道）。
成功标准：
- 哨兵证据从 %s（仅 subject）扩展到 %B（完整提交消息）——commit body 里的 task-NN 也算证据；简报勾选纪律同步说清楚证据位置
- 冻结面修复：baseline..HEAD 已提交面不再过 foreign 声明切分（我提交的就是我的）；dirty 面保持切分不变；被排除的 dirty 文件打警告（不再静默）
- flow done 加 --refreeze flag：重置 patch 子步标记，下次 done 重新冻结
- 测试：哨兵 %B 证据 / 已提交面不被 foreign 抢 / --refreeze 重冻结
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:d98cb8b452c3cd34d33958b848e6520e791dc65d4da8db403529f237d3417508:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-sentinel-evidence-freeze 留痕重锚 -->
按成功标准机械推导，共 7 条验收面：
1. 哨兵证据从 %s（仅 subject）扩展到 %B（完整提交消息）——commit body 里的 task-NN 也算证据
2. 简报勾选纪律同步说清楚证据位置
3. 冻结面修复：baseline..HEAD 已提交面不再过 foreign 声明切分（我提交的就是我的）
4. dirty 面保持切分不变
5. 被排除的 dirty 文件打警告（不再静默）
6. flow done 加 --refreeze flag：重置 patch 子步标记，下次 done 重新冻结
7. 测试：哨兵 %B 证据 / 已提交面不被 foreign 抢 / --refreeze 重冻结
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:73cf2721ce32ff9c61940960888ea844b3ee35f1ec8e645d3a424d0b98303e5e:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-sentinel-evidence-freeze 留痕重锚 -->
1. 哨兵证据从 %s（仅 subject）扩展到 %B（完整提交消息）——commit body 里的 task-NN 也算证据
2. 简报勾选纪律同步说清楚证据位置
3. 冻结面修复：baseline..HEAD 已提交面不再过 foreign 声明切分（我提交的就是我的）
4. dirty 面保持切分不变
5. 被排除的 dirty 文件打警告（不再静默）
6. flow done 加 --refreeze flag：重置 patch 子步标记，下次 done 重新冻结
7. 测试：哨兵 %B 证据 / 已提交面不被 foreign 抢 / --refreeze 重冻结
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
