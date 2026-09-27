---
author: flow-machine-draft
created_at: 2026-09-27T14:15:28.921Z
---
# 提案书（Proposal）— 2026-09-27-watcher-push-endpoint

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:89fe01a7c45caa6eccaf1b67d752e0dd71814e263d0406cba790a64617a07d33:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-watcher-push-endpoint 留痕重锚 -->
任务原话转写：watcher 事件推送端点仍指向废弃分支的 /api/observation/events（批量契约），当前平台线的事件端点是 POST /api/changes/{name}/events（单条契约）——推送恒 404 静默降级，平台库事件恒空，真实留痕时间线无事件数据
成功标准：
- watcher 推送改走 POST {base}/api/changes/{name}/events 单条契约（kind/rule/severity/provisional/detail/ts），stage 信息并入 detail 文本
- 推送失败语义保持 best-effort（失败即弃本地 jsonl 兜底），去重回退 ts+rule 语义不变
- watcher 测试套件同步更新并通过
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:eb6f9749c4d65ff35dea467a6aaccd5643e822a125d9929fcc17e0bc336b787d:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-watcher-push-endpoint 留痕重锚 -->
按成功标准机械推导，共 3 条验收面：
1. watcher 推送改走 POST {base}/api/changes/{name}/events 单条契约（kind/rule/severity/provisional/detail/ts），stage 信息并入 detail 文本
2. 推送失败语义保持 best-effort（失败即弃本地 jsonl 兜底），去重回退 ts+rule 语义不变
3. watcher 测试套件同步更新并通过
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:6b1664f236915e71185154167ed1996b77390ce91a9bb1bcdf2a82f733752466:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-watcher-push-endpoint 留痕重锚 -->
1. watcher 推送改走 POST {base}/api/changes/{name}/events 单条契约（kind/rule/severity/provisional/detail/ts），stage 信息并入 detail 文本
2. 推送失败语义保持 best-effort（失败即弃本地 jsonl 兜底），去重回退 ts+rule 语义不变
3. watcher 测试套件同步更新并通过
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
