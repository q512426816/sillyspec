# R7 终验发枪清单（大任务重放一次，替代 R6+R7 两次）

> 变更：2026-09-22-r7-protocol-surgery。裁定链：flip-3.31.0-proposal §十一（R6 取消，
> "做完再测"修正为"边做边自举"+全部落地后一次重放）；不达标用四列遥测+机制行为计数定位
> 哪层没兑现，不回滚重测。

## 一、发枪前置条件（全部满足才发）

- [x] 四切片落地：watcher（观测解耦）/ flow 2-调用协议（thin 缺省+legacy 一行回滚）/
      全件机器起草（指纹三件套泛化+三态拒收+amend 留痕）/ 编辑距离路由（advisory+失败升厚）
- [x] 协议四钉 harness 验证：必需交互=2（flow-protocol ①）；工件回填轮=0（flow-draft ⑥
      薄跑道写入面=仅例外裁决）；观测解耦（watcher.test harness 钉）；写入仅例外裁决（同上）
- [x] 全量测试+lint 绿（worktree 内 12 项环境性失败经 stash A/B 证实零增量——worktree
      守卫既有坑，主仓复跑预期绿）
- [ ] 版本号重打包：本地实验构建重打包换版本号（3.31.0 候选），r6-session-replay 工作树内
      `npm install -g <新 tgz>` 或 worktree 侧 bin 指向新构建

## 二、重放配置（复用资产，同基线同防作弊）

- 工作树：`.sillyspec/.runtime/worktrees/2026-09-22-r6-session-replay`（沿用；git 状态
  reset 到原基线 53c67e02a 等价态）
- Prompt：`round5/prompt-R6-L.md` 原文复用（仅版本号一处替换）
- 桶级对比脚本：`round5/forensic-buckets.mjs`（已入档可复现）+ 新增 flow 遥测面
  `.sillyspec/.runtime/flow-telemetry.jsonl`（protocolCalls/draftAmendments/editRatio/routeHint
  四列）与 watcher 事件流 `.runtime/watcher-events-*.jsonl`
- 环境口径：同 R5-L（同机同模型同日窗口；并行会话活动避让）

## 三、判据（三层判读，擦边必须归因）

| 门 | 达标 | 拉伸 |
|---|---|---|
| 三桶 Δ（CLI 往返+工件维护+门禁重跑 vs OpenSpec 基线 51.9M） | ≤20M | — |
| 账单当量 @3× | ≤1.3× | ≤1.2× |
| 墙钟 | ~90min | 进 120min 记拉伸 |

- 三桶 Δ 打不穿 → 用 flow-telemetry + watcher 事件 + 机制行为计数逐层归因：
  ① 协议层：CLI 调用轮数（应≈2+自愿调用）；② 工件层：.sillyspec 写入面审计（应仅 AGENT
  槽+amend）；③ 门禁层：RERUN 拒绝数/账本复用命中数；④ 读层：材料路径清单命中（缓存读占比）。
- 机制行为计数预期：flow start 1 / flow done 1 / task done 使用数（--with-tasks 时）/
  amend-draft 使用数 / editRatio 分布 / route_hint 触发数 / 失败升厚触发数。

## 四、已知边界（判读带看）

- 薄跑误判兜底=失败自动升厚+born_face 防死锁（dogfood 首样本见 flow-route.test ④）
- watcher 粒度产物级非步骤级（消费方核实够用）；平台 events 端点未升级时本地 jsonl 为准
- worktree 守卫环境性测试失败（12 项）与主仓行为无关——重放不在 worktree 内跑 CLI，不受影响

## 五、发枪后动作

1. 重放全程零干预（agent 按 prompt-R6-L 自治）
2. 结束即收数：forensic-buckets 出三桶 Δ+当量；flow-telemetry/watcher 事件导出
3. 判分按上表；达标→3.31.0 发版准备；不达标→逐层归因清单进下一批 quick（不回滚重测）
