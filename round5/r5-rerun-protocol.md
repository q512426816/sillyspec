# R5 对撞重跑协议（2026-09-21 v3.30.0 发版随附）

首次对撞（2026-09-21 上午）：B 组（sillyspec 3.29.5）写码前 70′/门禁多轮/token 2×/三卡点全踩，败因归因见 [r5-collision-ehs-attribution.md](./r5-collision-ehs-attribution.md)（P1-P16）。本卡=重跑的发枪清单。

## 一、实验机预检（E:\PZwangge\compare-rp 所在机器）

1. **装新版**：`npm install -g C:\路径\sillyspec-3.30.0.tgz`（tarball 在 sillyspec 主仓根；或 git pull 后 `npm pack`）→ `sillyspec --version` 必须报 **3.30.0**
2. **环境变量（B 组会话全程）**：
   - `SILLYSPEC_SESSION_ID=zcode-r5rerun-b`（会话身份，wave 账本依赖）
   - `SILLYSPEC_STEP_GUIDE=1`（M1 指纹增量 opt-in——**本跑的测量项之一**，不开等于白测一项）
3. **对照组不变**：A 组（openspec）提示词/环境与首跑逐字一致（公平性）；仅 B 组升级
4. 三仓 worktree 重建到干净基线（首跑分支已污染：`exp-sillyspec-rp` 上有半成品，重跑前 `git checkout 基线 && git clean`，或新开 `exp-sillyspec-rp2`）；**dev 库预检**：清掉首跑残留（ehs_rp_* 表/dict/pollute_rp_* 若在——A 组清了 [COVTEST]，B 组表可能残留）
5. 任务书=首跑原文逐字（同一需求文件），「继续跑剩余的呀」唤醒语同款

## 二、四道硬门（验收判定）

| # | 指标 | 首跑值 | 硬门 | 依据修复 |
|---|---|---|---|---|
| 1 | 复跑→首行业务代码 | 70′ | **≤35′** | M3 分组+材料包+①handoff（写码前路径主刀在第 3 批，35′ 是本批合理预期） |
| 2 | 门禁打回轮次 | 多轮 | **≤2** | F2/F3 假阳性放行+batch1 fail-fast 既有 |
| 3 | token 比（B/A） | ≈2.0× | **≤1.7×** | M1 指纹（注入基数）+①handoff（上下文分段）+C-1 返回契约 |
| 4 | 三卡点零复现 | 全踩 | **0** | 锚点漂移（F1）/假阳性三连（F2/F3）/读 CLI 源码考古（F2/F3 文案） |

拉伸（不计失败）：写码前 ≤20′ / 比 ≤1.4× / verify 一次过。

## 三、测量口径（发回两份会话导出后本机分析）

- 复用 round5/ 既有分析器：`cmp.mjs`（文件产出分布）/`cmp2.mjs`（runs/CLI/commit）/`gate-audit.mjs`（门禁注入体积——M1 生效度直接读这个：首跑 252KB/73 次，重跑应显著降）
- 写码前时刻：`grep -m1 首个业务代码 Write` 的时间戳 vs 恢复时刻
- 蝴蝶图：重跑 `node round5/gen-collision-html.mjs <A.json> <B.json>` 自动出对比页
- 特别记录：①Wave 边界 handoff 提示出现次数与 agent 是否照做（新机制行为数据）②task start 受影响测试族注入是否被消费 ③M1 复入短输出实例数 ④`SILLYSPEC_VERIFY_GATE_SNAPSHOT_OFF` 类逃生阀使用次数

## 四、判读规则

- 四硬门全过 → 第 3 批按既定路线（阻塞回收/决策密度轴/状态机软化）立项
- 1/3 过 → 过的项销账，未过项回滚到归因文档更新根因，重排批次
- 门 4 失败（卡点复现）→ 优先修 bug 不谈优化
- **A 组无修复无改动**——若 A 组成绩大幅波动（±20%），先查环境变量（dev 库状态/网络）再下结论，保护对照有效性

## 五、发枪

实验机就绪后：同一时刻双开两个 agent 会话（A 组 openspec 提示词首跑原文 / B 组 sillyspec 提示词首跑原文+上述 env），跑满或 daemon 截断，导出两份会话 zip 发回本机按第三节分析。
