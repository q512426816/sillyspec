---
author: flow-machine-draft
created_at: 2026-10-28T00:26:52.805Z
---
# 设计记录（Design Record）— 2026-10-26-target-files-main-docs-rescue

## 做法概述

坑实证（2026-10-26-session-stage-progress verify 门）：模块卡等治理文档按 CLI 铁律「一律写主仓，绝不写 worktree 副本」，而 worktree 形态的 actual = worktree diff-base..HEAD + worktree status-porcelain，结构性看不见主仓侧改动——声明主仓治理路径恒落 missing 假红。「写 worktree=产物蒸发，写主仓=对账 missing」两规则打架，此前只能 target_files: [] 绕行（自废对账）。修法：reconcileTargetFiles 在 worktree 形态增一臂「主仓治理文档救赎」——用主仓 .sillyspec/ 的 status（--untracked-files=all 逐文件展开，模块卡常为新建文件，折叠目录条目对不上文件级声明）∪ baseline..HEAD diff 构成主仓治理面，对「声明而 missing」的治理前缀路径做救赎计数入 matched。救赎面严格限定已声明的 `.sillyspec/` 路径（不扩 undeclared 面），与既有 R9/R11 近窗救赎同语义；主仓读取失败 fail-open 走既有 missing 判定。

## 接口契约

- `src/verify-postcheck.js reconcileTargetFiles`：worktree 分支内新增救赎段——输入不变，行为变化仅为「声明而 missing 的主仓治理路径」在主仓有真实改动时改判 matched 并加一行 notes 披露；非 worktree 形态、声面无治理路径、主仓读取失败三态行为与改动前逐字一致（零回归）。
- `package.json`：test:core 清单登记 test/target-files-main-docs-rescue.test.mjs（防移出日常拦截面）。
- 对外 CLI 行为变化：worktree 形态 verify 的 target_files 对账不再对主仓治理文档假红；救赎披露走 notes。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/verify-postcheck.js | reconcileTargetFiles 增主仓治理文档救赎臂（约 L4809-4853） |
| 新增 | test/target-files-main-docs-rescue.test.mjs | 回归四臂：①未提交救赎 ②已提交救赎 ③不虚造 matched ④test:core 驻留 |
| 修改 | package.json | test:core 登记新测试文件 |

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：主仓治理面是纯 git 快照查询（status ∪ diff），与改动到达时序无关——先声明后改动、先改动后声明同一轮对账结果一致；对账后再改主仓，下一轮 verify 重新救赎，无缓存态。
2. 并发写：主仓 status/diff 是只读 git 调用，与并行会话写主仓文档无竞态——读到的是调用瞬间快照；救赎只影响本轮对账判定，不写任何文件。
3. 切换/生命周期：worktree 移除后 actual.form 非 worktree，救赎段整段跳过；baseAnchor 缺失时只走 status 臂（diff 臂跳过），不假设锚恒在。
4. 作用域：救赎面按主仓 specBase 的 git 仓取面（cwd 指主仓），声明路径以 `.sillyspec/` 前缀 + NEW: 剥除归一（pathKey 正反斜杠归一），跨仓声明路径不在本臂范围（跨仓对账走既有 repos 机制）。

## 风险与死路

最大风险：救赎把「主仓恰好改过同名治理文件但本变更没写」的声明误判为 matched——缓解：救赎只对显式声面生效且限治理前缀，误判后果是对账少一条 missing（保守方向是少拦不是假绿），且 notes 披露救赎计数可审计。试过但放弃的方案：①扩 worktree actual 读主仓全量 status——把主仓侧无关改动也卷进对账面，undeclared 假红换一种方式回来；②铁律改成都写 worktree 再同步主仓——「产物蒸发」风险方向（worktree 清理即丢档）不可接受；③对账时把治理路径从声明面剔除（不查）——自废对账语义，真缺产物从此无人拦。
