---
name: sillyspec:run-quick
description: quick 轻流程：无落盘设计决策的小修补，三步到 --done
---
# 何时用

范围明确的局部修补（判据见 AGENTS.md 第 6 条；倒推 B 模式=代码先写好用 --done 收尾登记）。

# 生命周期速查

```bash
export SILLYSPEC_SESSION_ID=<agent名+任务名>   # 每条命令都带（shell 状态不持久；多会话并行的所有权判定依赖它）
# 启动（--input 必带，缺了占位标题/CLI 警告劝重启白跑一轮）：
sillyspec run quick --input "<语义化标题>"
# 步进（每步产出后）：
sillyspec run quick --done --change quick-<会话ID> --output "<摘要>"
# 末步收尾（四参数结构化落账 + 文件括注 + 关联变更）：
sillyspec run quick --done --change quick-<会话ID>   --req "<一句话标题>" --cause "<为什么改>" --solution "<怎么改的>"   --result "<验证情况：测试数/lint/部署>"   --file-notes "path::括注 || path2::括注"   --linked-changes <关联的正式变更名>
# 在隔离 worktree 内跑时（守卫默认拒绝，需双 flag）：
#   sillyspec <cmd> --allow-worktree-cwd --spec-dir "<worktree>/.sillyspec"
# 断点恢复：
sillyspec progress show   # 查进度后续跑
```

# 防坑清单

- --done 时显式 --linked-changes 有效（会并入 guard：蒸馏尾/轻归档/QUICKLOG 关联行都吃它）；'none' 清空。
- 触及 src/test 的改动 --done 门禁会亲自实测 local.yaml 的 test/lint——想省「被拦→修→重跑」一轮就先自跑。
- 纯 lint 失败重试时门禁仍会全量重测（已知损耗，勿绕门）。
- 显式 pathspec 提交（`git commit -m "..." -- 文件…`），禁 git add -A。

# 边界声明

本卡不含步骤内容——每步的具体指令由 `sillyspec run quick` 按当前状态实时渲染（含门禁、审查档位、产物契约）。本卡只管启动与防坑。
