---
name: sillyspec:plan
description: 编写实现计划 — 2-5 分钟粒度，精确到文件路径和代码
---

## 执行

**你必须使用 exec 工具（shell）执行以下命令，不要自己编造流程：**

1. 运行 `sillyspec run plan` — 读取输出的步骤 prompt
2. 按照输出的 prompt **严格执行**，不要跳过或自行添加步骤
3. 步骤完成后，运行 `sillyspec run plan --done --output "你的摘要"`
4. 重复 2-3 直到阶段完成
5. **禁止**在没有运行 CLI 的情况下自行决定流程

## 子代理并行优化（可选）

当 CLI 进入"写任务蓝图 task-N.md"步骤时（Step 5 之后），可以用子代理并行加速：

1. 读取 plan.md，统计任务数量
2. 为每个 task-N.md 启动一个独立子代理
3. 每个子代理的任务：
   - 读取 design.md 和 plan.md
   - 读取相关源文件
   - 按格式要求写 task-N.md 并保存
4. 所有子代理完成后，继续 CLI 的下一步（审查一致性）

**子代理 prompt 模板：**
```
你是计划编写者。请为以下任务编写详细蓝图。

任务：${taskName}
变更目录：${changeDir}
文件路径：${changeDir}/tasks/task-${taskNum}.md

要求：
1. 读取 design.md 和 plan.md 了解上下文
2. 读取相关源文件了解现有代码
3. 按以下格式编写任务蓝图并保存到文件：
   - 修改文件列表
   - 实现要求
   - 接口定义/数据结构
   - 边界处理
   - 参考
   - TDD 步骤
   - 验收标准（checkbox）
```

**注意：** 手动跑 plan 时不用子代理（串行即可），auto skill 中建议用子代理并行。

## 用户指令
$ARGUMENTS
