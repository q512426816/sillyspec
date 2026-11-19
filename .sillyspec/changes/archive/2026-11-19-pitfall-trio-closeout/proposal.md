---
author: flow-machine-draft
created_at: 2026-11-19T14:57:14.905Z
---
# 提案书（Proposal）— 2026-11-19-pitfall-trio-closeout

## 动机

任务原话转写：flow done 三坑修复倒推收编：归档自愈与冻结披露

动机：2026-11-19 会话已修复三个收口链路坑，代码与测试落盘且全绿，因平台自动提交包装层干扰提交链断裂，变更未立项未提交，本变更按倒推 B 模式如实登记收口。已做改动：
- 坑 2026-11-13-flow-done-timeout-archive-half-state（已移 finished）：runArchiveChain 撞已存在归档目录时读其 flow-state，子步全 done 即自愈收口（注销+清理+残留提示），cmdFlowDone 无 flow-state 分支补「归档已完成直接提交归档件」恢复指引；不完备维持硬错附处置指引
- 坑 2026-11-13-flow-done-patch-refreeze-skip-on-rework 方向①③（②仍活跃）：detectPatchDrift/deliveryFaceAnchoredAfter 归因口径对齐 buildCommitAttribution——token 裸提交（task-NN 无变更名）算 own 触发漂移重冻结，纯裸提交仍不触发；patch skip 时冻结 head 落后当前 HEAD 显式披露两 sha 差异与人工留档指引
- 坑 2026-11-18-docs-check-template-self-pollution（已移 finished）：collectDocRefs 尾置占位名豁免——命中 (^|/)foo.js$ 的教学占位引用不计失效面

成功标准：
- 归档目录已存在且 flow-state 子步全 done 的重入自愈收口；不完备仍硬错（archive-idempotent-selfheal 全绿）
- token 裸提交触发漂移重冻结、纯裸不触发、交付面锚定同口径（flowdone-disposition-drift 全绿）
- patch skip 时点披露冻结 head 与当前 HEAD 两 sha 差异行
- foo.js 占位引用不再计入 docs-check 失效面（docs-check 全绿）
- 三套件合计 43/43 绿（本会话已实证，收口实测门复核）

## 变更范围

按成功标准机械推导，共 7 条验收面：
1. 坑 2026-11-13-flow-done-patch-refreeze-skip-on-rework 方向①③（②仍活跃）：detectPatchDrift/deliveryFaceAnchoredAfter 归因口径对齐 buildCommitAttribution——token 裸提交（task-NN 无变更名）算 own 触发漂移重冻结，纯裸提交仍不触发；patch skip 时冻结 head 落后当前 HEAD 显式披露两 sha 差异与人工留档指引
2. 坑 2026-11-18-docs-check-template-self-pollution（已移 finished）：collectDocRefs 尾置占位名豁免——命中 (^|/)foo.js$ 的教学占位引用不计失效面
3. 归档目录已存在且 flow-state 子步全 done 的重入自愈收口；不完备仍硬错（archive-idempotent-selfheal 全绿）
4. token 裸提交触发漂移重冻结、纯裸不触发、交付面锚定同口径（flowdone-disposition-drift 全绿）
5. patch skip 时点披露冻结 head 与当前 HEAD 两 sha 差异行
6. foo.js 占位引用不再计入 docs-check 失效面（docs-check 全绿）
7. 三套件合计 43/43 绿（本会话已实证，收口实测门复核）

## 成功标准（可验证）

1. 坑 2026-11-13-flow-done-patch-refreeze-skip-on-rework 方向①③（②仍活跃）：detectPatchDrift/deliveryFaceAnchoredAfter 归因口径对齐 buildCommitAttribution——token 裸提交（task-NN 无变更名）算 own 触发漂移重冻结，纯裸提交仍不触发；patch skip 时冻结 head 落后当前 HEAD 显式披露两 sha 差异与人工留档指引
2. 坑 2026-11-18-docs-check-template-self-pollution（已移 finished）：collectDocRefs 尾置占位名豁免——命中 (^|/)foo.js$ 的教学占位引用不计失效面
3. 归档目录已存在且 flow-state 子步全 done 的重入自愈收口；不完备仍硬错（archive-idempotent-selfheal 全绿）
4. token 裸提交触发漂移重冻结、纯裸不触发、交付面锚定同口径（flowdone-disposition-drift 全绿）
5. patch skip 时点披露冻结 head 与当前 HEAD 两 sha 差异行
6. foo.js 占位引用不再计入 docs-check 失效面（docs-check 全绿）
7. 三套件合计 43/43 绿（本会话已实证，收口实测门复核）
