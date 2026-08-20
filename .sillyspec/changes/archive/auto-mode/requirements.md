# auto mode — 需求

author: qinyi
created_at: 2026-04-08 07:29:00

## 功能需求

### FR1: 阶段自动推进
- 按 brainstorm → plan → execute → verify 顺序自动执行
- 当前阶段完成后自动进入下一阶段

### FR2: 步骤自动循环
- 每个步骤：读 prompt → 执行 → 自动 --done → 读下一步
- 不需要用户手动触发 --done

### FR3: 确认点保留
- prompt 中有用户确认要求时暂停等回复
- 纯内部操作步骤自动完成

### FR4: 异常处理
- 命令失败时暂停，展示错误，等用户介入
