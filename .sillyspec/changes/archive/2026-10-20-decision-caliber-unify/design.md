---
author: flow-machine-draft
created_at: 2026-10-20T02:28:57.944Z
---
# 设计记录（Design Record）— 2026-10-20-decision-caliber-unify

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

新建 src/decision-values.js 作正典值集单一源（纯数据零依赖，导出 DECISION_TYPES 8 值 / DECISION_STATUSES 7 值 / 派生集 KNOWLEDGE_TYPES=正典去 scope / KNOWLEDGE_STATUSES=confirmed|accepted|implemented）。三个消费面全部改为导入派生：decisions-io.js 的 STATUS_VALUES/TYPE_VALUES（type 白名单由 6 值扩到 8 值，+feasibility +consistency）、decision-distill.js 的 IMPLEMENTED_TYPES/IMPLEMENTED_STATUSES（类型集改 KNOWLEDGE_TYPES 派生——恰好等于既有 7 值零漂移；状态集 +implemented）、brainstorm.js 两处模板清单（type 对齐 8 值、status 对齐 7 值，清 term/premise/risk/unresolved）。docs/prompt/brainstorm.md 渲染产物用既有 _extract 工具链再生成（docs-check 校验同步）。

正典集取「写入白名单 ∪ 蒸馏入选集」并集的理由：蒸馏 7 类集是修 feasibility 漏选事故扩出来的（decision-distill.js:27-33 注释留档），scope 排除是文档明载的刻意设计（范围裁决不入知识库）——两者都是有据可查的既定意图，并集即事实上的完整契约。implemented 计入入选状态的理由：知识库渲染的「状态：implemented」本就是入选裁决的输出值，输入侧声明 implemented 却永不入选是白名单后加未同步蒸馏的遗留缺陷，纳入后写读两侧语义闭合。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

新导出 src/decision-values.js 四个冻结常量；decisions-io.js / decision-distill.js / brainstorm.js 对外函数签名零变化。行为变化三处且全为放松或闭合：① decisions add 写入白名单 +feasibility +consistency（此前被拒的合法值放行）；② status=implemented 条目蒸馏入选（此前解析保留不写盘）；③ brainstorm 提示文案清单更新（提示面非机器契约）。knowledge/decisions/<域>.md 文件格式零变化；存量条目与知识库零迁移（开放世界由 parseDecisions 宽容兜底）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

成立。值集校验是逐次写入/逐次蒸馏的纯函数判定，无跨调用时序依赖；旧格式条目（扁平列表/无字段行）解析宽容路径零触碰，先写后改或先改后写同一文件都按当前白名单即时判定。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

白名单变宽不改变写入原子性——upsertDecision 原子写、distill 幂等重写既有并发契约原样保留；本变更不改任何写路径代码，仅换值集来源。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

安全。正典集是静态冻结常量，无迁移、无状态升级；中断重跑 distill 幂等（同 ID 同版本整段替换），新增入选状态只影响下次蒸馏的新增条目，已写盘条目重跑零 diff。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不会。值集是进程内常量随 CLI 版本走；知识库条目按域文件物理隔离，旧 CLI 写的散值条目在新 CLI 读取时解析宽容不报错，反向（新写旧读）只发生在同仓升级窗口且 distill 是唯一读取裁决方、随 CLI 同版本分发。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险=存量散值条目被「统一」冲动连带清洗——40+ 种历史 type 值（risk 33、term 28、premise 28 等）若做追溯迁移会大面积改写归档件且蒸馏行为难保零漂移。放弃的方案：a) 存量追溯清洗——归档件是审计事实，改写违反「历史事实当时提名不追改」仓则，且收益为零（散值条目本就解析保留不入选）；b) 蒸馏开放收录任意 type——与 D-unmapped-300（从 confirmed 散文自动拆条）同构的语义判断下沉纯函数层死路，白名单封闭集是 fail-fast 契约面不是枚举开放世界（后者死路见 D-unmapped-150，那是任务面桶枚举，本集是有限机器契约，同形不同质）；c) implemented 从写入白名单删除而非纳入入选——会破坏「决策已落地」的真实声明语义且知识库输出值本叫 implemented，纳入才闭合。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 新增 | src/decision-values.js | 正典值集单一源（4 冻结常量） |
| 修改 | src/decisions-io.js | 白名单改导入派生，type 扩 8 值 |
| 修改 | src/decision-distill.js | 入选集改派生，状态集 +implemented，头注同步 |
| 修改 | src/stages/brainstorm.js | 两处模板 type/status 清单对齐正典 |
| 修改 | src/stage-templates.js | 四件套 decisions 模板清单插值正典（评审 P2 清偿——第四提示面漏网） |
| 再生成 | docs/prompt/brainstorm.md | _extract 工具链再生成 |
| 新增 | test/decision-caliber-unify.test.mjs | FR-01..FR-05 行为断言 + 零回归锚 |
