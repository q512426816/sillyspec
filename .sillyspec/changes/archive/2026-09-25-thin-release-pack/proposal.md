---
author: flow-machine-draft
created_at: 2026-09-24T22:22:30.206Z
---
# 提案书（Proposal）— 2026-09-25-thin-release-pack

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:b6830df0ee17e84c2ee8f834100a3cc2c19742b1c5d6c014718620af2670f299:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-release-pack 留痕重锚 -->
任务原话转写：动机：立即包三件——版本号 3.29.6 停更致 AGENTS 受管段升级失效（同版本 init 不更新，九个变更的模板/指令面改进传播不出去）；R16 评审 P2 根因（agent 提交晚于收口，patch 冻结件漏全部代码交付）需协议纪律钉死；verify-result 回执断点续跑后实测面显示占位、HEAD 字段语义含混。
成功标准：
- package.json 版本 3.29.6→3.30.0（AGENTS.md 受管段版本差升级链解锁）
- flow start 简报（fresh 与 adopt 两路）钉交付纪律一行：收口前交付代码显式 pathspec 提交——冻结件范围=baseline..HEAD 提交面，未提交代码不进审计
- verify-result 回执：实测面断点续跑后从 verify-runs 最新 test-result.json 回读；HEAD 字段改名收口时 HEAD，等于基线时注明代码未提交
- 测试：回执回填断言（⑮ 扩展）+ 简报纪律行断言；flow 系全绿
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:d7f5bf405f583943a9b563013a1fffa1d286fa06c3433343ab5b2c6ec5c95d0a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-release-pack 留痕重锚 -->
按成功标准机械推导，共 4 条验收面：
1. package.json 版本 3.29.6→3.30.0（AGENTS.md 受管段版本差升级链解锁）
2. flow start 简报（fresh 与 adopt 两路）钉交付纪律一行：收口前交付代码显式 pathspec 提交——冻结件范围=baseline..HEAD 提交面，未提交代码不进审计
3. verify-result 回执：实测面断点续跑后从 verify-runs 最新 test-result.json 回读；HEAD 字段改名收口时 HEAD，等于基线时注明代码未提交
4. 测试：回执回填断言（⑮ 扩展）+ 简报纪律行断言；flow 系全绿
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:a3f93580ec3a6682947fa1fe8cfba78af7cb1bc89f2d0584f962102b916fe357:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-release-pack 留痕重锚 -->
1. package.json 版本 3.29.6→3.30.0（AGENTS.md 受管段版本差升级链解锁）
2. flow start 简报（fresh 与 adopt 两路）钉交付纪律一行：收口前交付代码显式 pathspec 提交——冻结件范围=baseline..HEAD 提交面，未提交代码不进审计
3. verify-result 回执：实测面断点续跑后从 verify-runs 最新 test-result.json 回读；HEAD 字段改名收口时 HEAD，等于基线时注明代码未提交
4. 测试：回执回填断言（⑮ 扩展）+ 简报纪律行断言；flow 系全绿
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
