# 决策记录

## D-001@v1 拒绝 mattpocock skills 全量照搬流程形态

问题：是否把 mattpocock/skills（33 万 star 工程 skill 集）的流程形态整套搬进 SillySpec（纯提示词承载纪律/无状态机无门禁/Skill-tool 互调复用/GLOSSARY 单文件常读/配置落盘 docs/agents/frontier 整轮齐发/spec 禁写文件路径）？

答案（2026-11-21 四视角调研收敛，用户认可吸收路线）：拒绝。SillySpec 的存在理由是机器护栏（CLI 状态机+实测门+冻结对账），纯提示词纪律上限是 agent 自觉、下限没有。

否决理由（逐条，与内核冲突点）：
1. frontier 整轮齐发——与 brainstorm P0 逐轮逐问状态机冲突（CLI --answer/wait 终端异步交互模型）
2. spec 禁写文件路径/代码片段——拆掉 NEW: 前缀机器对账数据源（文件存在性核验/plan-postcheck/allowed_paths/探针对账）
3. 双轴并行子代理评审——遮蔽问题已由 review.json schema+探针重跑对比+fail-closed 槽行兜底，成本抵触审查经济学三律
4. triage 状态机——需绑外部 issue tracker，违反工具中立性规约 00（不枚举开放世界）
5. Skill-tool 互调复用——agent 运行时自觉调用不可验证；{{include:}} 模板机制才是同构等价物
6. GLOSSARY.md 取代 knowledge 库——路由机制为大仓而生，只加「常读词汇」通道不换底盘
7. 配置落盘 docs/agents/*.md——与 local.yaml+config validate 双源漂移
8. 不发 npm / PR 关门 / newsletter 漏斗——分发与治理策略不适用（护城河是进程+SQLite+实测门）

吸收的是其文本工程纪律（seam 约定/三层审查优先级/微设计技巧/原语复用），不是流程形态——吸收路线详见 .sillyspec/docs/sillyspec/ROADMAP.md。

复潮条件：无（除非放弃机器护栏内核=产品重定位，非本提案复潮）。单项技术的观察性吸收（wayfinder/retro）不属本拒绝范围。

## D-002@v1 路线规划类资产归工具工作区而非项目 docs

问题：ROADMAP/规划/路线类资产放项目 docs/ 还是工具工作区 .sillyspec/？

答案（2026-11-22 用户裁决）：归工具工作区 .sillyspec/docs/sillyspec/ROADMAP.md；项目 docs/ 不承载工具域路线。

裁决依据：
1. .sillyspec/ 是长期项目资产区（knowledge/模块映射/变更归档全在里面），不是临时目录——「可重置」指进度数据可重建，资产域（knowledge/docs）长期存续
2. 项目 docs/ 下的路线文件无工具消费：不进 knowledge 检索注入（防复潮为零）、无状态回写（路线与事实脱节）——是死文档
3. 闭环三环：机器消费（拒绝概念走 decisions→distill 进 knowledge）、状态推进（ROADMAP 批次表带状态列随归档回写）、位置归位（工作区与 scan 文档同域）
4. 路径迁移映射：docs/ROADMAP.md（2026-11-21 批 0 误建）→ .sillyspec/docs/sillyspec/ROADMAP.md；docs/sillyspec/out-of-scope/（2026-11-21 批 1 误建）→ 撤销，职责归 knowledge decisions 通道

复潮条件：工具出现 roadmap 一等公民命令族（sillyspec roadmap add/tick）时可重评估位置与形态；在那之前手工回写状态列够用（先轻后重）。
