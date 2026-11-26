---
author: flow-machine-draft
created_at: 2026-11-14T16:34:36.996Z
---
# 设计记录（Design Record）— 2026-11-15-change-key-visibility

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

用户痛点：头脑风暴与轻量变更创建变更后 agent 直接干活，用户不知道创建的变更 key 与名称。CLI 输出里 key/标题虽已存在（flow start 横幅 `🏃`/`🏷️` 行、prompt 渲染头 `change:` 行），但零「必须转述给用户」指令——agent 无转述义务感。

方案：新增单一来源纯函数 `renderChangeIdentityLine(change, title)`（`src/change-identity.js`），把「完整 key + 名称 + 必须原样转述指令」渲染为一行可照抄的指令文案；在四个变更创建/收编时点接线输出：① `src/flow.js` flow start 新建路径横幅（`🏃` 行后）；② `src/flow.js` adopt 收编路径（`🏷️ 变更标题` 行后，best-effort 同 try 块）；③ `src/run/command.js` `run <stage> --change` 净新建 initChange 后（brainstorm 显式入口主受益面）；④ `src/run/command.js` brainstorm 零活跃自动创建（`🔄 自动创建变更` 行后）。选 console 输出层而非改阶段 prompt：agent 对 CLI stdout 与 prompt 同样可见，console 层零「提示词文档同步」负担（改 `src/stages/*.js` 须重跑 `docs/prompt/_extract.mjs` 并同步 md 镜像），改动面最小。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- 新增导出：`src/change-identity.js` → `renderChangeIdentityLine(change: string, title?: string): string`（title 缺省兜底 change；纯函数无 I/O）。
- CLI stdout 变化：上述四个入口各新增一行 `📣 变更身份（必须原样转述给用户——用户需知道本次创建的变更名）：key：<key>｜名称：<名称>`。
- 无命令签名、文件格式、数据库 schema、阶段步骤变化；不改任何既有输出行（仅追加）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

   成立。身份行是创建时点一次性输出，不依赖事件顺序；resume/重入不重复输出新建身份行（仅首次 start 渲染新建横幅，resume 走恢复简报不含该行——恢复场景变更名用户此前已见过，不在本次需求面）。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

   renderChangeIdentityLine 是纯函数；title 在各接线点取自本地已解析变量（changeTitle/adoptTitle/initChange 入参），不引入新的共享状态，无并发新增面。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

   安全。adopt 路径身份行在标题推导 try 块内——推导抛错时该行随块静默跳过（best-effort），横幅 `🧲` 行仍含 key，不产生半态输出；command.js 净新建输出在 initChange 成功之后，失败路径不输出。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

   不会。四个接线点均以本次命令的 change 变量为源，无跨工作区/跨仓读；纯仓内输出，不写任何持久化状态。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：指令行被 agent 当作信息性输出忽略（无机器门强制转述）。本变更只做指令面强化——「agent 是否真转述」属行为面，无低成本机器校验点（用户可见面在 agent 回复里，CLI 测不到）；文案用「必须原样转述」强指令词 + 可照抄格式最大化遵从率。

试过放弃的方案：改 `src/stages/brainstorm.js` step prompt 注入转述指令——放弃理由：触发提示词文档同步链（`_extract.mjs` 重提取 + `docs/prompt/brainstorm.md` 逐字同步），且 prompt 模板拿不到运行期 title（deriveShortChangeTitle 结果），须新增占位符走注入管线，改动面数倍于 console 层而收益相同。

## 文件变更清单

| 操作 | 路径 | 说明 |
|------|------|------|
| 新增 | src/change-identity.js | 变更身份行单一来源纯函数 |
| 修改 | src/flow.js | 新建横幅 + adopt 收编两处接线输出 |
| 修改 | src/run/command.js | 净新建 + brainstorm 自动创建两处接线输出 |
| 新增 | test/change-identity-line.test.mjs | 四入口身份行断言（FR-01~04 绑定） |
