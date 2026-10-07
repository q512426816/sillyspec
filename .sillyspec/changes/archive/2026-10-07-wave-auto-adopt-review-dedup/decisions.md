---
author: flow-machine-draft
created_at: 2026-10-07T00:27:36.980Z
---
# 决策记录（Decisions）— 2026-10-07-wave-auto-adopt-review-dedup

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：③增量重跑的假绿面——修复破坏了「增量面之外、基线绿面之内」的测试而未被发现。缓解链：增量面三源推断以修复文件为输入重算（import 依赖与 FR 关联回归自然入面）；失败批文件无条件入面；增量面≥全量面时回全子集；test_rerun: full 逃生；归因不出保守全记批文件（增量退化不误报）。残余接受：跨模块副作用破坏无 import 边文件的理论面——与「agent 手动只跑失败测试」的现行实践相比是严格改进。第二个风险：①自动重排改写 agent 手排 Wave——agent 的时序意图应编码在 depends_on（adopt 的输入）而非 Wave 手排；公告醒目 + config 逃生 + git 可恢复。试过但放弃：a) 增量后强制再跑全子集确认——passing 轮成本反升（增量+全量>全量），postmortem 的痛点是失败轮返工不是通过轮；b) 逐文件归因用 failureRemaining 行集——实证行集只含内层用例名不含文件名（node --test 文件作参数时顶层名=测试标题），改走 not ok 块 location 路径；c) Wave 错误在 consistency 单点挂自动重排——WA4 实证混有其他错误时会误触发，移到失败统一收口点判定。撤销三项（记录裁决）：评审档位新增 self 档不实施（档位机器已存在，self 档破坏 1/4 抽样校准）；「--done --answer 补 wait」视为已修复（complete.js requiresWait 门现行自动补全）；「--step 意图断言」作为并发安全设计保留。
