---
author: zcode-r7-surgery
created_at: 2026-09-22 10:44:00
---
# 决策记录（Decisions）

## D-001@v1: 观测挂状态不挂对话；轮询弃 fs.watch
- **背景**：用户指出协议对话与平台心跳共线（信道混淆）；proposal §三底座。
- **决策**：watcher 独立进程观测产物签名（文件/git/工件三源），事件恒带 provisional:true，
  平台只展示不判定，--done 唯一真相；本地 jsonl 是事件唯一真相源（形态循 knowledge-hits.
  jsonl 四类事件流先例，append-only+verify 读回），平台推送走专用 events 端点——**实现模式
  复用 agent-session-log.js 上报先例**（POST /api/agent-logs 同风格：专用端点+readPushConfig
  +5s 超时+best-effort+env 开关；不碰 progress base_ts 单写者纪律），平台未升级该端点时
  fail-soft 降级本地-only。观测机制用轮询快照 diff（3s），弃 fs.watch（Windows/网络盘
  跨平台不可靠+递归噪声）。
- **被否方案**：挂协议对话推事件（信道混淆）；搭 progress POST 顺风车（409 单写者互撞+
  thin 下事件塌缩为 2 点违反解耦钉）；并入 agent-logs 通道（语义不同：会话日志路径≠流程
  事件，且该链路语义红线不动）；fs.watch（平台差异）。
- **覆盖**：FR-01, FR-02。

## D-002@v1: 协议折叠为 2 调用；legacy 开关并存缺省 thin
- **背景**：法证桶①：106 次 CLI 往返 +29.1M；flip-3.31.0-proposal 刀2。
- **决策**：新命令族 flow（start/done/amend-draft）；flow start 一次下发薄流程说明+材料
  **路径**清单（稳定前缀=缓存最优）；flow done 唯一裁决点六子步。`flow: thin|legacy`
  缺省 thin，回滚一行 yaml；thin 只影响新 change；thin change 上跑 run <stage>=回 legacy
  记账（不叠加）。**显式档入口（用户裁定）**：`flow start --thick`（起始即厚）与
  `--with-tasks`（薄协议+任务卡）——人/输入侧声明；**不做输入覆盖度自动判档**（决策密度
  轴启发式=⑤ 的尸体）。高决策任务赔付链=失败升厚+混跑回 legacy+显式 --thick 三道。
- **被否方案**：37 步逐步折叠（法证方案 2 已被 §十 ④ 降级——ROI 差，15% 实证）；agent
  配额规则（P8 类别错误：说了不算）；start 时启发式判 thick/thin（用户裁定否——误判又一层
  仪式税，与决策密度轴同构）。
- **覆盖**：FR-03, FR-04, FR-06。

## D-003@v1: flow done 幂等原子循 task-done 先例；测试门清单=git diff 对基线
- **背景**：护栏#3 原子性要求；grill 发现 runQuickTestLintGate 空清单会 skip。
- **决策**：六子步各带完成标记（幂等跳过/中断半态重入断点续/中段失败精确报告）；
  changedFiles 来源=git diff 对 flow-state 记录的 baseline_commit；实测后 recordTestLedger
  落账（防 RERUN 闸指纹不等重跑）。判定语义零改动（fail-closed 红线）。**三句钉死（用户
  裁定）**：①实测失败=整单 FAIL exit≠0（测挂不继续 distill/归档）；②实测超时=失败（无
  部分成功当绿）；③半态可重入不可假绿（归档子步未完成前 change 仍 active 禁止当成功，
  重入不新开 change）。
- **覆盖**：FR-05。

## D-004@v1: 机器起草全件面+指纹泛化；守卫全在验收侧
- **背景**：法证桶②：工件维护 +28.9M，verify-result 读写 14 次；护栏#2 机制不走劝说。
- **决策**：verify-draft 三件套（sha256 标记对+sidecar+amend）泛化为 src/machine-draft.js，
  verify-draft 消费方化零回归；四件起草器（proposal 转写/requirements 摘条/tasks 推导/
  decisions 只记真实新增）；直写模式零任务卡。守卫=flow done 三态拒收（标记缺失/哈希失配/
  手工重锚未审计），AGENT 槽放行，零 prompt 劝说。归档机械面重划：buildArchiveReadiness
  Report+auditModuleImpactAgainstDiff+distillIntoKnowledge+unregisterChange 可复用；模块
  文档同步薄跑跳过、升厚走 legacy archive；distill 异态→升厚；plan.md 硬校验对薄工件面
  跳过（flow-state 判据）。**任务卡分岔（用户裁定）**：默认 thin+直写=零任务卡（薄跑=
  quick 的协议兄弟）；--thick / --with-tasks =生成任务卡；禁止大任务默认零卡自称 thin
  全流程（空壳治理）。
- **被否方案**：prompt 明示禁 heredoc/劝说不改写（P8；三次收敛教训）。
- **覆盖**：FR-07, FR-08。

## D-005@v1: editRatio 与守卫汇合于 amend 通道；失败自动升厚
- **背景**：grill 抓到三态拒收与改写比例互斥（被拒改写到不了计算，合法路径恒 0）且
  既有 sidecar 只存哈希不存原文（amend 后基准即丢）。
- **决策**：draft-ledger 每机器段存首版原文（永不覆盖）；机器段直接改写仍拒收；要改只有
  flow amend-draft 留痕通道，editRatio 在 amend 时对首版原文计算；>阈值（缺省 0.5 可配）
  → **advisory 定案（用户裁定：测绿可薄档过）**——自动升厚误伤「填对了需求表述」的任务；
  提示升级为可观测硬信号：flow done 醒目打印 route_hint+editRatio、遥测四列记一笔、
  `flow.edit_ratio_enforcement: advisory|block` 缺省 advisory（可按遥测数据翻 block）。
  失败触发升级：verify 失败/审查否决/distill 异态→tier:thick+upgrade_reason，剩余流程
  厚档，不依赖 agent 主动 --full（护栏#4）。AGENT 槽不计入。
- **被否方案**：哈希失配降级为路由信号不拒收（弱化切片三守卫，违反护栏#2）；
  editRatio 超阈自动升厚/阻断 done（用户裁定否——本变更买协议变瘦不是「改了稿就审一遍」，
  真危险是测挂装过=已由失败升厚管住）。
- **覆盖**：FR-09, FR-10。

## D-006@v1: plan 细拆诱导缺陷（协议成本×任务卡数挂钩）——本次收口+提示词修正+R7 根治
- **背景**：本变更 plan 阶段自我实证——初版 18 卡/10 Wave 给反仪式变更预付协议税。
  归因（用户裁定）：同 Wave 文件不相交（硬约束，防并行互盖，**正确不动**）被误读为
  「测试/接线/module-map 录入须另立任务」；叠加 plan 提示词软诱导（「粒度均匀」人格设定、
  「实现/接线/验收」分层 Wave 模板、「module-map+全绿」当交付物）——细拆有奖、粗拆无引导，
  每卡 start→review→done→commit 仪式随任务数线性收税。可验收边界（该细）与协议记账单位
  （不该跟任务数绑死）被绑成同一物。
- **决策**：①本变更计划收口（18→6 卡，终验发枪归 verify 不占 execute 卡）；②task-07
  修 plan 侧提示词：默认「实现+单测同卡」、禁纯接线/纯 module-map/纯全绿独立成卡、
  验收钉写进实现卡 acceptance；③根治在切片二（协议必需交互=2，flow thin 下测试/录入
  CLI 机器做，协议记账单位与任务卡数解耦）。
- **被否方案**：维持细拆有奖现状（税反复收——每个架构变更都会再拆一串验收 Wave）；
  改掉「同 Wave 文件不相交」约束本身（防并行互盖语义正确，缺陷不在它）。
- **覆盖**：FR-11。

## D-007@v1: 协议记账单位上移到 change 级（GSD Phase 对齐）；SillySpec 硬门全留（用户裁定）
- **背景**：GSD 对照裁定——「别让工具对话变成主业」GSD 更合理（协议挂 Phase 不挂每个
  task；PLAN=可执行提示非治理表；编排瘦只传路径；状态在文件单写；文件冲突运行时处理）；
  「别让 agent 嘴炮过门」SillySpec 更合理（P2 账本/ownership/allowed_paths/fail-closed
  测试门是真溢价，openspec/GSD 不替代）。
- **决策**：flow start/done 的协议厚度=一次 change ≈ 一次 GSD Phase——**协议记账单位与
  任务卡数量解耦**；tasks/任务卡（--with-tasks 时）只是干活单位，非协议检查点（task done
  自愿用、不计必需交互）；中间 PLAN 段=可执行提示非治理表。学 GSD 四件+留自研四件+
  扔步进税两件，不做二选一。验收判据：若 flow 落地后仍是「18 张卡换名叫 flow」=只学了皮
  （失败）；协议必需交互=2 钉死不变。
- **被否方案**：照搬 GSD 全家桶（spawn 执行者几乎总开——R5-L 已证乱扇出/杀扇出都可能
  负优化，小活 main 直写更好；弱多会话/弱 fail-closed 不接受）；伪装成 GSD 技能树形态
  （SillySpec 是真 CLI 状态机，改协议形状比换形态合适）。
- **覆盖**：FR-03, FR-04, FR-07。
