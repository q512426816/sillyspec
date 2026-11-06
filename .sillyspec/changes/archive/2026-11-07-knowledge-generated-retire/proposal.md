---
author: flow-machine-draft
created_at: 2026-11-06T20:34:02.800Z
---
# 提案书（Proposal）— 2026-11-07-knowledge-generated-retire

## 动机

任务原话转写：generated 切块死区退库

动机与背景：双仓审计实证 generated 目录（scan 文档的 ## 切块镜像）为死区——INDEX 零引用、检索四层零消费、generated 下 INDEX 全仓零读取方；且平台仓已实证双源矛盾（同一事实与人工区各说各话：EventSource 与 fetch-sse 相反、已修复问题仍挂着）——切块镜像纯漂移源。scan 文档本体（docs 项目 scan 目录）保留，仅切块产物退出知识库。

成功标准：
- knowledge refresh 子命令改为废弃提示（输出说明切块已退役与 scan 本体位置），不再写任何文件
- 本仓 knowledge 下 generated 存量目录删除（34 文件）
- 既有 knowledge 测试面全绿 + 新增用例锁 refresh 废弃行为（零写盘）
- help 文案与 SKILL.md 的 refresh 描述同步为废弃说明

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. knowledge refresh 子命令改为废弃提示（输出说明切块已退役与 scan 本体位置），不再写任何文件
2. 本仓 knowledge 下 generated 存量目录删除（34 文件）
3. 既有 knowledge 测试面全绿 + 新增用例锁 refresh 废弃行为（零写盘）
4. help 文案与 SKILL.md 的 refresh 描述同步为废弃说明

## 成功标准（可验证）

1. knowledge refresh 子命令改为废弃提示（输出说明切块已退役与 scan 本体位置），不再写任何文件
2. 本仓 knowledge 下 generated 存量目录删除（34 文件）
3. 既有 knowledge 测试面全绿 + 新增用例锁 refresh 废弃行为（零写盘）
4. help 文案与 SKILL.md 的 refresh 描述同步为废弃说明
