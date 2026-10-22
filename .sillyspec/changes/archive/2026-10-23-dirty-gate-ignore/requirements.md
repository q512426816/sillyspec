---
author: flow-machine-draft
created_at: 2026-10-22T23:39:13.117Z
---
# 需求规格（Requirements）— 2026-10-23-dirty-gate-ignore

## 功能需求

### FR-01: dirty_gate_ignore 配置键与单一源剔除

- local.yaml 新键 `dirty_gate_ignore`（单行逗号分隔目录/文件前缀，posix）必须在 collectFreezeFiles 内生效（单一源）：dirty 面收集中命中前缀的文件被剔除，返回值必须带 `dirtyIgnored` 清单；patch 子步权威门必须对剔除留一行 ℹ️ 留痕（N 个 dirty 文件按 dirty_gate_ignore 剔除——已知残渣面）；剔除后 dirtyWarned 为空则 dirty 门不阻断，收口照常完成。

#### 场景：配置命中剔除

Given 共享主仓存在残渣文件（如 residue/tmp-x.js）且 local.yaml 配置 `dirty_gate_ignore: residue`；When 运行 flow done；Then 该文件不进 dirty 冻结缺口、输出含 ℹ️ 剔除留痕行、收口完成（无三选一阻断）。

#### 场景：unit 返回

Given 直调 collectFreezeFiles 且 dirty 面含命中与未命中文件；Then dirtyWarned 只含未命中文件、dirtyIgnored 只含命中文件。

### FR-02: 三态 fail-soft 零回归

- 未配置该键/键值非法/local.yaml 不可读三态必须 fail-soft（忽略清单为空）：dirty 门行为与改动前逐字一致（照常阻断），有测试锚。

#### 场景：未配置零回归

Given 残渣文件在场但未配置 dirty_gate_ignore；When 运行 flow done；Then 照常阻断（既有文案原样），无剔除留痕行。

### FR-03: 预检同源继承与文案同步

- 收口预检（flow-preflight.js 经同一 collectFreezeFiles）必须自动继承忽略——配置在场时预检不再产 dirty-gap finding，预检代码零改动；阻断文案（权威门与预检两处拷贝）必须各增第④条出路指引（dirty_gate_ignore 固定忽略，module_gate_ignore 同款形态），两处逐字同步。

#### 场景：预检继承

Given 配置命中残渣且 dirty 面仅残渣；When 运行 flow done；Then 预检零 finding（实测照常启动），权威门留 ℹ️ 剔除行后完成。

### FR-04: 测试矩阵

- 新增测试必须覆盖：未配置照常阻断（零回归锚）/ 配置命中剔除+完成收口+留痕行 / 前缀不命中照常阻断 / unit collectFreezeFiles 返回 dirtyIgnored 与 dirtyWarned 切分。

#### 场景：四态

Given temp 仓与直调各场景；When 分别执行；Then 断言各自成立。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/dirty-gate-ignore.test.mjs「②配置命中剔除+完成收口+留痕行」「④unit dirtyIgnored/dirtyWarned 切分」
FR-02: test/dirty-gate-ignore.test.mjs「①未配置照常阻断（零回归锚）」「③前缀不命中照常阻断」
FR-03: test/dirty-gate-ignore.test.mjs「②配置命中剔除+完成收口+留痕行」
FR-04: test/dirty-gate-ignore.test.mjs「①-④」
