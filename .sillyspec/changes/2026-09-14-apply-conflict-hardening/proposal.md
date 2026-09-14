---
author: qinyi
created_at: 2026-09-14 13:40:00
generated_by: sillyspec-fourpiece-init
---
# 提案书（Proposal）

## 动机

2026-09-14-quick-exit-tiered-gates 归档 apply 后，12 个交付文件在主仓被并行会话的工作区级 git 操作冲掉（新文件删除、修改回退），靠 smoke 测试才暴露（troubleshooting §64）。代码级归因：自动主路径（patch+--3way 隐含 --index）已覆盖大部分面，真实缺口三条——merge 写回（worktree-apply.js:143）不进暂存区、apply 与活跃 quick 会话在途文件集可重叠落地无前置拦截、apply 后丢失/篡改无检测面。

## 关键问题

1. **mergeDirtyOverlapThreeWay clean 写回是全链路唯一未暂存的自动写点**——合并结果落地即裸奔，分钟级窗口内任何并行 git 工作区操作可冲掉；
2. **apply 对重叠文件零拦截**——活跃 quick 会话的 --files 声明就躺在 guard.json 里，apply 落盘前却从不看一眼，最大杀伤面（apply）在有人在途时照样落盘；
3. **被冲掉后不可知**——apply 结果无指纹留档，丢失/篡改只能靠下游偶然发现（本次正是 smoke 测试撞上的）。

## 变更范围

三段收口（scale=large，详见 design.md）：
1. **写回收口**：merge 写回批末显式 pathspec git add；三条成功出口统一写 apply-manifest.json（文件→sha256 指纹，verify-facts 同款 CLI 全权契约）；rescue 提示补「落地后立即 git add 锁定」；
2. **相交拦截**：applyWorktree 锁内预检——活跃 quick guard 文件集与 apply 文件集相交 fail-closed（CLI 入口 exit 1 + --force 解锁留痕；assess 自动入口软跳过+warning，永不自动越权）；
3. **检测面**：doctor 既有检查项追加 manifest 漂移检测（两态内容 sha256 三分支矩阵，advisory）；ROADMAP 记所有权登记观察项。

## 不在范围内（显式清单）

- 不做文件所有权登记表（裸 git 拦不住，复潮条件记 ROADMAP）
- 不改自动主路径（patch+--3way 已含 --index 零缺口）
- 不新增命令/步骤/占位符（doctor 检查项为既有形态内追加）
- 漂移检测 advisory 起步（升 blocking 另立变更）
- 不拦截并行会话自身的 git 操作（工具边界外）
- manifest 检测面=CLI 落盘面，rescue 人工落地不进 manifest（人工面靠 D-003 指引收窄）

## 成功标准（可验证）

- merge 写回后该批文件全部在暂存区（含新增文件）——集成测试断言 staged 面包含写回清单
- 三条成功出口（patch 主路径/applyByMerge 两出口/merge 后续）均产出 apply-manifest.json 且 files 覆盖实际落盘面
- 构造活跃 quick 会话声明重叠文件：CLI apply exit 1 带会话×文件对与 --force 指引；--force 放行且 result.overlapForced 留痕；assess 自动入口跳过落盘出 warning 不抛错
- doctor 对篡改过的 manifest 文件（改一字节）报漂移告警；未篡改零告警；无 manifest 变更零输出
- 空集（无活跃会话/无声明）时 apply 行为与现状逐字节一致（零回归）
- npm test / npm run lint 全绿
