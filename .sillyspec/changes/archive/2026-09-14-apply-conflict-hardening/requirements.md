---
author: qinyi
created_at: 2026-09-14 13:40:00
generated_by: sillyspec-fourpiece-init
---
# 需求规格（Requirements）

## 角色
| 角色 | 说明 |
|---|---|
| 开发者/agent（apply 发起方） | 执行 worktree apply/assess，消费拦截信息与 --force 解锁 |
| CLI（worktree-apply 链） | merge 写回+暂存、manifest 落盘、锁内相交预检 |
| doctor（检查面） | manifest 漂移检测（两态内容 sha256 三分支） |

## 功能需求

### FR-01: merge 写回暂存收口
覆盖决策：D-001@v1
Given mergeDirtyOverlapThreeWay 产出 clean 合并文件并写回主仓
When 写回批完成
Then 该批全部文件（含新增）经显式 pathspec `git add` 进暂存区；add 失败 fail-open 不阻断 apply（warning）但 manifest 如实记录实际落盘面

### FR-02: apply-manifest 指纹落盘
覆盖决策：D-001@v1, D-005@v1
Given applyWorktree 任一成功出口（patch 主路径 / applyByMerge 两条提前 return 出口 / merge 写回后续）
When apply 成功
Then 变更目录落 apply-manifest.json（schemaVersion/change/appliedAt/baseHash/files:[{path,sha256}]），files=该出口实际落盘面；CLI 全权写（已存在覆盖——重放以最新为准），agent 勿手改

### FR-03: guard 相交 fail-closed 预检
覆盖决策：D-002@v1
Given 活跃 quick 会话（guard 目录存在 ∪ 7 天僵尸兜底）guard.allowedFiles 与本次 apply 文件集（changedFiles∪newPatchFiles）相交非空
When CLI apply 入口（opts.autoApply 缺省 false）
Then 抛结构化错误 exit 1（会话×文件对清单+串行化指引+--force 提示），不落盘
When opts.force=true
Then 放行且 result.overlapForced 留痕
When assess 自动入口（opts.autoApply=true）且无 force
Then 软跳过自动落盘（result.overlapSkipped + warning 指引人工评估），不抛错
Given 交集为空（无活跃会话/无声明）
Then apply 行为与现状零变化

### FR-04: rescue 提示与检测面
覆盖决策：D-003@v1, D-004@v1, D-005@v1
Given generateRescueCommands 输出
When 渲染
Then 末尾含「落地后立即 git add -- <files> 锁定」指引行
Given 变更目录含 apply-manifest.json（活跃∪归档 glob 收集，appliedAt 降序前 5）
When doctor 检查
Then 两态内容 sha256（worktree=readFile；staged=git show :<path>）与指纹三分支判定（worktree≠manifest→落盘面漂移/staged≠manifest→暂存面漂移/缺失→丢失）advisory 告警；未篡改零告警；无 manifest 零输出
Given ROADMAP.md
When 本变更归档
Then 含所有权登记观察项一行（复潮条件=护栏落地后仍实际损失 ≥2 次）

## 非功能需求
- 兼容性：无活跃交集零行为变化；无 manifest doctor 零输出；doctor 退出码语义不变；存量变更目录不受影响
- 可回退：预检/advisory 面不消费即静默；代码回退=删预检调用+manifest 写点+doctor 检查项三处
- 可测试：真 git 临时仓集成（staged 断言/指纹篡改/相交四态），不 mock git

## 决策覆盖矩阵（如存在 decisions.md）
| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-01, FR-02 | 写回收口+manifest |
| D-002@v1 | FR-03 | guard 相交 fail-closed（锚点修正：入口=CLI apply+assess 自动） |
| D-003@v1 | FR-04 | rescue 指引文案 |
| D-004@v1 | FR-04 | 所有权登记不做记 ROADMAP |
| D-005@v1 | FR-02, FR-04 | manifest 落变更目录+doctor 既有检查项形态 |
