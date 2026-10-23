---
author: flow-machine-draft
created_at: 2026-10-23T07:03:48.235Z
---
# 需求规格（Requirements）— 2026-10-23-runner-flags-generic

## 功能需求

### FR-01: readRunnerFlags(specBase) 行式解析 runner_flags 嵌套映射（键=批类别，值=flags 串，引号/注释剥离/CRLF 容错/块结束于去缩进行）；py_runner_flags 单键兼容映射到 py；未知类别键保留（前向兼容不报错）；缺省/坏值/不可读 fail-soft 空映射（零回归）

- readRunnerFlags MUST 行式解析 runner_flags 嵌套映射（批类别→flags；引号/注释/CRLF 容错；未知类别保留）；py_runner_flags 单键 MUST 兼容映射到 py；三个注入点（py 组/js 批/jsx 推断批）MUST 将声明 flags 置于文件参数之前，hits 来源 MUST 不注入（防双加）；readDepsRegressCap MUST 解析 N|off|缺省，组面 MUST 按 own 优先语义应用并 loud 披露。

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

### FR-02: 三个注入点：py 推断组 grp.command、js 批 jsPrefix、jsx 推断批 jsxPrefix（hits 来源不注入防双加）——flags 均置于文件参数之前（node/go 类参数解析在首个位置参数处截断）；chunkByCommandLength 计入 flags 长度

- readRunnerFlags MUST 行式解析 runner_flags 嵌套映射（批类别→flags；引号/注释/CRLF 容错；未知类别保留）；py_runner_flags 单键 MUST 兼容映射到 py；三个注入点（py 组/js 批/jsx 推断批）MUST 将声明 flags 置于文件参数之前，hits 来源 MUST 不注入（防双加）；readDepsRegressCap MUST 解析 N|off|缺省，组面 MUST 按 own 优先语义应用并 loud 披露。

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

### FR-03: readDepsRegressCap(specBase)（N 1-2000|off|缺省 null）+ 组面应用：own=changedFiles∩deps 优先整跑；off=只跑 own；N=own∪依赖面前 N；loud 披露被弃数与去向（归 pre-push/CI 门）；缺省零回归

- readRunnerFlags MUST 行式解析 runner_flags 嵌套映射（批类别→flags；引号/注释/CRLF 容错；未知类别保留）；py_runner_flags 单键 MUST 兼容映射到 py；三个注入点（py 组/js 批/jsx 推断批）MUST 将声明 flags 置于文件参数之前，hits 来源 MUST 不注入（防双加）；readDepsRegressCap MUST 解析 N|off|缺省，组面 MUST 按 own 优先语义应用并 loud 披露。

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

### FR-04: schema 注册 runner_flags(object)/deps_regress_cap(string)+example token；平台仓 local.yaml 落地 runner_flags{py}+deps_regress_cap: off、config validate exit 0

- readRunnerFlags MUST 行式解析 runner_flags 嵌套映射（批类别→flags；引号/注释/CRLF 容错；未知类别保留）；py_runner_flags 单键 MUST 兼容映射到 py；三个注入点（py 组/js 批/jsx 推断批）MUST 将声明 flags 置于文件参数之前，hits 来源 MUST 不注入（防双加）；readDepsRegressCap MUST 解析 N|off|缺省，组面 MUST 按 own 优先语义应用并 loud 披露。

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

### FR-05: 测试：两键解析三态＋三注入点源码锚＋缺省零回归锚＋schema/config-validate 套件绿

- readRunnerFlags MUST 行式解析 runner_flags 嵌套映射（批类别→flags；引号/注释/CRLF 容错；未知类别保留）；py_runner_flags 单键 MUST 兼容映射到 py；三个注入点（py 组/js 批/jsx 推断批）MUST 将声明 flags 置于文件参数之前，hits 来源 MUST 不注入（防双加）；readDepsRegressCap MUST 解析 N|off|缺省，组面 MUST 按 own 优先语义应用并 loud 披露。

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: 不适用：纯解析/接线变更（键读取+命令串拼接+面截断），既有组卷与回执面即验证；平台仓下一轮 deps 回执即真实验证
FR-02: 不适用：纯解析/接线变更（键读取+命令串拼接+面截断），既有组卷与回执面即验证；平台仓下一轮 deps 回执即真实验证
FR-03: 不适用：纯解析/接线变更（键读取+命令串拼接+面截断），既有组卷与回执面即验证；平台仓下一轮 deps 回执即真实验证
FR-04: 不适用：纯解析/接线变更（键读取+命令串拼接+面截断），既有组卷与回执面即验证；平台仓下一轮 deps 回执即真实验证
FR-05: 不适用：纯解析/接线变更（键读取+命令串拼接+面截断），既有组卷与回执面即验证；平台仓下一轮 deps 回执即真实验证
