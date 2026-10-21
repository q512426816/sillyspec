---
author: flow-machine-draft
created_at: 2026-10-21T15:07:47.079Z
---
# 设计记录（Design Record）— 2026-10-21-deps-batch-runner-flags

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

问题在 buildDepsBatches 的运行器提取层：:2904 正则懒惰匹配「截到 pytest 一词为止」，local.yaml 模块命令里用户显式配置的 `-q --no-cov -n auto` 全被静默丢弃——deps(auto-py) 批 124 文件单核串行 1183s（同仓全量 4771 例带 -n auto 仅 357s，dsh 0ff6f1c8 补充诊断 22:53 取证）。修法：新增纯函数 extractRunnerTrailingFlags——从命令串中 runner 词之后、段边界（& | ;）之前的 token 流里，保留全部 flag 形 token（含等号一体、已知吃值 flag 连值），丢弃位置参数（原命令文件面由批重定基文件面替代）；命中路径提取出的 pyRunner 追加该 flag 串。结构推断路径（inferPyRunner）与 jsxRunner 提取不动——只恢复用户显式配置的语义，不引入缺省并行。

不做（明确出界）：①缺省补 `-n auto`（PYTEST_ADDOPTS 式环境注入/自动并行）——尊重显式配置；用户未配置并行就保持串行是既有语义。②jsx（vitest/jest）尾随 flag 保留——批实测 60~199s 无痛点，且 vitest 子命令（run）与全局 flag 位置语义复杂，本变更不扩面。③超时单位（SILLYSPEC_TEST_TIMEOUT_MS ≥10000 毫秒兼容分支）——既有文档化行为。④优先面豁免帽/超时自适应分批——组卷策略层，与本 flag 丢失缺陷正交，另案。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- src/verify-postcheck.js：**新导出** `extractRunnerTrailingFlags({ command, runner })` → `string`（保留 flag 串，含前导空格；无可保留返回 ''）；内部 buildDepsBatches 的 hits 命中 pyRunner 追加该串。行为变化：含尾随 flag 的模块命令所构批命令从此保留 flag（此前静默丢弃）。jsx/jsNative/nontest/meta-skip 批、结构推断 runner、cd 前缀提取与重定基：零变化。
- 命令行/配置/文件格式：零变化（不新增 local.yaml 键）。
- 测试：新增 test/deps-batch-runner-flags.test.mjs。

### 文件变更清单

- src/verify-postcheck.js（extractRunnerTrailingFlags 新导出 + pyRunner 提取点追加 flag 串）
- src/run/verify-quality-scan.js（D-001：synthesizeReusedFailedCheck 出路③文案修正——consult 层无环境探针签名）
- test/deps-batch-runner-flags.test.mjs（新增直测）
- test/deps-cwd-prefix.test.mjs（② 契约更新：位置参数丢弃 + 尾随 flag 保留的新语义锚）
- test/verify-reuse-large-repo.test.mjs（D-001 文案跟随：断言锁新出路文案 + 反向锁死环境探针声明不复活）

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

flag 提取是命令串→批命令的纯字符串变换，无时序输入；模块命令在 local.yaml 单源，无乱序面。批执行结果的迟到（增量账本/失败行对账）消费批 command 字符串——flag 保留后 command 变长，对账按退出码/失败行不按命令串，无影响。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

纯函数无状态；批对象（batches）在单次 buildDepsBatches 调用内构造。无并发写面。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

无新落盘状态；批命令字符串随 test-result.json 落盘（既有面），中断重入由既有断点续机制承担，与本变换无关。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

flag 保留只作用于 hits 命中的模块命令（本仓 local.yaml 单源）；结构推断路径不带 flag，跨仓 cwd 差异不影响。吃值 flag 白名单是 pytest/vitest 通用形态枚举，不含路径语义，无串台。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：吃值 flag 白名单外漏——未知吃值 flag（如 --cov-report xml 空格形态）的值词会被当位置参数丢弃，命令退化为裸 flag（行为温和变化，不炸批）；已知高频面（-n/-k/-m/--maxfail/--timeout/--durations/--junitxml/-p/--config/--reporter）已枚举，漏网成本是性能/报告形态退化不是假绿假红。次风险：用户命令里 flag 含引号包裹（`"-n" "auto"`）——token 化后剥引号匹配白名单，值 token `auto` 不带引号形态主流；极端全引号形态丢值退化为裸 -n（pytest -n 缺值报 usage error → 批失败可见，不静默）。

试过放弃的方案：①缺省给 py 批补 `-n auto`——未配置 xdist 的仓会炸（ModuleNotFoundError usage error），且违背「显式配置语义优先」既有立场；②整段保留 runner 之后所有内容（含位置参数）——原命令文件面混入批文件面，跑面失控（目录参数会把整个目录收进来，动态子集退化全量）；③PYTEST_ADDOPTS 环境注入——作用面溢出（该 shell 所有 pytest 全被改），且属调用侧 workaround 非工具修复。
