---
author: flow-machine-draft
created_at: 2026-10-23T07:03:48.235Z
---
# 任务注册表（Tasks）— 2026-10-23-runner-flags-generic

- [x] task-01: readRunnerFlags(specBase) 行式解析 runner_flags 嵌套映射（键=批类别，值=flags 串，引号/注释剥离/CRLF 容错/块结束于去缩进行）；py_runner_flags 单键兼容映射到 py；未知类别键保留（前向兼容不报错）；缺省/坏值/不可读 fail-soft 空映射（零回归）
- [x] task-02: 三个注入点：py 推断组 grp.command、js 批 jsPrefix、jsx 推断批 jsxPrefix（hits 来源不注入防双加）——flags 均置于文件参数之前（node/go 类参数解析在首个位置参数处截断）；chunkByCommandLength 计入 flags 长度
- [x] task-03: readDepsRegressCap(specBase)（N 1-2000|off|缺省 null）+ 组面应用：own=changedFiles∩deps 优先整跑；off=只跑 own；N=own∪依赖面前 N；loud 披露被弃数与去向（归 pre-push/CI 门）；缺省零回归
- [x] task-04: schema 注册 runner_flags(object)/deps_regress_cap(string)+example token；平台仓 local.yaml 落地 runner_flags{py}+deps_regress_cap: off、config validate exit 0
- [ ] task-05: 测试：两键解析三态＋三注入点源码锚＋缺省零回归锚＋schema/config-validate 套件绿
