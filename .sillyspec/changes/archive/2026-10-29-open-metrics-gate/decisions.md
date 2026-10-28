---
author: flow-machine-draft
created_at: 2026-10-28T16:52:03.543Z
---
# 决策记录（Decisions）— 2026-10-29-open-metrics-gate

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：最大风险：存量仓首配即红——指标工具对全仓历史代码报红，配置者第一次启用就被拦，治理成本突袭。缓解：desc 写明「通过标准由命令自身定义——建议命令只扫变更面/自带阈值」，且不配置零影响；这是声明的采用边界（用户渐进采用，CLI 不替人清存量债）。 放弃的方案：① 绑定 crapper/dryer/mutator 内置集成——违背工具中立纪律且引入新依赖，改开放命令门；② metrics 做 lint 同款 ownership triage（存量债降级 advisory）——依赖「失败输出含文件路径」提取前提，指标工具输出形态千差万别（分数表/JSON/正文），归属鉴定不可靠，误判比不判更糟，范围控制责任交给用户命令；③ 复用 commands.lint 塞复合命令（`lint && crap-check`）——超时语义混用、证据面不分 kind 无法对账、存量 lint 配置被动改变行为；④ metrics 失败 advisory 不阻断（学 lint 观察期先例）——lint 当年观察期是因外部数据未足，而 metrics 的非零退出语义由用户命令自定义（用户写 `crap-check --fail-over 10 src` 就是他的标准），首版即硬门才配得上「确定性质量门」的采纳初衷，且 fail-open 缺省已保证不配置零影响。 已知取舍：超时=failed 对慢工具会假红——desc 明示慢工具提帽（metrics_timeout_sec）或放 pre-push/CI 层，不在每变更收口跑。
