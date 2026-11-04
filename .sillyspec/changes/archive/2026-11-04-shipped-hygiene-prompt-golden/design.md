---
author: flow-machine-draft
created_at: 2026-11-04T07:23:35.750Z
---
# 设计记录（Design Record）— 2026-11-04-shipped-hygiene-prompt-golden

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
两个测试文件，零产品代码改动。①test/shipped-hygiene.test.mjs：递归扫 templates/ 与 .claude/skills/ 文件名黑名单（CREATION-LOG*、*.test.[cm]js、test-*.mjs、*pressure*），负例在测试内自建临时夹具文件验证判红能力后自清——依据 superpowers #2277（压力测试场景装在技能目录被 agent 当活指令执行）与本仓 asset-audit 手动审计的自动化接替。②test/prompt-golden.test.mjs：import 10 个阶段模块的 definition（已核实仅仓内常量插值、无 process.env 装载期依赖），对每阶段步骤 name+prompt 序列算 sha256，与 test/prompt-golden.json 基线比对；env SILLYSPEC_REGEN_PROMPT_GOLDEN=1 显式再生成。依据：stage 提示词频繁返工（各文件日期注释实证）而意外漂移零防护；哈希锁是封闭面过程信号（合 D-003 零语义铁律），顺带让每次提示词改动在 git diff 的基线变化里可见。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
无产品代码变化。新增 test/shipped-hygiene.test.mjs、test/prompt-golden.test.mjs、基线数据文件 test/prompt-golden.json（格式：{"<stageFile>": {"hash": "<sha256>", "steps": <N>, "bytes": <M>}}——bytes 供体积可观测，不入判定）。src/stages/* 仅只读 import。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   不适用——测试读静态仓内文件，无时序面。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   比对路径只读；基线写仅在显式 env 单发动作下发生（人工再生成，非并发路径）；负例夹具写独立临时目录自建自清。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   安全——基线随仓提交跨会话稳定；负例夹具清理失败不污染判定（finally 清理 + 临时目录隔离）。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   不会——扫描面固定本仓 templates/ 与 .claude/skills/；哈希输入只含仓内常量。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？
最大风险①＝某阶段 definition 装载期嵌机器态导致哈希跨机不稳定——已扫描核实 10 个模块无 process.env 装载期插值，插值全部来自仓内常量（如 DECISION_TYPES）；若后续有人引入装载期动态插值，测试在彼机即红，属护栏正确触发。风险②＝金档变成「改提示词须顺手再生成」的仪式税——有意为之：让提示词漂移在评审 diff 可见而非静默，再生成是一行 env 命令，税负极低。放弃方案：superpowers 式逐句内容断言（断言特定措辞存在）——否决，维护成本高且锁死措辞妨害有意迭代；哈希锁只防意外漂移不禁有意修改，分型规则那类语义锚点由专项内容测试（brainstorm-prompt-discipline）承担。
