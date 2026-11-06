---
author: flow-machine-draft
created_at: 2026-11-07T04:35:00Z
---
# 设计记录（Design Record）— 2026-11-07-knowledge-generated-retire

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

generated 切块是双仓审计实证的死区（INDEX 零引用、检索四层零消费、自带 INDEX 零读取方）且是双源漂移源（平台仓已实证同事实矛盾）。方案：cmdRefresh（src/stages/knowledge.js:417-530）整体替换为废弃提示函数（保留子命令入口防脚本断链，行为=输出说明零写盘）；本仓 generated 存量目录直接 git rm（34 文件，零消费删除零影响）；help 行与 SKILL.md 同步废弃说明。scan 文档本体（docs 项目 scan 目录）不动——它是模块卡与架构文档的原料，退出的只是它的切块镜像。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `sillyspec knowledge refresh` 行为变化：从「重扫 scan 重写 generated」改为「废弃提示零写盘」（输出 ok:true + deprecated:true + 说明）；子命令入口保留（防 CI/脚本断链），scan_docs_missing 等旧错误码不再产生。
- cmdRefresh 函数体替换（签名不变）；extractSections 辅助函数随之无消费方（保留不删——最小 diff，后续变更清理）。
- 其余命令/检索/validate：零变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   答：不适用：refresh 废弃后是纯输出函数，无输入无状态无事件。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   答：不适用：废弃路径零写盘；存量删除是本变更一次性 git 操作（git 原子提交）。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   答：安全：废弃提示无中间态；generated 删除随变更提交原子落地，中断即未删除（下轮重做）。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   答：不会：本变更只动本仓代码与本仓 generated 存量；平台仓的 generated（41 文件）属它仓内容治理，随其自身 sync 流程处理（本变更不越界）。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：外部脚本依赖 refresh 的旧行为（重写 generated）——审计已证 generated 零消费方，且本仓 test 面 grep 无 refresh 依赖用例（实现时跑全量 knowledge 面验证）。放弃的方案：① refresh 加质量门槛续命（纯表格段/目录段过滤 + INDEX 注册）——为零消费面投入门槛维护不划算，双写漂移根源未除，放弃；② generated 迁移到 docs 下保留——零消费内容搬家仍是死数据，放弃。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/stages/knowledge.js | cmdRefresh 函数体替换为废弃提示（零写盘）；help 行同步 |
| 修改 | .claude/skills/sillyspec-knowledge/SKILL.md | refresh 行改废弃说明 |
| 删除 | .sillyspec/knowledge/generated/ | 存量 34 文件整目录（零消费死区） |
| 新增 | NEW:test/knowledge-generated-retire.test.mjs | T1~T3 三组用例 |
