---
author: flow-machine-draft
created_at: 2026-10-13T03:33:36.784Z
---
# 提案书（Proposal）— 2026-10-13-batchtick-evidence-domain-hint

## 动机

任务原话转写：动机：agent dogfood 反馈两条摩擦（同会话正面评价断点续跑/评审链路）。①单拍勾选硬门证据盲：活真干完、每 task token 提交都在，但一次 Edit 翻多格被硬拒，只能 --allow-batch-tick 旁路——同形态 git 时点检查（flow.js 一把勾模式）却因 token 证据齐放行，两层语义不一致；硬门自注释护的是 per-task 时间戳/进度信号面（信号面损害非数据正确性），证据缺失形态另有勾选证据哨兵独立拦截。修法：resolveBatchTickAction 加 evidenceComplete 降级态——哨兵 status=complete（每格已勾任务证据齐）的单拍降 advisory+留痕 flow-state，证据面保持硬拒。②FR 伪域信号来得太晚：第一次知道路径未登记模块图是在收口模块门（最贵时点），distill 后虽有 redomain 命令建议但已归档。修法：flow start 对 --input 提及路径（extractRoutingInputPaths 已有）跑模块图覆盖预判——命中点名 fr/<域>，未命中点名将落伪域 auto-<段>（复用 distill 同源 pseudoDomainFromPaths）+登记指引；纯提示不设门。

成功标准：
- 单拍多格勾选且哨兵证据完备（status=complete，每格已勾任务均有 token 提交/review.json）时 flow done 降级 advisory 放行并留痕 flow-state batch_ticked，无需 --allow-batch-tick
- 证据不完备的单拍保持硬拒；--allow-batch-tick 旁路、哨兵面未知 fail-open、机器代勾解释整跳三态语义与优先序不变
- flow start 对 --input 提及路径输出模块域预判行：命中已登记模块点名 FR 将落 fr/<域>；未命中点名将落伪域 auto-<段>（与 distill 分段投票同源实现）并给登记指引
- 无模块图（绿地）或 --input 未提及路径时 flow start 输出零新增行（逐字节不变）
- 既有回归全绿：batch-tick-gate/sentinel-wiring 既有断言零改动通过；flow done distill 域路由与收口模块门行为零改动

## 变更范围

按成功标准机械推导，共 5 条验收面：
1. 单拍多格勾选且哨兵证据完备（status=complete，每格已勾任务均有 token 提交/review.json）时 flow done 降级 advisory 放行并留痕 flow-state batch_ticked，无需 --allow-batch-tick
2. 证据不完备的单拍保持硬拒；--allow-batch-tick 旁路、哨兵面未知 fail-open、机器代勾解释整跳三态语义与优先序不变
3. flow start 对 --input 提及路径输出模块域预判行：命中已登记模块点名 FR 将落 fr/<域>；未命中点名将落伪域 auto-<段>（与 distill 分段投票同源实现）并给登记指引
4. 无模块图（绿地）或 --input 未提及路径时 flow start 输出零新增行（逐字节不变）
5. 既有回归全绿：batch-tick-gate/sentinel-wiring 既有断言零改动通过；flow done distill 域路由与收口模块门行为零改动

## 成功标准（可验证）

1. 单拍多格勾选且哨兵证据完备（status=complete，每格已勾任务均有 token 提交/review.json）时 flow done 降级 advisory 放行并留痕 flow-state batch_ticked，无需 --allow-batch-tick
2. 证据不完备的单拍保持硬拒；--allow-batch-tick 旁路、哨兵面未知 fail-open、机器代勾解释整跳三态语义与优先序不变
3. flow start 对 --input 提及路径输出模块域预判行：命中已登记模块点名 FR 将落 fr/<域>；未命中点名将落伪域 auto-<段>（与 distill 分段投票同源实现）并给登记指引
4. 无模块图（绿地）或 --input 未提及路径时 flow start 输出零新增行（逐字节不变）
5. 既有回归全绿：batch-tick-gate/sentinel-wiring 既有断言零改动通过；flow done distill 域路由与收口模块门行为零改动
