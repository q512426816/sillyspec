# 全流程 token 成本优化方案（execute 为主）

> 2026-08-22 · 依据：multi-agent-platform 同日两个变更的实测对照
> （2026-08-22-team-session-unify 与 2026-08-22-session-panel-unify）
> 作者：qinyi + ZCode 分析
>
> **状态：P0a / P0b / P1a / P1b / P2a / P2b 已全部落地**（change：
> `.sillyspec/changes/2026-08-22-token-cost-optimization`，测试
> `test/token-cost-optimization.test.mjs`）。真实项目冒烟：team-session-unify
> 14 task 全部解析到 5.8–9.9KB 细卡（原 58KB/38KB 大卡指引）；split-changelog
> dry-run 报出 backend 27.5KB + frontend 28.1KB 待迁出（待用户确认后 --force）。

## 1. 背景：同一天同流程的天然对照实验

| 指标 | team-session-unify | session-panel-unify |
|---|---|---|
| 变更类型 | backend 为主（10/14 task） | 前端为主（8 task） |
| brainstorm | 46 min | 41 min |
| plan | 21 min | 21 min |
| execute | **≈11 h** | **67 min** |
| └ 加载上下文一步 | **3h06min** | 1 min |
| └ 单 Wave 最长 | 2h05min（Wave 2，Redis 死等已另行修复） | 13 min |
| design.md | 28 KB | 17.5 KB |
| 子代理要读的模块卡 | backend.md **58 KB** | frontend.md 38 KB |
| prototype HTML | 50 KB | 10.5 KB |

两变更走完全相同的流程与 gate。差异集中在三点：①模块卡体量与匹配粒度；
②符号影响面/加载上下文的机械工作量（backend 签名级变更多，14 张卡逐个 rg）；
③test 等待（已由 ql-20260822-002/003 的 Redis 探测 + `-n auto` 修复，本方案不再涉及）。

结论：流程本身不慢，**慢和贵在静态上下文的重复读取与机械工作的 agent 手工执行**。

## 2. 浪费点清单（实测数据）

### W1 模块卡粒度错位 + 单调膨胀（最大项）

- 根层 `docs/<project>/modules/_module-map.yaml` 把 `backend/**` 整体映射到
  `modules/backend.md`（58 KB）；execute「加载上下文」步与 Wave 子代理按此指引读整卡。
- **细粒度卡已存在但流程不消费**：`docs/backend/modules/agent.md` 仅 5.9 KB
  （本类变更大部分 task 就在 agent 模块），子项目级 `_module-map.yaml` 由 scan 生成，
  execute 全链路无人读它。
- backend.md 分段实测：变更索引 19.9 KB（36%）+ 关键逻辑 8 KB + 人工备注 5.8 KB
  ≈ 历史累积 33 KB；子代理真正需要的「定位+契约摘要+注意事项」仅 ≈7 KB（**13%**）。
- 增长曲线：15 KB（08-04）→ 55 KB（08-22），18 天 3.6 倍，每变更收尾追加 →
  **每个变更都在给下一个变更加税**（knowledge/uncategorized.md 38 KB 同病，从未迁出）。
- 量化：backend 类变更 ~10 个子代理 × 58 KB ≈ 单卡一项 **20 万+ tokens 输入/全流程**。

### W2 design.md 全文重复读

- 28 KB × 14 子代理 + 主代理多次（加载上下文 / 每 Wave「读非目标与兼容策略」/
  acceptance 对照检查）。Wave 前置实际只需要两节（约 1-2 KB），无分节机制只能整读。

### W3 审查层材料重复消费

- 同一份 design + diff 被消费 3-4 遍：task review（14 次，健康）→ acceptance
  「对照设计检查」写 design-check.md（全量重读）→ ~20 min 后 execute stage review
  又全量对照（`plan_level: full` → independent tier 独立 QA 再读一轮）→ verify 待跑。
- acceptance 步产出的 design-check.md 与 stage review 的 checklist 高度同构，写了两遍。
- 佐证：team-session-unify 的 execute stage review 在 21 秒内跑了两次 run（gate 重试噪音）。

### W4 加载上下文步的机械工作 agent 手工做

- 3h06min 主要耗在：主代理整读模块大卡 + 逐张读 14 张 task 卡 + 手跑 rg 调用点搜索
  填 symbol-impact.md。文件×模块归属、符号×调用点搜索都是纯机械活，
  与 module-impact.js 已 CLI 化的先例同性质。

### W5 产物同构（output token，价格 ≈5× input）

- tasks.md 注册表 + 14 张卡 + plan.md Wave 引用三处同构（任务真相契约已立，**不动**）；
- prototype HTML 无预算约束（本次 50 KB，仅 2 个 UI task 消费）。

## 3. 方案

> 工程风格沿用仓内先例（module-impact.js / symbol-impact 骨架）：
> **机械部分 CLI 化、判定留给 agent、产物 gate 硬校验、关闭时零回归。**

### P0 模块卡两级匹配 + 大卡瘦身（预计砍掉最大头）

**P0a 细粒度优先的模块解析（execute 消费侧）**

- 新增 `sillyspec modules resolve --change <name>`：复用 module-impact.js 的
  paths 前缀匹配，但**级联两层**——先扫各子项目 `docs/<子项目>/modules/_module-map.yaml`
  （最长前缀优先），未命中回退根层 map；输出 per-task「卡路径 + 命中模块」表。
- execute.js 改造：
  - 「加载上下文」步 prompt（fixedPrefix）注入该表（`{MODULE_RESOLVE_TABLE}` 占位符），
    替代「读根层 map 自己匹配」的指引；
  - buildWavePrompt 子代理 prompt 要点第 4 条同步改为按表引用细卡。
- 零回归：无子项目 map 时输出回退根层结果，prompt 文案不变。

**P0b 变更索引迁出大卡（生成/追加侧）**

- 追加目标改 sidecar：scan / archive / docs-debt 收尾的「变更索引」「关键逻辑追加条目」
  写入 `modules/<module>.changelog.md`，根卡只留 定位/契约摘要/注意事项/关键逻辑(当前态)。
- 一次性迁移命令 `sillyspec modules split-changelog [--all]`：把既有「变更索引」段
  整体搬到 sidecar，根卡删除该段。
- 软上限：模块卡 >12 KB 时 doctor 告警 + archive 收尾提示滚动归档。

验收：下一个 backend 变更，子代理引用的模块卡 ≤ 细粒度卡（或瘦身后的根卡）；
`modules resolve` 对本仓两处 map 的命中表人工核对；doctor 对 backend.md 现状告警。

### P1 design.md 分节注入

- buildWavePrompt 时由 CLI 按 `^## ` 切节，提取「非目标」「兼容策略」两节文本
  直接注入 Wave prompt（+1~2 KB），「Wave 开始前」指令改为「两节已附上方，勿重读全文」。
- 子代理侧维持按需读（task 卡已带 § 锚点），CLI 顺带把 design.md 各节行号范围
  附在卡引用后，支持 agent 用 offset/limit 精准读。
- brainstorm 生成侧把两节标题锚定不变（模板已稳定，加 postcheck 软校验）。

验收：Wave prompt 含两节全文；对照变更的子代理会话中 design.md 整读次数显著下降。

### P1 acceptance「对照设计检查」× stage review 合并

- acceptance 步直接产出 stage review 的 review.json：design-check 表格逐行即
  `checklist` 数组，design-check.md 保留为落盘附件（入 `reviewedFiles`）。
- stage review（tier=independent）职责收窄为既有的「三项必查 + 双 pass task 抽查」，
  明确删除「逐项对照 design」（acceptance 已做，不重做）。
- 涉及：execute.js acceptanceSteps[0]、stage-review.js prompt、run/gates.js 校验顺序。

验收：execute 全程只产出一份逐项对照材料；stage review 的 QA 子代理不再整读 design 全文。

### P2 symbol-impact 证据预跑 + 加载上下文缓存

- `sillyspec symbol-impact` 升级：骨架之外，对每 task allowed_paths 源文件
  用 ripgrep 预扫符号（provides 字段符号 + 文件主名派生符号），命中行以注释注入骨架；
  agent 只做「在/不在范围内」判定，不再手工跑搜索。
- 缓存：symbol-impact.md frontmatter 记录 tasks.md 内容 hash；重开/中断续跑时
  hash 未变则 gate 放行提示「沿用」，不重做整步。

验收：同规模 backend 变更加载上下文 3h → 目标 <30 min。

### P2 knowledge 增长治理

- archive 收尾把 `[已确认]` / `[🟢 已修复]` 条目迁入专题文件后**从 uncategorized.md 删除**
  （现状只标不迁，38 KB 只增不减）。
- doctor 加 uncategorized.md >20 KB 告警。

### P3（可选）prototype HTML 预算

- >30 KB 时 brainstorm 收尾提示精简（只留布局/交互骨架，样式细节靠 design 文字）。

## 4. 明确不做

- 不砍审查层：task review、三项必查（跨 task 交界 / design 整体 / 组装行为）全保留——
  合并的是**同一材料的重复读取**，不是质量门。
- 不动 tasks.md / task 卡 / plan.md 三处结构（2026-08-20 任务真相契约刚立）。
- 不动测试策略（Redis 探测 + `-n auto` 已解，ql-20260822-002/003）。
- 不动 SillyHub 派发（本次实测未启用：probe 缓存在 run execute 进程内恒冷 →
  local-fallback；若未来启用路径 A，其 worker 冷启动读蓝图与本方案同构受益）。

## 5. 预期收益（以 team-session-unify 规模变更计）

| 项 | 现状 | 优化后 |
|---|---|---|
| 子代理模块卡（backend task） | 58 KB/个 × ~10 | ≤ 细卡 ~6 KB × ~10 |
| Wave 前置 design 读取 | 28 KB × 8 Wave + 子代理 | 两节 ~2 KB 注入 + 锚点按需读 |
| 逐项对照材料 | 2 份（design-check + stage review） | 1 份两用 |
| 加载上下文 | 3h06min | <30 min（证据预跑 + 缓存） |
| 全流程 input 估算 | 基线 | **-40% ~ -60%** |
