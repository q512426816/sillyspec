---
author: flow-machine-draft
created_at: 2026-11-26T01:33:10.489Z
---
# 需求规格（Requirements）— 2026-11-26-flow-help-flag-shortcircuit

## 功能需求

### FR-01: sillyspec flow start --help 及任一 flow 子命令带 --help / -h 打印用法并正常返回，不再生成临时变更名、不再走需求清晰度提示

- `sillyspec flow <子命令> --help`、`sillyspec flow <子命令> -h`、`sillyspec flow --help`、`sillyspec flow -h`、`sillyspec flow help [<子命令>]` 必须把用法打印到 stdout 并正常返回（进程退出码 0）。
- 帮助路径禁止生成临时变更名，禁止进入需求清晰度门，禁止进入各子命令的「需 --change <名>」参数校验。

#### 场景：flow start --help

- Given 任意工作目录（无需已 init）
- When 调用 `sillyspec flow start --help`
- Then stdout 含各子命令用法，调用正常返回；输出中不出现「需求不够清晰」，也不出现任何生成的变更名

#### 场景：flow done --help

- Given 任意工作目录
- When 调用 `sillyspec flow done --help`
- Then 打印用法并正常返回，而不是报「flow done 需 --change <名>」

### FR-02: 帮助短路先于平台 spec 根解析与任何立项落盘逻辑，零文件系统副作用

- 帮助短路必须在平台 spec 根解析、agent 会话日志登记、变更目录创建之前执行。
- 帮助路径禁止写入任何文件，禁止调用 process.exit。

#### 场景：平台指针损坏的工作目录

- Given cwd 下 `.sillyspec-platform.json` 内容为非法 JSON（平台 spec 根解析必 fail-closed）
- When 调用 `sillyspec flow start --help`
- Then 仍打印用法并正常返回，不触发 fail-closed 的退出码 2

### FR-03: 用法列出全部八个子命令与代码内实际消费的旗标；未知子命令与空子命令的兜底行为不变

- 用法必须列出 start / done / status / verify-drafts / diff / approve / reject / amend-draft 八个子命令；列出的旗标集合必须与 cmdFlow 内实际消费的旗标集合相等（不多列，也不漏列）。
- start 的详注必须保留 `--input` 可照抄形态与预段同意门提示（与既有兜底用法的教学口径一致）；目标不是 start 时不得输出 start 的 `--input` 照抄详注。
- 未知子命令与空子命令必须维持既有兜底行为（stderr 打印用法并以退出码 2 结束）；正常调用中参数值恰为 help（如 `--input "help"`）不得被判为帮助请求。

#### 场景：未知子命令

- Given 任意工作目录
- When 调用 `sillyspec flow no-such-sub`
- Then stderr 打印既有用法文本并以退出码 2 结束

#### 场景：参数值恰为 help

- When 调用 `sillyspec flow start --change <名> --input "help"`
- Then 不判为帮助请求，照常进入 start 的既有逻辑

### FR-04: 新增测试全绿，既有测试零回归

- 新增用例必须全绿；flow 用法的既有源码断言与 flow 族既有套件必须零回归。

#### 场景：帮助旗标形态判定

- Given 子命令带 --help 或 -h、flow 自身带 --help 或 -h、flow help 后接或不接子命令
- When 判定是否为帮助请求
- Then 均判为帮助；不带帮助旗标的正常调用一律不判为帮助

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/flow-help-flag.test.mjs「进程内调用 flow start 帮助旗标：打印用法并正常返回且零落盘」
FR-01: test/uninit-cwd-gate.test.mjs「flow 帮助旗标在未初始化目录放行到命令层，零落盘，无帮助旗标照旧硬拦」
FR-02: test/flow-help-flag.test.mjs「短路先于平台 spec 根解析：指针损坏的 cwd 下仍打印用法」
FR-03: test/flow-help-flag.test.mjs「用法内容：八个子命令与代码内实际消费旗标齐备，含 --input 照抄形态」
FR-03: test/flow-help-flag.test.mjs「未知子命令兜底不变：stderr 用法并 exit 2」
FR-04: test/flow-help-flag.test.mjs「帮助旗标形态判定：子命令带帮助旗标与 flow help 均判为帮助，正常调用不误判」
FR-04: test/flow-help-status.test.mjs「用法行列出 flow status 子命令」
