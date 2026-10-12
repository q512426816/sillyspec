---
author: flow-machine-draft
created_at: 2026-10-12T13:41:49.756Z
---
# 设计记录（Design Record）— 2026-10-12-cli-friction-signal

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

三个「报错不自足/指路不精确」摩擦点的文案与信号面修复（不改任何门判定语义）：① run/gates.js 两处 deps 阻断输出补全三要素（depsStatus/depsError 尾部 200 字符/meta.json 完整路径）+ 正规逃生口 + 勿手改警告——报错即自足，堵死「agent 被迫手改内部 meta.json」的路（dogfood 实证两次手改才过门）；② flow.js 哨兵拒收文案追加证据扫描面声明与跨仓指引一行——扫描面透明化（哨兵只扫工作区仓，跨仓提交天然不在面内，agent 曾靠猜）；③ register-repo 在目标仓 .git/ 内写跨仓标记（零工作区污染），uninit 门 block 态读标记把「在子仓跑 CLI」从通用三出路指路升级为精确指路（工作区路径 + --dir 用法）。三处均为纯信号面增强：门判定、放行条件、退出码全部零变化。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- run/gates.js：deps 门控阻断 stderr 文案增强（主仓 fail-loud 块 + 跨仓 crossFailed 循环）——新增 meta.json 路径行、depsError 尾部截断（≤200 字符）、勿手改警告行、跨仓分支补 doctor --fix/run execute 逃生口行。判定与 exit code **无**变化。
- src/flow.js：哨兵拒收 stderr 追加两行（扫描面声明 + 跨仓指引）。其余 **无**变化。
- src/local-register.js：registerRepoInLocalYaml 成功写 local.yaml 后 best-effort 写 `<仓根>/.git/sillyspec-crossrepo.json`（新文件产物；{workspace 正斜杠, key, registeredAt ISO}；.git 非目录跳过；失败仅告警）。函数签名 **无**变化。
- src/run/shared.js：resolveUninitCwdGate 返回值 block 态新增可选字段 `crossRepo: {workspace, key}`（标记在场时；损坏/缺失不返回该字段）。
- src/index.js：uninit 门 block 分支 crossRepo 在场时追加两行精确指路。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| M | src/run/gates.js | deps 阻断两分支文案补全 |
| M | src/flow.js | 哨兵拒收扫描面+跨仓指引两行 |
| M | src/local-register.js | 跨仓标记 best-effort 写入 |
| M | src/run/shared.js | resolveUninitCwdGate 读标记返回 crossRepo |
| M | src/index.js | uninit 门精确指路两行 |
| A | test/cli-friction-signal.test.mjs | 五面测试（子进程 stderr/源锚/单元/CLI 级双态） |

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   纯文案/信号面——无时序假设。标记是注册时点快照（registeredAt 留时点）；workspace 迁移后标记过期 → 指路指向不存在路径，用户按通用三出路兜底（crossRepo 指路行与通用行并存非替换）。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   标记写走 writeAtomicSync（tmp+rename）；并发注册同仓不同 key 后写者胜（标记只记最后注册者——uninit 门指路语义仍成立：该仓确属某工作区跨仓）。local.yaml 本体写入仍在 withFileLock 内（既有）。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   标记写入在 local.yaml 写成功后（best-effort）；中断最坏缺标记=退化为现状通用文案，无半态。标记删除随 .git 生命周期（克隆新副本无标记——符合预期：新副本未注册）。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   标记在目标仓 .git/ 内（仓本地、天然 gitignore、不进工作树）；workspace 字段是登记时点的工作区绝对路径（逐机语义，与 local.yaml repos 段同性质）。同一仓被多工作区注册：最后注册者胜——指路「回工作区」仍正确（两工作区任意一个都能跑 CLI；更精细的归属判定属 over-engineering）。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：标记的 workspace 是绝对路径快照，工作区移动/换机后过期。缓解：指路行与通用三出路并存（非替换）、registeredAt 留时点可判新旧；doctor 未来可加标记体检（本变更不做——YAGNI）。

试过但放弃：① uninit 门直接扫盘搜所有工作区的 local.yaml repos 反查——跨目录全盘扫描成本高且无索引，标记方案把索引放到被指物一侧，O(1) 读取；② 把标记写进工作树并建议 gitignore——污染目标仓工作树（用户仓不该被工具塞未跟踪文件），.git/ 内零污染是硬约束；③ deps 阻断自动执行 doctor --fix——门不应有副作用自愈（掩盖环境问题），只指路不代跑。
