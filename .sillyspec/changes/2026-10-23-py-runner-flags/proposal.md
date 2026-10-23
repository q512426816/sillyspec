---
author: flow-machine-draft
created_at: 2026-10-23T06:28:48.548Z
---
# 提案书（Proposal）— 2026-10-23-py-runner-flags

## 动机

任务原话转写：py 推断运行器尾随 flag 键

动机与背景：会话回执实证（平台仓 2026-10-23-session-network-context）：动态子集 deps(auto-py) 25 文件 149.3s——单核串行。根因：2026-10-21-deps-batch-runner-flags 的尾随 flag 保留只接在 hits（module 命中命令串）路径；test_strategy: module 退役后走纯推断路径（module[]），inferPyRunner 生成裸 uv run pytest，模块命令里的 -q --no-cov -n auto 全丢（同仓实证：124 文件串行 1183s vs 带 -n auto 6-10 倍差）。修法：local.yaml 新键 verify.py_runner_flags（显式声明推断路径附加 flags，缺省空=现状零回归），推断批命令按 pytest flags+files 组装；schema 注册+example token+平台仓落地 "-q --no-cov -n auto"（预计 149s → 40-70s）。用户指令链：查看两会话效果→为什么还那么慢（2026-10-23）。autopilot 直跑到底，--no-prestage 声明需求已含决策。

成功标准：
- readVerifyPyFlags(specBase) 逐键正则读取 verify.py_runner_flags（引号剥离/注释剥离；缺省/坏值/不可读 fail-soft 空串=现状零回归）
- runModuleSubset 推断路径对每个 py 组命令追加该 flags；hits 路径行为零变化
- schema 注册 verify.py_runner_flags（string）+ renderExample token 行（防漂耦合过）；平台仓 local.yaml 落地该键且 config validate exit 0
- 测试：readVerifyPyFlags 三态 unit＋源码接线锚＋config-schema/config-validate 套件绿

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. readVerifyPyFlags(specBase) 逐键正则读取 verify.py_runner_flags（引号剥离/注释剥离；缺省/坏值/不可读 fail-soft 空串=现状零回归）
2. runModuleSubset 推断路径对每个 py 组命令追加该 flags；hits 路径行为零变化
3. schema 注册 verify.py_runner_flags（string）+ renderExample token 行（防漂耦合过）；平台仓 local.yaml 落地该键且 config validate exit 0
4. 测试：readVerifyPyFlags 三态 unit＋源码接线锚＋config-schema/config-validate 套件绿

## 成功标准（可验证）

1. readVerifyPyFlags(specBase) 逐键正则读取 verify.py_runner_flags（引号剥离/注释剥离；缺省/坏值/不可读 fail-soft 空串=现状零回归）
2. runModuleSubset 推断路径对每个 py 组命令追加该 flags；hits 路径行为零变化
3. schema 注册 verify.py_runner_flags（string）+ renderExample token 行（防漂耦合过）；平台仓 local.yaml 落地该键且 config validate exit 0
4. 测试：readVerifyPyFlags 三态 unit＋源码接线锚＋config-schema/config-validate 套件绿
