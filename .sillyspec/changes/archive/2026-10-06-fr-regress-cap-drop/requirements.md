---
author: flow-machine-draft
created_at: 2026-10-06T11:20:52.294Z
---
# 需求规格（Requirements）— 2026-10-06-fr-regress-cap-drop

## 功能需求

> FR 由你撰写：每条 = `### FR-NN: 标题` + 一句带强度词的行为规定（必须=硬性；禁止=红线；
> SHOULD=建议须注理由；可以=可选）；边界情形加场景块 `#### 场景：名` + Given/When/Then 行。
> 标题行是成功标准锚（勿改写——收口做门柱对比）；正文与场景块归你。

### FR-01: priorityFiles ∪ 变更自身测试文件不再被 CAP 弃置：优先面整跑（组内序保持优先前缀+字母序），帽只界普通 import 依赖（fill 剩余席位）

buildDepsBatches 组卷时，优先面（priorityFiles ∪ changedFiles 命中的测试文件）必须整跑豁免 CAP：任一语言组内优先面数量超过该组配额时，普通 import 依赖让位（剩余席位可为 0），禁止弃置任何优先面文件；组内文件序必须保持「优先前缀 + 字母序」不变。

#### 场景：优先面超帽

Given js 组 40 个优先文件 + 20 个普通依赖（jsCap=30）
When buildDepsBatches 组卷
Then 实跑 40（全部优先文件），普通依赖 0 席、dropped=20，无任何优先文件被弃

#### 场景：优先面未满帽

Given js 组 5 个优先文件 + 40 个普通依赖（jsCap=30）
When buildDepsBatches 组卷
Then 实跑 30（5 优先 + 25 普通按字母序），dropped=15（全部普通依赖）

### FR-02: 批对象披露计数分列：count=实跑总数、dropped 只计普通依赖弃置、新增优先面计数；控制台「超帽弃」文案只对普通依赖成立，优先面计数在场

deps 批对象的 count 必须为实跑文件总数，dropped 必须只计普通依赖弃置数，并新增 prioCount（实跑中的优先面文件数）与 prioDropped（防御路径，构造上恒 0）；runModuleSubset 的批日志必须披露优先面计数，「超帽弃」文案必须限定为普通依赖，prioDropped>0 时必须打警告。

#### 场景：主路径

Given FR 关联回归并入 63 个绑定文件（超 30 帽）
When runModuleSubset 组卷执行
Then 日志含优先面计数与「超帽弃 N 普通依赖」，全部 63 个绑定文件进入执行命令

### FR-03: 既有分组/运行器推断行为不变：.py/tsx/jsx 组、pytest/vitest 推断、e2e 目录过滤、cd 重定基照旧（回归测试钉住）

本变更必须禁止改动既有分组与运行器推断语义：.py/其余 的语言分组、pytest/vitest 运行器双源推断（命中命令串 + 项目结构）、e2e 目录与项目运行器收集面取交集、cd 前缀重定基——行为必须与现状逐字一致（既有直测回归钉住）。

#### 场景：主路径

Given 既有 test/dynamic-test-inference.test.mjs、test/residual-runner-parity.test.mjs、test/deps-cwd-prefix.test.mjs 全绿基线
When 应用本变更后重跑
Then 上述测试全部照旧通过

### FR-04: 直测覆盖三种配额形态：优先面超帽（普通依赖零席位）、优先面未满帽（普通填余）、py/js 混组优先豁免

本变更必须自带直测覆盖三种配额形态：① 优先面超帽（普通依赖零席位）② 优先面未满帽（普通依赖填余）③ py/js 混组（两组优先面各自豁免本组配额，比例配额计算不变）。

#### 场景：主路径

Given 构造 3+2+40 个测试文件的三组 fixture
When 直测 buildDepsBatches
Then 三种形态的选择结果与计数断言全绿

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/fr-regress-cap-drop.test.mjs「优先面超帽整跑+未满帽填余」
FR-02: test/fr-regress-cap-drop.test.mjs「批计数分列与控制台披露」
FR-03: test/dynamic-test-inference.test.mjs「既有 runner 结构推断回归」
FR-04: test/fr-regress-cap-drop.test.mjs「py/js 混组优先豁免」
