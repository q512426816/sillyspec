---
author: flow-machine-draft
created_at: 2026-10-28T23:16:47.116Z
---
# 提案书（Proposal）— 2026-10-29-metrics-routes

## 动机

任务原话转写：指标门路由形态：路径集合多语言路由

动机与背景：上变更 2026-10-29-open-metrics-gate 落地 commands.metrics 单命令指标门。用户指出：单仓多语言/多框架形态下单命令需手写 wrapper 路由，不符合本仓「机制用批类别/路径集合、不枚举语言框架」纪律（测试侧 modules 块先例）。会话讨论确认方案（用户已确认）：新增 metrics_routes 路由形态，CLI 按变更文件面路径前缀路由，只跑命中的 gate——多语言与大仓增量在机制层一次解决。

成功标准：
- local.yaml 新增 metrics_routes 段（<name>.paths 路径前缀集合 + <name>.command + 可选 <name>.timeout_sec）：CLI 以变更文件面（审计∪声明口径，同 SILLYSPEC_CHANGE_FILES 源）∩ paths 前缀匹配路由，仅执行命中 gate；任一命中 gate 非零/超时=门红阻断收口；零命中（有段无交集）=跳过留痕；未配置整段=现状零变化（缺省零回归）
- commands.metrics 单命令形态与 metrics_routes 可共存：单命令仍无条件执行，路由门按命中执行；两形态结果均落 verify-runs 证据（kind: metrics，gate 名区分），failed 归并 'metrics' 不重复计
- 命中 gate 执行子进程注入 SILLYSPEC_CHANGE_FILES=该 gate 命中的变更文件子集（gate 内工具仍可增量）；路由判定只用路径集合，不枚举语言/框架（规约 00）
- config-schema 注册（parametrized 键，随 modules 块先例形态）+ 引导面同步（example 注释/AGENTS 模板/skip reason 提及路由形态）；零新 npm 依赖
- 新增测试：路由命中/零命中跳过/多 gate 部分失败/前缀匹配边界（子目录深路径/段全等不误蹭）/per-gate 超时/与单命令共存/未配置零回归；既有 quick-metrics-gate/quick-test-gate/config-schema 回归绿 + lint 绿

## 变更范围

按成功标准机械推导，共 5 条验收面：
1. local.yaml 新增 metrics_routes 段（<name>.paths 路径前缀集合 + <name>.command + 可选 <name>.timeout_sec）：CLI 以变更文件面（审计∪声明口径，同 SILLYSPEC_CHANGE_FILES 源）∩ paths 前缀匹配路由，仅执行命中 gate；任一命中 gate 非零/超时=门红阻断收口；零命中（有段无交集）=跳过留痕；未配置整段=现状零变化（缺省零回归）
2. commands.metrics 单命令形态与 metrics_routes 可共存：单命令仍无条件执行，路由门按命中执行；两形态结果均落 verify-runs 证据（kind: metrics，gate 名区分），failed 归并 'metrics' 不重复计
3. 命中 gate 执行子进程注入 SILLYSPEC_CHANGE_FILES=该 gate 命中的变更文件子集（gate 内工具仍可增量）；路由判定只用路径集合，不枚举语言/框架（规约 00）
4. config-schema 注册（parametrized 键，随 modules 块先例形态）+ 引导面同步（example 注释/AGENTS 模板/skip reason 提及路由形态）；零新 npm 依赖
5. 新增测试：路由命中/零命中跳过/多 gate 部分失败/前缀匹配边界（子目录深路径/段全等不误蹭）/per-gate 超时/与单命令共存/未配置零回归；既有 quick-metrics-gate/quick-test-gate/config-schema 回归绿 + lint 绿

## 成功标准（可验证）

1. local.yaml 新增 metrics_routes 段（<name>.paths 路径前缀集合 + <name>.command + 可选 <name>.timeout_sec）：CLI 以变更文件面（审计∪声明口径，同 SILLYSPEC_CHANGE_FILES 源）∩ paths 前缀匹配路由，仅执行命中 gate；任一命中 gate 非零/超时=门红阻断收口；零命中（有段无交集）=跳过留痕；未配置整段=现状零变化（缺省零回归）
2. commands.metrics 单命令形态与 metrics_routes 可共存：单命令仍无条件执行，路由门按命中执行；两形态结果均落 verify-runs 证据（kind: metrics，gate 名区分），failed 归并 'metrics' 不重复计
3. 命中 gate 执行子进程注入 SILLYSPEC_CHANGE_FILES=该 gate 命中的变更文件子集（gate 内工具仍可增量）；路由判定只用路径集合，不枚举语言/框架（规约 00）
4. config-schema 注册（parametrized 键，随 modules 块先例形态）+ 引导面同步（example 注释/AGENTS 模板/skip reason 提及路由形态）；零新 npm 依赖
5. 新增测试：路由命中/零命中跳过/多 gate 部分失败/前缀匹配边界（子目录深路径/段全等不误蹭）/per-gate 超时/与单命令共存/未配置零回归；既有 quick-metrics-gate/quick-test-gate/config-schema 回归绿 + lint 绿
