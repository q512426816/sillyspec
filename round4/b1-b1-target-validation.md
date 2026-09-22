# B-① 靶点验证报告（2026-09-21，第 1 批执行产物）

> 预设判定规则（optimization-plan.md B-①）：「靶子不实不立项」。
> 数据源：zcode db（C:/Users/qinyi/.zcode/cli/db/db.sqlite）sess_5cb66a7e（R4-L 主会话）及其 19 个子会话；工具 b1-analyze-task08.mjs。

## 判定：靶子不实——「越界读」零发生，B-① 实现项按预案砍掉

### 证据一：8.6M 的构成不是「读了 8.6M 新内容」

task-08 子代理（sess_subagent_agent_d60364e3，58 请求）账面：名义输入 8.57M / 缓存读 8.39M（98%）/ 输出 0.07M / **新鲜输入（名义−缓存）仅 186K**。

全部 62 次工具调用的输出总量 ≈335KB（Read 297KB + Bash 34KB）——与 186K 新鲜输入同量级自洽。8.6M 名义体量 = **58 轮 × 轮均 148K 上下文的累积重发**，是轮数乘上下文的机械积，不是读取行为。

### 证据二：读取内容全部在任务契约链内，无一次越界

62 次调用的读取对象逐条核过：task-08.md 任务卡、CLAUDE.md、turn-timeline.tsx（被适配组件）/ agent-log-card / turn-segment-views / session-log-assembler / runtime-session-helpers（契约链组件）、agent-log-card.test.tsx（测试先例）、session-panel-page（接线单点）、api-types / query-keys / agent-logs / round-divider（类型与工具链）、design.md + prototype-agent-replay.html（变更文档）。**没有一次读声明面之外的源码**，没有 node_modules / daemon / backend 深潜。重复读是「首次全读 + 后续定向切片」模式（如 turn-timeline 62KB 全读 + 16KB 切片），本身是省 token 的正确行为。

### 证据三：全扇出面同构——新鲜内容只占 3.2%

19 个子代理合计：名义输入 41.77M，**新鲜输入 1.34M（3.2%）**，输出 0.49M。各角色轮均上下文 35K–92K，唯 task-08 达 148K（契约链文件大：组件 78KB + 测试先例 37KB + design 15KB + prototype 14KB 全量进上下文）。

## 处置（按预案预设规则）

1. **砍掉第 2 批的「B-① 读清单注入」实现项**。读上界就是 1.34M 新鲜内容，其中「本可不读」的部分即使砍半也只有 ~0.7M 名义，对 42.3M 扇出是零头；allowed_paths 工作目录约束（子代理 prompt 已有）维持现状即够。B-① 前置验证本身完成使命。
2. **真正杠杆换位：轮数 × 上下文双乘数**。42.3M ≈ Σ(轮数 × 轮均上下文)，两个乘数各有对策：
   - **上下文**：B-④ 材料包治这个——task-08 型大契约链任务（design/prototype 通读 + 大组件全量进上下文）正是材料包的靶子，且比原估计更实（148K vs 同侪 45–92K 的差额就是可压空间）。
   - **轮数**：**新增候选 B-⑥ 轮数纪律**（提示词级）——task-08 的 58 轮里 Edit×7（相邻同文件逐个改）+ TodoWrite×4（每条占一轮重发 148K）+ 测试 Bash 循环多次；合并相邻 Edit、TodoWrite 降频、测试合并跑，砍 1/3 轮 ≈ 砍 1/3 名义体量。此项原方案未覆盖，性价比高于已砍的 B-①。
3. **R5 预期路径修正**：扇出 42.3M → 28–32M 的驱动从「①②③④ 并用」改为「**B-④ 上下文压缩 + B-⑥ 轮数纪律**」双轮驱动；账单当量口径下缓存重发本就计 0.1×，硬门（扇出 ≤32M）以名义口径计不受影响。

## 复核方式

`node round4/b1-analyze-task08.mjs` 重跑可复现证据一/二；证据三的聚合查询见本报告数据源行（account.mjs 同库同表 model_usage，input−cache_read 即新鲜口径）。
