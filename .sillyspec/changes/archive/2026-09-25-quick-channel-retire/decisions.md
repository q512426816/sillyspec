---
author: flow-machine-draft
created_at: 2026-09-25T23:19:33.495Z
---
# 决策记录（Decisions）— 2026-09-25-quick-channel-retire

## D-001@v1: 风险与死路（design 槽4 收割）
- 决策：最大风险＝误伤在途会话：缓解＝判据用 existingGuard 文件存在性（幂等判据同源，且 --done/--cancel 不经 runStage 本就不受门影响）；兜底网清理/注销带三重防护——guard.json 存在（含损坏）绝不清、仅 quick-<8hex> 形态才清理（独立评审 P2 清偿：防任何把真实变更名带进分支的路径误注销）、共享指针仅内容等于本 sid 才删。次风险＝测试大面积依赖新启会话：缓解＝夹具辅助单一来源（test/helpers/quick-session-fixture.mjs）复刻 guard 规范形状防漂移，改造集中在 ~25 个测试文件；全量证据＝会话亲跑 633 文件 0 失败（CLI 收口门按 module 策略 0 命中跳过 test，如实记录不假称亲测）。已知披露（独立评审裁决）：①冻结面（baseline..HEAD）混入并行会话在 baseline 锚定后合入的提交（greenfield-bootstrap / platform-feedback-batch2 / cli-protocol-trust 尾批）——共享仓多会话现实，按文件区分归属不可行，审计时以 commit 归属为准；②proposal 曾声明不触碰 command.js，评审驱动扩面实改其两处文案（auto 分类/--status 指路），属 FR-06 兑现的显式扩面；③集合外旗标形态（--output 等）会先打一行「已建立」再被兜底网拒——一次性矛盾输出、无残留副作用（复核确认 DB 已清理），接受。放弃方案：①全量删码（stages/quick.js＋run/quick-audit.js＋quicklog 家族 ~2800 行）——全球存量安装的在途会话会搁浅，且 quicklog.js 被 run/command.js 共用、冲突面大，物理拆除留作后续独立变更；②env/local.yaml 逃生阀重开 quick——复辟过渡开关，与「直接退役」决策相悖。
