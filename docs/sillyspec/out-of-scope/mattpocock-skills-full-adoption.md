# mattpocock/skills 全量照搬流程形态

## 概念

把 mattpocock/skills（33 万 star 工程 skill 集）的流程形态整套搬进 SillySpec：纯提示词承载纪律（无 CLI 状态机/无门禁）、user-invoked/model-invoked 双层 skill 调用权模型、Skill-tool 互调复用、GLOSSARY.md 单文件常读、配置落盘 docs/agents/*.md、frontier 整轮齐发问询、spec 禁写文件路径等。

## 拒绝理由

与 SillySpec 内核冲突——机器护栏（CLI 状态机+实测门+冻结对账）是存在理由，纯提示词纪律上限是 agent 自觉、下限没有。逐条理由见 `docs/ROADMAP.md`「mattpocock/skills 吸收路线 → 明确不抄清单」（8 条，各附冲突点）；吸收的是其文本工程纪律（seam 约定/三层审查优先级/微设计技巧，见 ROADMAP 批次表批 1-4），不是其流程形态。

## 原始出处

2026-11-21 四视角调研（生态分发/架构复用/方法论盲维/提示词微设计）收敛结论；调研仓 clone 于 `C:/Users/qinyi/IdeaProjects/mattpocock-skills`（v1.3.2）。登记变更：2026-11-21-prompt-microdesign-pack。

## 复潮条件

无——除非 SillySpec 放弃机器护栏内核（届时是产品重定位，不是本提案复潮）。单项技术（如 wayfinder 决策票图、retro 环境轴）的观察性吸收不属本拒绝范围，见 ROADMAP 搁置区。
