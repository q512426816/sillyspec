---
author: flow-machine-draft
created_at: 2026-11-11T04:55:01.365Z
---
# 需求规格（Requirements）— 2026-11-11-deps-hub-symbol-narrow

## 功能需求

### FR-01: 变更枢纽模块某导出符号时，仅引用模块其他未触达导出的依赖测试不再入 import 依赖回归面

- 变更文件为枢纽模块（同一回归面计算中，该文件的模块路径命中依赖测试数 **> 8**，常量在代码内、无配置键）且其 diff 可提取出非空触达导出符号集时，依赖测试若对该模块的全部命名导入（import { … } / require 解构，取 as 前名）均不含任何触达符号，则**必须**被排除出 import 依赖回归面。

#### 场景：枢纽收敛主路径

- Given fixture 枢纽模块导出符号 `alpha` 与 `beta`，10 个依赖测试文件全部 `import { alpha } from '../src/hub.js'`，变更 diff 只触达 `beta`（hunk 落在 beta 声明/函数体内）
- When 对该 fixture 运行 discoverModuleDependentTests 且传入触达符号集
- Then 这 10 个测试全部不入面（收敛生效），返回清单不含它们

### FR-02: 引用触达符号的依赖测试（命名 import/解构）照常入面

- 依赖测试对枢纽模块的命名导入含**任一**触达符号时，**必须**保持其在 import 依赖回归面内（与现行模块路径匹配同结果）。

#### 场景：触达符号引用保持

- Given 同 FR-01 fixture，另有测试 `import { beta, alpha } from '../src/hub.js'` 与 `const { alpha } = require('../src/hub.js')`
- When 触达符号集为 `['beta']`
- Then 两个测试均入面（命名导入含 beta / require 解构判定同口径）

### FR-03: 无法判定引用形态（star import/动态 import/别名/解析失败）时 fail-open 回落模块路径匹配（多跑侧不漏）

- 引用形态无法判定时**必须** fail-open：依赖测试存在 default/star/动态 import、require 整体赋值、或对模块路径的字符串提及但无任何 import 语句时，**必须**保留在面内；触达符号提取失败或为空（非 JS/TS、文件删除、无 diff、anchor 缺失）时该变更文件**必须**整体回落现行模块路径匹配口径（多跑侧，行为不窄于现状）。

#### 场景：fail-open 三态

- Given 枢纽 fixture 含三个特殊测试：`import Hub from '../src/hub.js'`（default）、`import('../src/hub.js')`（动态）、仅注释/字符串提及路径（剥注释后无 import）
- When 触达符号集为 `['beta']`
- Then 三个测试均入面（unknown 判定 → fail-open）

### FR-04: 无符号信息（不可提取/未传 diff）时行为与现状逐字一致，既有测试面推断零回归

- 调用方未传 `touchedExportSymbols` 参数或对变更文件无符号条目时，discoverModuleDependentTests 的返回**必须**与不带该参数的现状实现逐字一致；既有测试面推断套件（dynamic-test-inference / dynamic-deps-comment-edge / deps-cwd-prefix 等）**必须**零改动跑绿。

#### 场景：参数缺省零回归

- Given 既有全部 deps 推断测试 fixture（模块命中数均 ≤ 8 或不传符号参数）
- When 按现状方式调用（不传新参数）
- Then 既有测试零改动全绿，返回与改前一致

### FR-05: 新增符号提取与收敛判定的纯函数测试跑绿

- `extractTouchedExports`（export 声明 span × diff hunk 交集 + 差异行符号名词法）与 `namedImportEvidence`（hit/miss/unknown 三态判定）**必须**作为可独立测试的纯函数导出，新增测试覆盖：声明 span 与 hunk 跨行花括号相交、差异行出现导出名、`export { a, b }` 列表、`import x as y` 别名取前名、混合 import 命中任一即 hit、全 miss 收敛、unknown fail-open——全部**必须**跑绿。

#### 场景：纯函数边界覆盖

- Given 各形态 fixture 文本（跨行函数体/列表导出/别名导入）
- When 分别调用两个纯函数
- Then 断言命中/排除/unknown 三态与 span 计算正确

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/deps-symbol-narrow.test.mjs「枢纽收敛主路径：未触达符号依赖出面」
FR-02: test/deps-symbol-narrow.test.mjs「触达符号命名导入/require 解构保持入面」
FR-03: test/deps-symbol-narrow.test.mjs「fail-open：default/动态/无 import 语句三态保留」
FR-04: test/deps-symbol-narrow.test.mjs「无符号参数与现状逐字一致」+ 既有 dynamic-test-inference.test.mjs / dynamic-deps-comment-edge.test.mjs / deps-cwd-prefix.test.mjs 零改动回归
FR-05: test/deps-symbol-narrow.test.mjs「extractTouchedExports span×hunk」「namedImportEvidence 三态与别名」
