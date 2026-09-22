---
author: qinyi
created_at: 2026-09-23 10:05:00
---
# 需求规范（Requirements）— 2026-09-23-sentinel-rules

## 角色
- **watcher 子进程**（本变更改造对象）：detached 观测旁路，新增哨兵规则引擎。
- **平台面板**：events 端点消费方，只展示不判定（§九.5，本变更加固而非改变）。
- **--done 收口侧**（下批）：sentinel-assertions 的未来调用方。
- **人类**：warning 的最终裁量人（advisory 恒人判）。

## 功能需求

### FR-01: 哨兵规则引擎（四规则，恒 advisory）
src/watcher.js 内加 `applySentinelRules({prev, next, baseEvents, state, now})` 纯函数
规则引擎：输入相邻两拍快照 + 本拍基础事件 + 引擎状态，输出 warning 事件数组与 新状态。
四规则全部**机械事实**判定（见 FR-02~05），输出恒 advisory（severity=warning），唯一
L0 例外见 FR-07（且本批不接线）。

### FR-02: 假勾选规则（fake-check）
tasks.md（含任务卡 tasks/*.md）checkbox 翻格事件（checked 增加）时，取本拍新翻格的
task-NN 集合；每个 task-NN 的完成证据 = 区间新提交（git log subject 含该 task-NN）
**或** review.json 变更（.runtime/execute-runs/*/tasks/<task-NN>/review.json mtime
变化）。翻格且零证据 → warning。无 task id 的翻格行不入判集（不可归因不告警）。

### FR-03: 改测试凑绿规则（test-tamper）
序列检测：P2 测试账本（verify-quality-scan-<change>.json）记 FAIL（testResult.status=
failed）→ 窗口内测试文件被改（工作树脏文件 ∩ test/** 或触及 test/** 的新提交）→
账本再记 PASS（status=passed）→ warning。测试本身写错是合法场景，人判，不阻断；
FAIL→PASS 之间无测试文件改动则不告警（负例）。

### FR-04: 范围漂移规则（scope-drift）
变更面 = 任务卡 allowed_paths（tasks/task-*.md frontmatter）∪ design.md 文件变更清单，
glob 容差匹配（复用 change-list.js normalizePath/globMatch 口径）。工作树代码脏面
（git status --porcelain，剔除 .sillyspec/、docs/、*.md——同 quality-scan 指纹口径）
中存在声明面之外的文件 → warning（新漂移文件才发，已告警集合去重）。声明面不存在
（无任务卡且无 design 清单）→ 跳过该规则（fail-open，advisory 不无事生非）。

### FR-05: 停滞规则（stall，分相位阈值）
相位锁存：early（tasks.md 未出现或从未有 task-done/其后提交）→ execute（首次
task-done 事件或 tasks.md 在场后的首个提交，锁存不回退）。阈值：early 期 20 分钟无
事件 → warning；execute 期 15 分钟无提交无事件 → warning。同一停滞 episode 只发一次
（活动恢复后才允许下一发）——区分"在想"（有活动）与"死了"（无活动），不刷屏。

### FR-06: 事件模型扩展（advisory 面与真相库隔离）
warning 事件追加进既有 watcher-events-<change>.jsonl：`{ts, kind:'warning', rule,
severity:'warning', detail, provisional:true}`；继续走既有 pushEventsToPlatform
（POST events 端点，best-effort）。**不写 progress db**（真相库只归协议调用——单写者
纪律，watcher 只读产物签名与 git 面）。

### FR-07: L0 纯函数（detectFakeCheckCompletion，本批不接线）
新文件 src/sentinel-assertions.js 导出
`detectFakeCheckCompletion({changeDir, tasksMd, commits})`，三态返回：
`complete`（全部 id 行勾选且每条有证据：commit subject 含 task-NN 或对应 review.json
在场）/ `fake`（全部勾选但有 task-NN 零证据，附 missing 清单）/ `none`（未全勾或无
id 行——无完成主张不判）。无 task id 的勾选行不入判集（不可验证不拒收）。本批只交付
函数+单测，--done 收口调用点留下批。

### FR-08: 水位回补（幂等，修面板连续性）
watcher 每轮落盘水位快照 watcher-last-snapshot-<change>.json；重启时读取为 prev、
与首拍 diff 补发事件（带 backfill:true 标记），随后水位前移——重复回补同一水位零事件
（幂等）。非恢复依赖：水位文件缺失/损坏按全新启动处理（现行为零回归）。

### FR-09: run 族最小挂点
runCommand 族的 spawnWatcher 挂点补全：既有 1367 挂点（R7 切片一）覆盖非 auto 路径，
`run auto` 于 1342 早退不经该块——在 runAutoMode 头部补同款 best-effort spawnWatcher
（失败只 warn 不阻断，SILLYSPEC_WATCHER=0 逃生阀语义继承）。挂点避开并行会话 A
（stage-burst-fold）正在改的 1727/2073 一带；冲突时 rebase 以 A 为先。

## 非功能需求
- **零主流程耦合**：规则引擎异常/不跑对 CLI 协议面零影响（观测旁路 best-effort 语义
  继承）；warning 推送失败静默降级本地 jsonl。
- **轮询成本不增敏感**：快照新增面（git log -20 / status --porcelain / execute-runs
  有界遍历 / 账本 json 读取）均为廉价单发调用，3s 轮询间隔不变。
- **跨平台**：路径统一正斜杠比较；Windows 下 mtime 毫秒取整（既有口径）。
- **可测性**：规则引擎/回补/纯函数全部纯函数化（git 与 fs 面注入），单测零 CLI 依赖。
- **兼容性**：既有 watcher 事件消费者（jsonl 读者/平台 ingest）对新字段 additive 无感；
  既有 watcher.test.mjs 零回归。

## 决策覆盖矩阵
| 决策 | 覆盖需求 |
|---|---|
| D-001 规则引擎内嵌 watcher.js（方案 A） | FR-01~06 |
| D-002 证据口径：commit subject ∪ review.json mtime | FR-02, FR-07 |
| D-03 相位锁存单向 early→execute | FR-05 |
| D-004 声明面 fail-open + 容差匹配复用 change-list | FR-04 |
| D-005 水位=快照文件消费前移（幂等锚） | FR-08 |
| D-006 挂点选 runAutoMode 头部避冲突带 | FR-09 |
