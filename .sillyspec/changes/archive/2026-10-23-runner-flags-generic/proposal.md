---
author: flow-machine-draft
created_at: 2026-10-23T07:03:48.235Z
---
# 提案书（Proposal）— 2026-10-23-runner-flags-generic

## 动机

任务原话转写：runner_flags 通用化与依赖面档位

动机与背景：用户推广原则裁决（2026-10-23 原话）：「不要仅仅考虑本项目及平台仓项目的代码，我们这个工具是要推广 可能是很多别的架构开发语言的项目，别被限制死了」（对齐 AGENTS 规约 00：不枚举定义开放世界、不锁死语言框架）。审计：①刚落地的 py_runner_flags 键名与实现是语言锁定的（py-only）——泛化为 runner_flags 映射（批类别键 py|js|jsx|…，未知类别前向兼容；py 组/js 批/jsx 批三注入点，flags 置于文件面前防 node/go 类参数解析截断；hits 路径不双加）；py_runner_flags 保留为兼容别名。②用户引用的「只跑本次改动测试、关联回归交 CI」做成通用档 deps_regress_cap（N|off，任意语言同一语义：own=变更触达的测试文件优先不截、import 依赖面截 N 或 off 全弃，loud 披露；缺省 null=现状零回归）。平台仓落地 runner_flags.py + deps_regress_cap: off。autopilot 直跑到底，--no-prestage 声明需求已含决策。

成功标准：
- readRunnerFlags(specBase) 行式解析 runner_flags 嵌套映射（键=批类别，值=flags 串，引号/注释剥离/CRLF 容错/块结束于去缩进行）；py_runner_flags 单键兼容映射到 py；未知类别键保留（前向兼容不报错）；缺省/坏值/不可读 fail-soft 空映射（零回归）
- 三个注入点：py 推断组 grp.command、js 批 jsPrefix、jsx 推断批 jsxPrefix（hits 来源不注入防双加）——flags 均置于文件参数之前（node/go 类参数解析在首个位置参数处截断）；chunkByCommandLength 计入 flags 长度
- readDepsRegressCap(specBase)（N 1-2000|off|缺省 null）+ 组面应用：own=changedFiles∩deps 优先整跑；off=只跑 own；N=own∪依赖面前 N；loud 披露被弃数与去向（归 pre-push/CI 门）；缺省零回归
- schema 注册 runner_flags(object)/deps_regress_cap(string)+example token；平台仓 local.yaml 落地 runner_flags{py}+deps_regress_cap: off、config validate exit 0
- 测试：两键解析三态＋三注入点源码锚＋缺省零回归锚＋schema/config-validate 套件绿

## 变更范围

按成功标准机械推导，共 5 条验收面：
1. readRunnerFlags(specBase) 行式解析 runner_flags 嵌套映射（键=批类别，值=flags 串，引号/注释剥离/CRLF 容错/块结束于去缩进行）；py_runner_flags 单键兼容映射到 py；未知类别键保留（前向兼容不报错）；缺省/坏值/不可读 fail-soft 空映射（零回归）
2. 三个注入点：py 推断组 grp.command、js 批 jsPrefix、jsx 推断批 jsxPrefix（hits 来源不注入防双加）——flags 均置于文件参数之前（node/go 类参数解析在首个位置参数处截断）；chunkByCommandLength 计入 flags 长度
3. readDepsRegressCap(specBase)（N 1-2000|off|缺省 null）+ 组面应用：own=changedFiles∩deps 优先整跑；off=只跑 own；N=own∪依赖面前 N；loud 披露被弃数与去向（归 pre-push/CI 门）；缺省零回归
4. schema 注册 runner_flags(object)/deps_regress_cap(string)+example token；平台仓 local.yaml 落地 runner_flags{py}+deps_regress_cap: off、config validate exit 0
5. 测试：两键解析三态＋三注入点源码锚＋缺省零回归锚＋schema/config-validate 套件绿

## 成功标准（可验证）

1. readRunnerFlags(specBase) 行式解析 runner_flags 嵌套映射（键=批类别，值=flags 串，引号/注释剥离/CRLF 容错/块结束于去缩进行）；py_runner_flags 单键兼容映射到 py；未知类别键保留（前向兼容不报错）；缺省/坏值/不可读 fail-soft 空映射（零回归）
2. 三个注入点：py 推断组 grp.command、js 批 jsPrefix、jsx 推断批 jsxPrefix（hits 来源不注入防双加）——flags 均置于文件参数之前（node/go 类参数解析在首个位置参数处截断）；chunkByCommandLength 计入 flags 长度
3. readDepsRegressCap(specBase)（N 1-2000|off|缺省 null）+ 组面应用：own=changedFiles∩deps 优先整跑；off=只跑 own；N=own∪依赖面前 N；loud 披露被弃数与去向（归 pre-push/CI 门）；缺省零回归
4. schema 注册 runner_flags(object)/deps_regress_cap(string)+example token；平台仓 local.yaml 落地 runner_flags{py}+deps_regress_cap: off、config validate exit 0
5. 测试：两键解析三态＋三注入点源码锚＋缺省零回归锚＋schema/config-validate 套件绿
