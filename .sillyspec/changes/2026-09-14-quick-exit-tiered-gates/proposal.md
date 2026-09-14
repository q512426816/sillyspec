---
author: qinyi
created_at: 2026-09-14 01:28:15
generated_by: sillyspec-fourpiece-init
---
# 提案书（Proposal）

## 动机

对 sillyhub（multi-agent-platform 仓）954 条 quicklog 的三轮统计实证：近期（≥2026-09-01）49.7% 的 quick 改动超过 3 文件、94.8% 完全独立绕过完整流程仪式、37.1% 存在未声明脏文件。quick 车道已成中规模改动的主通道，但出口只有 test/lint 实测一道门——模块跨度、风险区域、文档纪律全部不可见。现行选道规则「≤3 文件走 quick」中文件数是唯一可核验项、成了事实主判据，而交叉表证明它量错维度：跨 2-3 模块×≤3 文件（规则亲手放行的人群）文档同步率仅 24%，单模块×4-6 文件反而 74%，跨 4+ 模块×4-6 文件塌到 16%。

## 关键问题

1. **文件数判据定向放行最差载荷**：改动"看起来小"（≤3 文件）但横跨多模块时纪律最差，恰恰是现行规则发放通行证的人群；而真正的单模块批量修复（纪律良好）反被判为超限。
2. **quick 出口无机械画像**：agent 自选快车道的激励扭曲已被 95% 独立 quick 实证，但收尾时 CLI 对"跨了几 个模块、碰到没有风险区（auth/billing/migration）、测试有没有跟着加"零可见性，选错道的代价没有任何兜底。
3. **语义风险完全不可见**：只改 1 个文件的权限/计费逻辑是最需要被看见的改动，但不产生任何机械信号（跨度=1、文件数=1），现有审计链对其无感。

## 变更范围

三层改造 + 一个出口（scale=large，详见 design.md）：
1. **信号层**：新建 `src/quick-gate-profile.js` 纯函数——changedFiles × module-map × 风险路径模式 → 画像（文件数/模块跨度/命中/级别 L0-L2），阈值单点常量；
2. **门禁层**：quick --done 审计链挂画像，L1（跨≥2 模块或≥4 文件）加每文件注记+测试增量检查，L2（跨≥4 模块或风险命中）加模块文档认领/`--no-docs` 显式豁免+运行时证据要求，全部 advisory 起步；
3. **规则面**：AGENTS.md 第 6 条与 init 模板选道判据改为「有无需落盘的设计决策」，文件数降为出口绊线；
4. **scope-audit 出口**：`scope-audit --change <名> [--json]` 双出口携带画像，支持 quick 会话/归档变更重放，`--json` 批量重放即阈值校准数据源。

## 不在范围内（显式清单）

- 不新增 mid 车道/新状态机/新阶段（自选车道会被激励扭曲绕过）
- 不做配置化 gate 引擎（阈值是代码常量，非用户配置面）
- 不做 blocking 阻断（advisory 起步，升 blocking 另立变更）
- 风险命中 v1 不做 diff 关键词扫描（无 diff 入参/零子进程承诺/冻结重放态无 diff 文本；D-004@v2）
- 风险命中不做人工确认等待态（要求运行时证据，不引入 quick 没有的 wait 机制）
- 不改 verify 侧 detectChangeRisk 判级语义与 quick test/lint 实测门禁本身

## 成功标准（可验证）

- 未 scan/无 module-map 的存量项目：画像 degraded、判级降级档生效、quick --done 行为零变化（advisory 不阻断）
- 已 scan 项目：构造跨 2 模块 4 文件改动 → --done 输出 L1 [gate] 块并落 quicklog auditNotes；构造 auth 路径改动 → L2 风险命中提示；`--no-docs` 豁免留痕可查
- `scope-audit --change <quick会话> --json` 输出含 gateProfile 字段；表格出口含画像段；归档变更重放不回归
- `npm test` 与 `npm run lint` 全绿（新增 quick-gate-profile 矩阵单测 + audit 三态集成 + scope-audit 出口回归）
- AGENTS.md 第 6 条与 templates/agents-instruction.md 同步改写，不再以文件数为选道主判据
- 阈值经 sillyhub 真实 module-map 重放重算校准后定稿（数字回写 THRESHOLDS 与设计记录）
