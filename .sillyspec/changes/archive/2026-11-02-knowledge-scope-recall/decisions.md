---
author: flow-machine-draft
created_at: 2026-11-02T05:57:20.770Z
---
# 决策记录（Decisions）— 2026-11-02-knowledge-scope-recall

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：**风险**：① section 切分对无 `##` 标题的文档（整篇一个 section）退化为全文档粒度——仅对该形态文档生效，且 INDEX 条目通常有锚点，可接受；② 两跳的 rejected 中部分位于停车场文件——两跳只按状态过滤不看文件，停车场条目仍可能从两跳进来（它们是真实历史否决，保留有价值，且展示面已有变更名限定）；③ 本仓真实语料 doc-refs 命中面小（实测仅 1 条本地路径）——探针与新增 case 主要靠 fixture 与跨仓路径，验收口径已按子集单列。 **放弃的方案**：① 全文档粒度 doc-refs——实测 1356 条边、单路径最多 65 条目，entry cap 3 变抽签；② doc-refs 改 strong——破坏 graphPath 契约（已有强边不可达测试）并污染 impact 闭包；③ 两跳全量 decisions + FR——144 决策/644 FR 无可用消费面，recency 排序前 11 全是模板底稿；④ 纯 recency 替代 rejected 先验——热文件实测退化；⑤ 引擎 cap 20→5——与 FR-03 的 3/20 契约和 raw/rendered 归因冲突（5 是渲染端 cap）；⑥ organic 到每仓 50 并入本变更——样本组成变化会与代码效果混淆，推迟独立数据变更。
