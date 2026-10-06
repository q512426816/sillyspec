---
author: flow-machine-draft
created_at: 2026-10-06T06:35:49.994Z
---
# 设计记录（Design Record）— 2026-10-06-module-map-list-leak

> 四节每节必答——问题行原样保留（勿删勿改勿用答案替换），答案另起一行写在问题行下方；小改动可写「不适用：<理由>」；flow done 空节拒收。
> 需要列改动文件时加独立「## 文件变更清单」章节+表格（| 操作 | 路径 | 说明 |）——章节标题是 parseFileChangeList 的识别面，勿写在「接口契约」节内（收口声明面解析不到会误报夹带嫌疑）。
> 四问原文/FR 标题/镜像任务行是收口锚——问题行/标题从本模板原样保留或复制，勿删勿改、勿用答案整块替换问题原文、勿手打重写（标点也要逐字：2026-10-05 三度实证——句号手写成问号、答案整块替换问题原文均被锚对比拒收）。

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

修三个手写 `_module-map.yaml` 解析器的列表收集终止条件：在各自的已知字段分支之后、列表项收集分支之前，加一条**通用字段头守卫**——任何缩进 4 的 `字段名:` 行（无论识别与否）终结当前 list 字段的收集。这是开放世界判据（yaml 字段集不可枚举，未来新字段自动安全），与 parseModuleMapSimple 现有的字段名枚举白名单正相反——枚举正是漏点而非防线。

次生修复：flow start fresh 起点域路由的 input 路径样 token 加「在场或图内」过滤（新助手 `extractRoutingInputPaths(cwd, specBase, input)` = 提取 + existsSync/模块图覆盖双判，只用于域路由 filesOverride；绿地草案 bsPaths 仍用未过滤的 extractInputPaths）。散文斜杠词（git/DB/JSON）两判据皆不成立即出局，落空走既有「起点无依据」诚实提示——判据是文件系统在场性与仓内模块图（开放世界注册表），不建前缀/扩展名白名单。「图内」判据保住既有契约（thin-fr-inject-parity ④）：--input 提到将新建的 src/cli/login.js 仍命中 cli 域——纯在场判会误杀该用例（实测全量回归第一轮即抓出）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `src/decision-distill.js` `parseModulePathsSubset`：解析结果收紧——paths/core_files 不再吸收后续未知字段（tags/aliases/entrypoints/main_symbols/depends_on/used_by/concerns/review_reasons…）的列表项。签名不变。
- `src/module-impact.js` `parseModuleMapPaths`：同上收紧。签名不变。
- `src/modules.js` `parseModuleMapSimple`：同上收紧（枚举外字段头也终结收集）。签名不变；已识别字段（含内联数组）行为不变。
- `src/flow.js` 新增导出 `extractRoutingInputPaths(cwd, specBase, input)`（async）；cmdFlowStart fresh 起点的 flowKnowledgeDigest filesOverride 改用之（绿地 bsPaths 不变）。
- `src/fr-index.js` 新增导出 `matchedModuleIds(moduleIndex, filePath)`——路径↔模块匹配规则单一来源，resolveTouchedDomains 内联规则改为复用（行为不变）。
- `src/module-impact.js` `parseModuleMapPaths` 增内联 `paths: [..]` 识别与 CRLF 归一（ground truth 审计实证：sillyhub-daemon 整图内联 CRLF 写法此前恒漏 343 条＝模块归属全盲）。
- 行为可见面：flow start 知识注入触达域不再被散文斜杠词误路由/铸伪域；frCoverageFiles TierA 覆盖排名、module-impact 归属分类的原料数据去污。CLI 命令、文件格式：无变化。

## 文件变更清单

| 操作 | 路径 | 说明 |
| --- | --- | --- |
| 修改 | src/decision-distill.js | parseModulePathsSubset 通用字段头守卫 |
| 修改 | src/module-impact.js | parseModuleMapPaths 通用字段头守卫 |
| 修改 | src/modules.js | parseModuleMapSimple 未知字段头终结收集 |
| 修改 | src/flow.js | 新增 extractRoutingInputPaths；fresh 域路由 filesOverride 换用 |
| 新增 | test/module-map-list-leak.test.mjs | 三解析器不泄漏/开放世界性/在场过滤/绿地不受影响/端到端误路由回归 |

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   成立——解析是单遍行级状态机，输入是完整文本快照，无乱序概念；字段头守卫只依赖行结构（缩进+冒号），与字段出现顺序无关。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   不适用——解析纯函数无写；map 文件被并行重写时读侧拿到旧/新快照之一（readFileSync 原子性边界），与本修复无交互。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   安全——无跨调用状态；中断重跑结果一致。在场过滤是即时 existsSync 探测，路径被并行创建/删除的瞬态最多让该 token 本轮参与/不参与路由，下一轮自愈。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   不会——解析对象是各仓自己的 map；extractRoutingInputPaths 的 cwd 是调用方显式传入的工作区根，不读全局状态。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：依赖「泄漏项」的行为面——若有下游逻辑意外依赖污染数据（如某模块故意把单段 tag 当 path 用、或测试断言了污染形态），收紧后行为变化。已核：仓内测试 fixtures 均无 paths 后跟 tags 的块式写法（这正是泄漏长期不可见的原因）；泄漏项全是 tags/aliases/symbols/deps 值，语义上就不是路径。次风险：在场过滤把「动机里提到的未来新文件」token 滤掉致路由落空——已按「在场或图内」双判收敛（图内目标文件照常路由），落空走诚实提示（起点无依据），优于误路由冒充真域，取舍在设计里写明。量化口径注记（评审 P3 清偿）：早期粗计「950 条实路径」是修复前解析面计数（含 450 条带斜杠泄漏垃圾：入口注释/路由串/模块描述）；jsYaml ground truth 对账真实声明为 500 条，泄漏项合计 1375 条——test 头注释与本设计以 500/1375 为准，proposal 转写中的 950 为过程记录不再修正（历史镜像）。
放弃的方案：①parseModuleMapSimple 式字段名枚举白名单补全三解析器——放弃，开放世界字段集枚举不全即是本 bug 的成因（用户约束亦禁止）；②换 js-yaml 整体解析——放弃，三个解析器各有「只取平面子集、坏段不缺省不拦截」的容错立场（注释明示），整体解析改变坏段行为与性能面，超出本修复的刀口。
