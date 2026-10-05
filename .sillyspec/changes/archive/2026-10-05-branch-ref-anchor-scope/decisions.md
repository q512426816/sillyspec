---
author: flow-machine-draft
created_at: 2026-10-05T12:00:39.876Z
---
# 决策记录（Decisions）— 2026-10-05-branch-ref-anchor-scope

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：主仓 HEAD 恰好不含某历史 hash 但另一常驻 ref（如 origin/main）含——探针二判「不在主仓可达」→ 误锚（多余 tag，不删任何东西，安全方向）；反之不存在漏锚面：hash 要悬空必须同时在分支上且不在任何常驻 ref，而探针二只看 HEAD 这一个 ref——HEAD 不含而 origin/main 含的场景锚定是多余的但无害。放弃的方案：① 枚举全部 refs 逐一判可达——覆盖更全但 N 探针成本与配置面（remote 名不确定）不成比例，且收益仅是少打几个无害 tag；② 改为 rev-list branch ^HEAD 取分支独有集再做集合判——语义等价但一次性拉全集在候选仅个位数时反而更重。均已弃。
