---
author: flow-machine-draft
created_at: 2026-11-06T14:29:33.291Z
---
# 提案书（Proposal）— 2026-11-06-knowledge-propose-body-file

## 动机

任务原话转写：知识提议命令支持从文件读正文

动机与背景：平台会话实证（2026-11-06）——knowledge propose 的中文长正文经命令行传递被 Runtime Policy 朴素分词误杀：正文中 projects 编码目录写法后紧跟中文标点的「斜杠加中文标点」序列被策略层误判为一个不存在的假路径并拒绝整条命令，PowerShell 与 Bash 双中招（策略层分词问题，与 shell 无关）。改写措辞才能绕过。工具使用反馈明确建议：支持 --body-file 从文件读正文，彻底绕开命令行传参。现状 cmdPropose（src/stages/knowledge.js:534-590）--body 仅从命令行 argv 取值。

成功标准：
- knowledge propose --title X --body-file <路径> 从指定文件读全文作正文写入 proposed/ 条目，落盘内容与源文件一致
- --body 与 --body-file 同给时显式报错（互斥冲突），不静默择一
- --body-file 指向不存在或不可读文件时输出结构化错误（body_file_missing/body_file_read_failed），不落半成品文件
- 既有 --body 命令行传参路径行为零变化（既有测试全绿）
- 帮助文案（cmdKnowledge --help）与 src/index.js 顶部 usage 同步列出 --body-file

## 变更范围

按成功标准机械推导，共 5 条验收面：
1. knowledge propose --title X --body-file <路径> 从指定文件读全文作正文写入 proposed/ 条目，落盘内容与源文件一致
2. --body 与 --body-file 同给时显式报错（互斥冲突），不静默择一
3. --body-file 指向不存在或不可读文件时输出结构化错误（body_file_missing/body_file_read_failed），不落半成品文件
4. 既有 --body 命令行传参路径行为零变化（既有测试全绿）
5. 帮助文案（cmdKnowledge --help）与 src/index.js 顶部 usage 同步列出 --body-file

## 成功标准（可验证）

1. knowledge propose --title X --body-file <路径> 从指定文件读全文作正文写入 proposed/ 条目，落盘内容与源文件一致
2. --body 与 --body-file 同给时显式报错（互斥冲突），不静默择一
3. --body-file 指向不存在或不可读文件时输出结构化错误（body_file_missing/body_file_read_failed），不落半成品文件
4. 既有 --body 命令行传参路径行为零变化（既有测试全绿）
5. 帮助文案（cmdKnowledge --help）与 src/index.js 顶部 usage 同步列出 --body-file
