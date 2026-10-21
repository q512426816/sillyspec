---
author: flow-machine-draft
created_at: 2026-10-21T17:12:00.000Z
---
# 设计记录（Design Record）— 2026-10-21-known-failures-unescape

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

写侧（config-known-failures renderKey）本来就按 YAML 规范转义，病根是三个读侧各自拷贝的「剥引号」提取不反转义——含反斜杠的锚定豁免模式（known_failures 锚定式的正确写法）到达判账层带字面双反斜杠，正则语义漂移为「字面反斜杠+任意字符」，豁免静默永不命中；CLI remove 同因必未命中且文案恒称已移除。修法：新建零依赖叶子模块 src/yaml-scalar-unquote.js（unquoteYamlScalar：双引号标准转义集反转义 \→\/\"→"/\n/\t/\r/\0、未知转义回落字面；单引号 ''→'；裸值 trim 返回），三读侧在各自条目映射处统一 import 消费——不修写侧（已正确）、不动各读侧既有的分段/注释容忍结构（只换条目级规范化这一步），三处口径从「逐字对齐」的拷贝共识收敛为单点。

不做（出界）：①inline 流式 split(',') 对引号内逗号的切分盲区（-k "a, b" 形态）——既有边界，另案；②verify-postcheck 块式条目行尾注释不剥（docs-check 剥、verify 不剥的既有不一致）——注释剥除语义归各读侧既有行为，本变更只加引号/反转义规范化；③known-failures.yaml（入库文件）读侧——它走 js-yaml 整解析无此病。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- **新模块** src/yaml-scalar-unquote.js：`export function unquoteYamlScalar(s)` → string（trim + 双引号反转义 / 单引号 ''→' / 裸值原样）。
- src/config-known-failures.js：parseKnownFailureKeys 条目映射改用 unquoteYamlScalar（unquoteKey 内联版退役）；applyKnownFailureEdit 流式分支补 removedCount 返回（与块式对齐）；runKnownFailuresCommand remove 文案按 removedCount 与传入键差集诚实注记。
- src/verify-postcheck.js：extractKnownFailures 流式 token 与块式条目统一过 unquoteYamlScalar。
- src/docs-check.js：known_failures 条目提取的引号剥除段改用 unquoteYamlScalar（含反转义）。
- 行为变化：双引号条目含反斜杠的豁免模式从「静默失配」变「真实生效」；CLI list 显示规范键（用户原样）；remove 原样键可命中。命令面/文件格式零变化。

### 文件变更清单

- src/yaml-scalar-unquote.js（新增叶子模块）
- src/config-known-failures.js（读侧规范化 + 流式 removedCount + 文案）
- src/verify-postcheck.js（读侧规范化）
- src/docs-check.js（读侧规范化）
- test/known-failures-unescape.test.mjs（新增直测）

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

纯字符串规范化函数无时序输入；local.yaml 单文件读改写沿用既有原子写（writeAtomicSync），并发写在写侧既有语义内。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

与本变更无关的既有面：mutateKnownFailuresFile 读-改-写非锁保护（writeAtomicSync 原子替换，后写者胜）——行为不变；规范键比对在单进程内存内完成。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

无新落盘状态；unquote 是纯函数，中断无残留。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

unquoteYamlScalar 零 IO 零全局态；三读侧 import 同一实现后口径天然一致，跨仓无串台面。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：存量 local.yaml 中已手写「未转义反斜杠」的双引号条目（如手工直编辑出 "a\.b$"——严格 YAML 下 \. 非法，js-yaml 会抛错拒改，本就到不了读侧；宽松形态按未知转义回落字面，\. 不变、\. 回落为 .——语义与修复前对该形态的读法（原样保留 \.）不同。缓解：该形态在 YAML 严格语义下本不合法，js-yaml 门（list/apply 已有）先拦；豁免失配的后果方向是保守（多跑一轮）不是假绿）。次风险：三读侧 import 新模块的加载顺序/循环——叶子模块零 import，无环。

试过放弃的方案：①改写侧不转义（裸写反斜杠）——产出非法 YAML，js-yaml 门必拒，自毁;②读侧整体换 js-yaml 解析该段——三处读侧刻意轻量化不引重链（config-known-failures 注释自述），且整段重解析会动既有「断链容忍/注释容忍」行为面，超本次对称性修复；③只在 verify-postcheck 修——docs-check 与 CLI 侧同病不同修，三口径继续漂移。
