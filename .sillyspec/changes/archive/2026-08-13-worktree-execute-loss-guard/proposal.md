---
author: qinyi
created_at: 2026-08-13 14:50:00
---
# 提案书（Proposal）

## 动机

多 agent 并行执行 worktree execute 时，子代理可在 worktree 工作区"实现"代码、甚至跑通测试写了 review.json，但**从未 commit 到 `sillyspec/<change>` 分支**。随后 worktree 目录被清（apply 后自动 cleanup / execute 完成 cleanup / 显式 cleanup / 并行 session），未 commit 的实现代码随目录蒸发，而 progress 仍全绿无告警——**静默数据丢失**（实证 change `2026-08-09-security-backend-guardrails`：progress 全绿但分支只有 1 个 baseline checkpoint commit，目标文件 `git cat-file -e` 不存在，fsck dangling 也找不到）。不主动核验三连会以为已交付。

## 关键问题

1. **cleanup 无保护**：`worktree.js cleanup()` 直接 `git worktree remove --force`，不检查 worktree 是否有未 commit / 未落主仓的交付变更。即使 `hasUnappliedChanges` 已有检测能力，cleanup 也从未调用它（grep 证实各调用点无该保护）——清理即蒸发。
2. **完成判定无核验**：execute 完成路径无"分支确有实现代码"核验，子代理空跑谎报（review 声称实现但代码从未落盘）能一路推进到 execute 完成、progress 全绿。
3. **判定主体被误用风险**：`hasUnappliedChanges` 判定 main HEAD（非主仓工作区），而 `git apply --3way` 不 commit → apply 后 cleanup 若加保护会误阻，需区分"清理即蒸发"与"已复制到主仓工作区可安全清理"（Grill B-1 实证）。

## 变更范围

1. `cleanup()` fail-closed 保护：未落主仓交付变更拒绝清理，显式 `--force` 绕过。
2. apply 后自动 cleanup 与 execute reset 的 cleanup 显式 `force:true`（代码已复制主仓工作区 / reset 即显式销毁）。
3. 显式 `worktree cleanup` 命令补 `blocked` 返回的显式分支（原 else 误打印「worktree 未找到」）。
4. execute 完成阶段级核验：聚合 review.changedFiles → `findMissingDeliverables` 核验落盘 → 缺失 warn（宽松非阻断）。
5. 新增 2 个测试文件。

## 不在范围内（显式清单）

- 不做 progress/execute 摘要绑定真实 commit sha + 文件清单（后续单独排）。
- 不强制子代理每 task commit（保留工作区实现→apply 落盘模式）。
- 不校验 commit 内容质量（Task Review Gate 已有兜底）。
- 不做 worktree→main 反向同步（exec-g defer）。
- 不改 apply 核心逻辑（仅 apply 后 cleanup 传 force）。

## 成功标准（可验证）

- 未落主仓交付变更时，`worktree cleanup <name>` 拒绝清理（blocked）并提示先 apply 或 --force。
- `--force` 显式绕过保护，清理成功。
- apply 后自动 cleanup 正常（force 绕过，不误阻）；execute reset 正常复位。
- execute 完成时，有 review 声称实现的文件既不在分支也不在工作区 → warn 列清单。
- 无风险态时 cleanup 行为与旧版一致（零回归）。
- 新增测试全绿 + 既有全量测试零回归。
