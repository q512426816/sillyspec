---
author: qinyi
created_at: 2026-09-23 00:32:26
---

# 决策记录（Decisions）— 2026-09-23-sentinel-rules

## D-001@v1: 规则引擎内嵌 src/watcher.js（方案 A）
- 模块域：sync
- **覆盖**：FR-01, FR-06
- **上下文**：四规则引擎放哪——内嵌 watcher.js / 独立 sentinel-engine.js / 平台侧。
- **裁定**：内嵌 watcher.js，applySentinelRules 纯函数 + 子进程循环维护 state。
- **理由**：与快照/事件管线同文件共 noun（prev/next 快照直接消费，零跨文件耦合
  API）；任务书明示"核心是 src/watcher.js 内加规则引擎"（用户裁定）。
- **否决**：B 独立模块——快照内部结构（commits/dirtyCode/reviews 新增面）被迫成为
  跨文件契约，且违背任务书位置约束；C 平台侧——违背 §九.5（ingest 只展示不判定）、
  断网失效、真相源在本地 jsonl。

## D-002@v1: 假勾选证据口径 = commit subject 完整 token ∪ review.json mtime
- 模块域：sync
- **覆盖**：FR-02, FR-07
- **上下文**：任务书定"消息不含 task-XX 且无 review.json 变更"为可疑。
- **裁定**：证据一 = 区间新提交 subject 含完整 token task-NN（`task-01` 不误证
  `task-010`，按词边界匹配）；证据二 = execute-runs 下 `/tasks/task-NN/review.json`
  mtime 变化（watcher 侧）/ 在场（L0 侧）。任一在场即有证据。
- **理由**：review.json 是执行期任务完成的协议工件（task-review.js），mtime 变化/
  在场即完成声明痕迹；两证据并集覆盖"提交型"与"评审型"两种真实完成路径。
- **复潮条件**：若执行期 review.json 大量缺失导致假阳性率高，收口批（L0 接线时）
  复核证据面。

## D-003@v1: 停滞相位锁存单向 early→execute，不回退
- 模块域：sync
- **覆盖**：FR-05
- **上下文**：分阶段阈值需要知道"现在在哪个阶段"；watcher 不读 progress db。
- **裁定**：相位由产物签名锁存：首次 task-done 事件或 tasks.md 在场后的首个提交 →
  execute，永不回退 early。brainstorm/plan 合并 early（阈值同为 20min）。
- **理由**：plan 期回改 plan.md 会把事件 stage 拉回 'plan'，若相位随最新事件浮动会
  反复横跳；锁存是单调近似，advisory 语义下足够。不读 progress db 保持单写者纪律
  与观测解耦（watcher 哲学：只看产物签名）。

## D-004@v1: 声明面 fail-open + 复用 change-list 容差匹配
- 模块域：sync
- **覆盖**：FR-04
- **上下文**：范围漂移需要"变更面"；任务卡与 design 清单写法多样（反引号/尾注/NEW:
  前缀/glob）。
- **裁定**：声明面 = 任务卡 allowed_paths ∪ design.md 文件清单，normalizePath 归一 +
  globMatch 容差（复用 change-list.js 既有口径）；两源皆空 → 跳过规则不告警。
- **理由**：advisory 规则不无事生非——brainstorm 期无声明面时代码脏文件多为他者
  会话/基线噪声，无面可判即沉默；复用既有匹配器避免第三套 glob 方言。

## D-005@v1: 水位回补 = 快照文件消费前移（幂等锚）
- 模块域：sync
- **覆盖**：FR-08
- **上下文**：watcher 重启后面板断流；恢复事件不能靠重放 jsonl（无快照历史）。
- **裁定**：每轮落盘 watcher-last-snapshot-<change>.json；重启以其为 prev diff 补发
  （backfill:true），随后水位前移；重复回补同水位零事件。
- **理由**：幂等锚=水位即"已观测到的世界状态"，消费即前移，天然重入安全；非恢复
  依赖——文件缺失/损坏全新启动（现行为），面板少一段历史不损真相。

## D-006@v1: run 族挂点选 runAutoMode 头部（避冲突带）
- 模块域：runtime
- **覆盖**：FR-09
- **上下文**：任务书要求 runCommand 尾部 triggerSync 附近挂 spawnWatcher；并行会话 A
  正改 command.js 1727/2073 一带。
- **裁定**：现状核对后实际缺口仅 `run auto` 早退分支（既有 1367 挂点覆盖非 auto 全
  部路径，quick 会话 id 即 changeName 亦经该块）；挂点放 runAutoMode 头部 changeName
  回显后，语义与 flow start 同款 best-effort。
- **理由**：与任务书意图一致（run 族全路径观测面完整）且实质缺口最小；位置避开 A 的
  冲突带，rebase 以 A 为先。
