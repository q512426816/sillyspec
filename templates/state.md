## 核心约束（必须遵守）
- ❌ 修改任何文件（只读）

---

## 流程

```bash
cat .sillyspec/STATE.md 2>/dev/null
```

**有 STATE.md：** 格式化展示当前变更、阶段、进度、下一步、阶段进度表、关键决策、阻塞项。

**无 STATE.md：**
> 📊 还没有工作记录。
> - 新项目：`/sillyspec:init`
> - 已有项目：`/sillyspec:scan`
> - 恢复中断：`/sillyspec:resume`

**注意：** `/sillyspec:status` 看项目整体进度（change 文件级），`/sillyspec:state` 看当前工作状态（STATE.md 级）。
