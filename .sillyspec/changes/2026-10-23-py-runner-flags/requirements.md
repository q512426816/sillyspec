---
author: flow-machine-draft
created_at: 2026-10-23T06:28:48.549Z
---
# 需求规格（Requirements）— 2026-10-23-py-runner-flags

## 功能需求

### FR-01: readVerifyPyFlags(specBase) 逐键正则读取 py_runner_flags（引号剥离/注释剥离；缺省/坏值/不可读 fail-soft 空串=现状零回归）

- readVerifyPyFlags(specBase) MUST 逐键正则读取 py_runner_flags（引号/注释剥离；缺省/坏值/不可读 fail-soft 空串）；runModuleSubset 推断路径（无 hits 来源 pyRunner）MUST 对每个 py 组命令追加该 flags，hits 路径 MUST 零变化。

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

### FR-02: runModuleSubset 推断路径对每个 py 组命令追加该 flags；hits 路径行为零变化

- readVerifyPyFlags(specBase) MUST 逐键正则读取 py_runner_flags（引号/注释剥离；缺省/坏值/不可读 fail-soft 空串）；runModuleSubset 推断路径（无 hits 来源 pyRunner）MUST 对每个 py 组命令追加该 flags，hits 路径 MUST 零变化。

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

### FR-03: schema 注册 py_runner_flags（string）+ renderExample token 行（防漂耦合过）；平台仓 local.yaml 落地该键且 config validate exit 0

- readVerifyPyFlags(specBase) MUST 逐键正则读取 py_runner_flags（引号/注释剥离；缺省/坏值/不可读 fail-soft 空串）；runModuleSubset 推断路径（无 hits 来源 pyRunner）MUST 对每个 py 组命令追加该 flags，hits 路径 MUST 零变化。

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

### FR-04: 测试：readVerifyPyFlags 三态 unit＋源码接线锚＋config-schema/config-validate 套件绿

- readVerifyPyFlags(specBase) MUST 逐键正则读取 py_runner_flags（引号/注释剥离；缺省/坏值/不可读 fail-soft 空串）；runModuleSubset 推断路径（无 hits 来源 pyRunner）MUST 对每个 py 组命令追加该 flags，hits 路径 MUST 零变化。

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: 不适用：纯接线变更（键读取+命令串拼接），既有组卷/回执面即验证；平台仓落地后下一轮 deps(auto-py) 回执即真实验证
FR-02: 不适用：纯接线变更（键读取+命令串拼接），既有组卷/回执面即验证；平台仓落地后下一轮 deps(auto-py) 回执即真实验证
FR-03: 不适用：纯接线变更（键读取+命令串拼接），既有组卷/回执面即验证；平台仓落地后下一轮 deps(auto-py) 回执即真实验证
FR-04: 不适用：纯接线变更（键读取+命令串拼接），既有组卷/回执面即验证；平台仓落地后下一轮 deps(auto-py) 回执即真实验证
