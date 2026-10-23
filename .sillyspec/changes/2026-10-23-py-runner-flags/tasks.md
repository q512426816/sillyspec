---
author: flow-machine-draft
created_at: 2026-10-23T06:28:48.549Z
---
# 任务注册表（Tasks）— 2026-10-23-py-runner-flags

- [x] task-01: readVerifyPyFlags(specBase) 逐键正则读取 verify.py_runner_flags（引号剥离/注释剥离；缺省/坏值/不可读 fail-soft 空串=现状零回归）
- [x] task-02: runModuleSubset 推断路径对每个 py 组命令追加该 flags；hits 路径行为零变化
- [x] task-03: schema 注册 verify.py_runner_flags（string）+ renderExample token 行（防漂耦合过）；平台仓 local.yaml 落地该键且 config validate exit 0
- [x] task-04: 测试：readVerifyPyFlags 三态 unit＋源码接线锚＋config-schema/config-validate 套件绿
