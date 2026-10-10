---
author: flow-machine-draft
created_at: 2026-10-10T00:59:29.412Z
---
# 设计记录（Design Record）— 2026-10-10-quick-refs-purge

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

quick 通道 CLI 侧已退役（v3.30.0，src/index.js:223 拒新会话），但指引面残留三类东西：①教学式引用（.claude/CLAUDE.md 规则 4/6/7/8、brainstorm skill small 分叉、auto skill 分类提示仍指 run quick）；②退役墓碑注记（根 SKILL.md/README.md/CLAUDE.md 的「已退役/仅存量收尾」括注——用户明确要求连注记一并去掉）；③实体残留（.claude/skills/sillyspec-quick/ 目录、assets/command-cards/run-quick.md 墓碑卡）。方案：指引面统一改指 flow start/done（CLI 的 auto 分类提示与 flow skill 已是此口径，src/run/command.js:2061-2069 为准）；实体删除并同步 src/command-cards.js 的 COMMAND_CARD_NAMES 枚举（防 init 报资产缺失警告）与两个镜像测试。明确边界：src 存量收尾机制本体（src/stages/quick.js、run/command.js quick 分支、index.js 帮助行）与 docs/prompt/quick.md 机械镜像不动——那是 CLI 机制与代码镜像，非指引面（删镜像须先删 src 阶段，超出本变更）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

代码面仅一处：src/command-cards.js `COMMAND_CARD_NAMES` 移除 'run-quick'（数组元素删除，导出签名不变）——init/命令卡注入不再安装 run-quick 卡到目标项目（zcode/claude 落点 8 卡→7 卡）。行为变化：新 init 的项目不再有 /sillyspec:quick 命令卡；存量项目已装卡不回收（与 skill 目录同边界，init 无卸载通道——既有行为，非本变更引入）。文档面：根 SKILL.md/README.md/CLAUDE.md/.claude/CLAUDE.md/brainstorm/auto skill 的 quick 引用清零。测试面：test/command-cards.test.mjs 计数 8→7 系列同步；test/input-teach-copyable.test.mjs 夹具清单去 run-quick.md 卡。

### 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | SKILL.md | 删 /sillyspec:quick 行、run quick CLI 行、特性枚举中 quick 两处 |
| 修改 | README.md | 小改动指引改 /sillyspec:flow、表格行替换、stage 枚举去 quick、特性行去 quick |
| 修改 | CLAUDE.md | 规则 4/8 去退役注记括注 |
| 修改 | .claude/CLAUDE.md | 规则 4/6/7/8/15 quick→flow、去 quick 子句 |
| 修改 | .claude/skills/sillyspec-brainstorm/SKILL.md | small 分叉（图+条目）run quick --linked-changes → flow start 收编 |
| 修改 | .claude/skills/sillyspec-auto/SKILL.md | 分类提示 run quick → flow start |
| 删除 | .claude/skills/sillyspec-quick/SKILL.md | quick skill 整目录退役清除 |
| 删除 | assets/command-cards/run-quick.md | quick 命令卡（墓碑卡一并去） |
| 修改 | src/command-cards.js | COMMAND_CARD_NAMES 移除 'run-quick' |
| 修改 | test/command-cards.test.mjs | 计数 8→7 系列、删墓碑断言、载体换 run-plan.md |
| 修改 | test/input-teach-copyable.test.mjs | 夹具清单去 run-quick.md 卡、注释三处→两处 |

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

不适用：静态文档 + 一行枚举数组，无事件序。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

并行会话的 sillyspec-explore 改动不属本变更（--accept-dirty-gap 同款处置留痕）；本变更文件面显式 pathspec 提交；test/command-cards.test.mjs 若被他侧同时改，git 冲突面暴露。command-cards.js 为 CLI 源码，改动会被 import 依赖测试（command-cards/input-teach）实测覆盖。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

文档与枚举改动无中间态；flow done 幂等断点续；卡片删除后 init 重跑不再注入该卡（锚行三态幂等按在场文件判断，缺卡零副作用）。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

skill/卡片分发按项目目录隔离；本仓库 .claude/skills 是分发源，删 sillyspec-quick 后新 init 项目不再获得该 skill，存量项目副本不回收（与 quick 退役现状一致）。scan skill 的 --quick 档位与 commit skill 的 QUICKLOG 条目规则是不同特性（扫描深度/日志面），不动。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：测试计数漏改（command-cards.test.mjs 中 8/16/7 等硬编码计数分散在 5 处）——对策：逐处核对并在收口实测跑该文件。放弃方案：①连 src 存量收尾机制一并删除（src/stages/quick.js + run/command.js quick 分支 + doctor/quick-sessions 运行时清理）——升级前在途会话将失去 --done/--cancel 收尾通道，且牵动 docs/prompt 镜像再生成，属 CLI 功能级变更，超出「指引面清除」的用户诉求边界；②保留墓碑卡/注记做存量会话指路——用户明确否决（「仅存量收尾注记也不要，直接去掉」）。
