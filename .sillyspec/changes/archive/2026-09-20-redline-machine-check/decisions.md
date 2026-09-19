---
author: qinyi
created_at: 2026-09-19 16:16:50
generated_by: sillyspec-fourpiece-init
change: 2026-09-20-redline-machine-check
---

# 决策记录（Decisions）

<!-- 增量落盘：每解决一个有实现影响的问题当场追加一条（格式见 brainstorm Step 3 模板）；幂等按 D-xxx@vN 判重 -->
<!-- 引用规范：evidence 等处的源码位置写仓根相对全路径+行号（src/foo.js:123）——裸文件名在 docs-check 层1 靠 basename 全仓扫描找候选，找不到候选或关键词窗口不匹配即失效，到 pre-push 才拦（2026-09-19 实证 64 处返工） -->

<!-- 背景（2026-09-19 双实现对撞实验核心教训）：语义级红线（「已结束会话不得假运行」「用量归属
     不得后写覆盖」）活在历史 design/knowledge 散文里，无机器可查形态——三层独立评审 + 352 例测试
     全没拦住主线版两处失分，靠事后人工逐文件深读才发现。门禁保下限不保上限；上限缺一双机器的眼睛。 -->

## D-001@v1: 红线 v1 取模式级断言，不做 AST/语义级
- type: architecture
- status: accepted
- 问题: 语义级约束（「不得假运行」）无法直接机检；AST 级实现成本高且跨语言（TS/Py/Go 消费者仓）。
- 选定: 每条红线 = 人写正则断言（forbid 命中集 + require 存在性）× scope 文件 glob × severity。人写正则人负责，statement+origin 保留散文溯源。
- alternatives: AST/语义分析（否决——跨语言成本与误报不可控）；散文自动提炼（否决——「不得/禁止」句式→正则的自动转换误报不可控）。
- normalized_requirement: 断言四件套 forbid/require/scope/severity；无 AST 依赖。
- impacts: [FR-01, FR-02]
- evidence: 对撞实验复盘（主线版 running 编码若有机检即可在 verify 期拦截）
- 故障面: 正则过宽误报（advisory 渲染+攒误报率数据）；过漏（require 兜底存在性检查）。
- 退役判据: 跨语言 AST 基建落地时逐条升级。

## D-002@v1: 清单消费者仓自持，sillyspec 只供机制
- type: architecture
- status: accepted
- 问题: 红线是消费者仓的项目知识，不是工具自带物。
- 选定: `.sillyspec/redlines.yaml` 消费者仓自持；sillyspec 侧缺清单=探针「不适用」零打扰。种子清单（multi-agent-platform 两条首批）另案 quick 落消费者仓。
- alternatives: 工具内置通用红线库（否决——通用正则对具体仓全是误报源）。
- normalized_requirement: 机制与内容分离；缺清单不适用。
- impacts: [FR-02]
- evidence: interface-contract.md「码表单一源」同款分离先例
- 故障面: 清单腐化无人维护——origin 锚引用文档行号，docs check 可校验引用有效性（后续接线）。
- 退役判据: 无。

## D-003@v1: 探针 11 advisory 挂载，v1 不进 PASS 封顶
- type: scope
- status: accepted
- 问题: 直接硬门（forbid 命中阻断 verify）在误报率未知时有拦真变更风险。
- 选定: verify 探针 11 渲染 ❌（forbid 命中）/⚠️（require 缺失）行进 verify-result 骨架，agent 必须在报告裁定；不接 PASS 封顶、不动 verify-facts schema（爆炸半径最小）。攒 N 个变更的误报数据后另案升硬门。
- alternatives: 直接硬门（否决——今晚刚实证过「测试固化错语义」的反面：门禁接错比没门禁更糟）。
- normalized_requirement: advisory 渲染 + fail-soft；facts 面零改动。
- impacts: [FR-03]
- evidence: 探针 8/9 advisory 先例；pass-eligibility 封顶演进史（先攒数据后收紧）
- 故障面: advisory 被 agent 忽略——verify-result 结论裁定义务 + Grill 复核兜底。
- 退役判据: 误报率数据足够后升 error 门（另案）。

## D-004@v1: fail-open 全链
- type: robustness
- status: accepted
- 问题: 坏 yaml/文件读失败不应炸 verify 整体。
- 选定: 清单解析失败→不适用+注记；单条目求值异常→跳过该条+warn；探针整体 try/catch fail-soft（同探针 8/9/10）。
- alternatives: fail-closed（否决——清单是增强件不是契约件）。
- normalized_requirement: 任何红线面故障不阻断 verify 主链。
- impacts: [FR-03]
- evidence: 探针 8/9 fail-soft 同款
- 故障面: 静默吞真问题——注记必须进骨架可见。
- 退役判据: 无。
