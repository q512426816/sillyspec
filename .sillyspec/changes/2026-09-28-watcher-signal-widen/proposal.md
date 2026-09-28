---
author: flow-machine-draft
created_at: 2026-09-28T09:57:02.601Z
---
# 提案书（Proposal）— 2026-09-28-watcher-signal-widen

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:ac6b3cec5d7ae7bf812820ebf8040c5ff86ce2ac183571371babcace23199a2b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-watcher-signal-widen 留痕重锚 -->
任务原话转写：背景：guidance-principles 收口时间线暴露观测面三缺口——门实测/测试落盘/豁免配置变更不在事件面（15 分钟苦战被判停滞）；假勾选警告在勾选瞬间判定且永不消解（提交 36 秒后到达但警告永挂）；另 tap-judge 评审 P3 登记 runCrossRepoFullTest 与 runFullCommand 两处 execSync 为 NODE_TEST_CONTEXT 同族面。
成功标准：
- 快照增两源：verify-runs 本变更最新实测结论（目录名 status duration 入 snap.gateRun）；specBase local.yaml mtime 事实（snap.localConfig，内容不上行只留痕）
- 基础事件增两条：gate-run（实测结论变化——停滞判定的活跃信号，计入 lastActivityAt）与 config-change（本地配置有变更事实）
- 假勾选消解：ruleFakeCheck 改带状态——无证据翻格先记 pending 并警告；后续快照区间新提交或 review mtime 补上证据时发 fake-check-cleared 事件并清 pending（时间线可见消解）
- runCrossRepoFullTest 与 runFullCommand 两处 execSync 剥离 NODE_TEST_CONTEXT（与 runOneModule 同款单点）
- 既有 watcher 测试全绿并扩展：新源快照字段、两新事件、pending 消解路径、env 清洗单点共用
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:3b28812b075eeade610b46369b8e5cdcc69c72cd38ca72d40950e6c5a40556ba:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-watcher-signal-widen 留痕重锚 -->
按成功标准机械推导，共 7 条验收面：
1. 快照增两源：verify-runs 本变更最新实测结论（目录名 status duration 入 snap.gateRun）
2. specBase local.yaml mtime 事实（snap.localConfig，内容不上行只留痕）
3. 基础事件增两条：gate-run（实测结论变化——停滞判定的活跃信号，计入 lastActivityAt）与 config-change（本地配置有变更事实）
4. 假勾选消解：ruleFakeCheck 改带状态——无证据翻格先记 pending 并警告
5. 后续快照区间新提交或 review mtime 补上证据时发 fake-check-cleared 事件并清 pending（时间线可见消解）
6. runCrossRepoFullTest 与 runFullCommand 两处 execSync 剥离 NODE_TEST_CONTEXT（与 runOneModule 同款单点）
7. 既有 watcher 测试全绿并扩展：新源快照字段、两新事件、pending 消解路径、env 清洗单点共用
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:34846f37625103fd2fdd19ddeba03a2451f2ed3c792800469c3429b005d11360:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-watcher-signal-widen 留痕重锚 -->
1. 快照增两源：verify-runs 本变更最新实测结论（目录名 status duration 入 snap.gateRun）
2. specBase local.yaml mtime 事实（snap.localConfig，内容不上行只留痕）
3. 基础事件增两条：gate-run（实测结论变化——停滞判定的活跃信号，计入 lastActivityAt）与 config-change（本地配置有变更事实）
4. 假勾选消解：ruleFakeCheck 改带状态——无证据翻格先记 pending 并警告
5. 后续快照区间新提交或 review mtime 补上证据时发 fake-check-cleared 事件并清 pending（时间线可见消解）
6. runCrossRepoFullTest 与 runFullCommand 两处 execSync 剥离 NODE_TEST_CONTEXT（与 runOneModule 同款单点）
7. 既有 watcher 测试全绿并扩展：新源快照字段、两新事件、pending 消解路径、env 清洗单点共用
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
