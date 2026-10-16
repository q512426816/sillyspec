---
author: flow-machine-draft
created_at: 2026-10-16T08:28:38.146Z
---
# 需求规格（Requirements）— 2026-10-16-ci-linux-residual-fix

## 功能需求

### FR-01: test/backlog-batch-a.test.mjs 在 linux 与 windows 双端退出码 0（12/12 通过）

- 必须：该文件的 `mock.module('fs', { exports })` 导出对象不得含 `node:fs` 上不可重定义的键
  （`constants` 在 linux 为 writable:false/configurable:false 数据属性，cjsMockModuleLoad 逐键
  ObjectDefineProperty 必抛 `Cannot redefine property: constants` 并炸掉整文件；windows 同属性
  writable:true 侥幸不炸——本地绿/CI 红的分叉点）。剔除后双端整文件退出码 0、断言 12/12 通过。

#### 场景：linux 装载 CJS 内置模块

Given 容器（node:24-alpine，linux）下 `fs.constants` 不可重定义、`F_OK/R_OK/W_OK/X_OK` 为 enumerable:false 只读 getter
When 测试注册 mock 后动态 import `../src/quicklog.js?spin-test=…` 触发 CJS `'fs'` 装载
Then 不再抛 `Cannot redefine property: constants`，偷锁分支断言（attempts≥2、按 timeoutMs 抛错）全绿、退出码 0

#### 场景：windows 行为零回退

Given windows（node 24.15）下 `fs.constants` 为 writable:true（删键前后都不炸）
When 本地跑同一文件
Then 仍 12/12 通过——quicklog 的 fs 使用面（openSync/renameSync/appendFileSync 等）不含 `constants`，删键无副作用

### FR-02: test/feedback-batch2-hardening.test.mjs 双端退出码 0；⑥ 段 linux 钉「大小写不符如实落②类不放水」、win32/darwin 钉「折叠命中」，./ 前缀+尾部注记与 NEW 未建两项跨平台钉死

- 必须：⑥ 段的大小写断言随 `process.platform` 分叉，与实现口径（src/verify-postcheck.js `pathKey`
  的 `foldCase`，仅 win32/darwin 折叠）一致；`./` 前缀 + 尾部注记归一转正与 `NEW:` 未建落②类
  两项在双端恒真；双端退出码 0。

#### 场景：linux 大小写敏感

Given linux 磁盘/git 实为 `src/foo.js`，声明写 `Src/Foo.js（入口）`
When `reconcileTargetFiles` 归一比对
Then 该声明如实落②类（missing 含 `Src/Foo.js（入口）`）——禁止全局折叠把写错的路径放水

#### 场景：win32/darwin 大小写不敏感

Given 同为不敏感文件系统平台
When 同一比对
Then 折叠命中（missing 空、matched 含 `foo.js`）

#### 场景：注记与前缀归一跨平台

Given 声明写 `./src/foo.js（入口）`（parseTargetFiles 剥 `./`，尾部注记由对账键剥）
When 比对磁盘已改的 `src/foo.js`
Then missing 空、status=ok、matched 命中；随后 `NEW: src/never-made.js` 仍落②类且 isNew=true

### FR-03: 本地 Linux 容器内全量 npm test 零失败（818 文件）

- 必须：`node:24-alpine` 容器（仓挂载 + git）内 `npm test` 全量池零失败文件——首轮上 CI 的
  跨平台欠账须在本地可复现、可验证后收口，不得以盲推等 CI 作为唯一核验路径。

#### 场景：全量池本地跑

Given 容器可读仓工作树（含 node_modules 纯 JS 依赖）与 git
When 容器内 `npm test --silent`
Then 汇总行失败数为 0（文件数随 HEAD 增长 ≥818）

### FR-04: 推送后 CI test job 转绿（lint/docs-gate 维持绿）

- 必须：推送 origin/main 后最新 CI run 的 lint / docs-gate / test 三 job 全 success；test job
  失败文件数 0（头部 814 通过/2 失败 → 全绿）。

#### 场景：推 CI 回执

Given 本地双端（容器 linux + windows）已全绿
When 推送并等 run 结束
Then `gh run view <id>` 三 job 均 success

### FR-05: 零回归：两文件其余断言、src 实现（quicklog.js/verify-postcheck.js）行为不改

- 必须：两文件的其余断言（①②③④⑤段）与 src/quicklog.js、src/verify-postcheck.js 的运行时行为
  逐字节不改——本变更只动测试侧的跨平台适配面与源码字节卫生（FR-06），不改产品逻辑。

#### 场景：其余段全绿

Given 两文件除⑥/③b 外各段断言未改
When 双端跑
Then 全部分段通过（backlog-batch-a 12/12；feedback-batch2 六段全通过）

### FR-06: src/verify-postcheck.js 不嵌裸 NUL 字节（源码可被 grep/rg 检索）

- 必须：`src/verify-postcheck.js` 内不得含裸 NUL（0x00）字节——复合键分隔符必须写成 `\u0000`
  转义形态；该文件不得再被判为二进制而让 grep 静默吞掉全部命中（检索致盲即实证：本轮
  `grep -n foldCase src/verify-postcheck.js` 静默零输出）。运行时字符串值必须与改前逐字节相等。

#### 场景：检索面

Given 裸 NUL 已替换为 6 字节转义序列
When `grep -n "foldCase" src/verify-postcheck.js`
Then 正常输出命中行（不再被当二进制）；`node --check` 通过且全量套件零失败

### FR-07: quick 审计 EOL 假 M 过滤在 git ≤2.43 上不得静默失效（探测走 --numstat）

- 必须：`src/run/shared.js` 的 EOL-only 探测必须走 `git diff --numstat --ignore-cr-at-eol HEAD`——
  `--name-only` 组合在 git ≤2.43 上仍列出纯行尾重写文件（Debian 12 git 2.39.5 / Ubuntu 24.04
  git 2.43.0 实测），会让「gen:types 行尾重写制造假 M」坑（2026-09-12 修复）在这些环境静默复活；
  且须有源码钉锁定该形态（行为测试在 CI 的 git ≥2.54 上抓不到此版本差）。rename 两形态
  （`old => new` / `pre{old => new}post`）必须落新名，不得把重命名误判为 EOL-only 剔出。

#### 场景：老 git 假 M 剔除

Given git 2.39.5 容器 / 2.43 WSL 下 tracked 文件仅行尾 LF→CRLF
When auditQuickCompletion 审计
Then 该文件归 eolOnlyFiles 且不进 changedFiles（EOL 用例红→绿，修复前容器实证）

#### 场景：rename 不误剔

Given 已暂存重命名 `a.js → b.js` 叠加行尾重写
When 同一审计
Then b.js 留在 changedFiles、eolOnlyFiles 为空（numstat 的 `old => new` 形态取新名）

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/backlog-batch-a.test.mjs「③b 偷锁 rename 持续失败 → 按超时抛错（不忙等自旋）」
FR-02: test/feedback-batch2-hardening.test.mjs「⑥ target_files 对账路径键归一」
FR-03: test/run-tests.mjs（容器内全量池——819 文件逐件退出码）
FR-04: 不适用：CI 结果面（GitHub Actions run 回执）非仓内测试可断言，以 gh run view 三 job 回执核验
FR-05: test/backlog-batch-a.test.mjs「①②③a 各段」+ test/feedback-batch2-hardening.test.mjs「①②③④⑤段」+ test/run-tests.mjs（全量池）
FR-06: test/run-tests.mjs（全量池回归 src/verify-postcheck.js 引用面）
FR-07: test/quick-audit-foreign-residue.test.mjs「EOL-only 假 M 剔出审计；真实修改保留」+「源码钉：EOL 假 M 探测走 diff --numstat」
