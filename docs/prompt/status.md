# status（项目快照）阶段提示词

> **源文件**：`src/stages/status.js`
> **阶段定位**：项目级只读快照（非流程推进）。查「下一步该做什么/当前阶段进度」请用 sillyspec progress show，勿混淆。
> **类型**：辅助阶段（auxiliary，无活跃变更时也可执行）
> **全局角色 persona**：无
> **全局护栏 _globalGuardrails**：无（仅有 CLI 统一铁律，见 [README.md](./README.md)）
> **步骤总数**：3

> 📌 本文档展示的是**每个 step 的 prompt 模板原文**。agent 实际收到的提示词 = `outputStep` 注入的 header + persona（仅首步）+ prompt 正文（占位符已替换）+ 完成契约（仅首步）+ 铁律 + `--wait/--done` 命令模板。注入细节见 [README.md](./README.md)。

---

## Step 1/3：项目基础信息

**元数据**
- optional：false
- outputHint：项目基础信息
- 等待配置：无（可直接 --done）

**本步出现的运行时占位符**
- `<project>` → 当前项目名（`basename(cwd)` 或 db 项目名）

**提示词原文**

````markdown
收集项目基础信息。

### 操作
1. `cat .sillyspec/docs/*/scan/PROJECT.md 2>/dev/null | head -20 || echo "未初始化"`
2. 获取 project 名
3. `ls .sillyspec/docs/<project>/scan/ 2>/dev/null | head -10`
4. `cat .sillyspec/REQUIREMENTS.md 2>/dev/null | head -20`
5. `cat .sillyspec/ROADMAP.md 2>/dev/null`

### 输出
项目基础信息摘要
````

---

## Step 2/3：变更状态

**元数据**
- optional：false
- outputHint：变更状态
- 等待配置：无（可直接 --done）

**提示词原文**

````markdown
检查进行中的变更和归档历史。

### 操作
1. `ls .sillyspec/changes/ 2>/dev/null | grep -v archive`
2. 对每个进行中的变更：检查 proposal.md ✅/❌、design.md ✅/❌、requirements.md ✅/❌、tasks.md — X/Y 完成
3. `ls .sillyspec/changes/archive/ 2>/dev/null | wc -l`
4. `cat .sillyspec/HANDOFF.json 2>/dev/null`

### 输出
变更状态列表
````

---

## Step 3/3：输出状态报告

**元数据**
- optional：false
- outputHint：状态报告
- 等待配置：无（可直接 --done）

**提示词原文**

````markdown
生成完整状态报告。

### 输出格式：
```
📊 SillySpec 状态

📋 项目：xxx（已初始化 / 未初始化）
📂 代码库：已扫描（7 份文档）/ 未扫描

🔄 进行中：N 个变更
  - [change-1] Phase 3 (Execute) — tasks 5/8

✅ 已归档：N 个变更
📝 设计文档：N 份
📝 实现计划：N 份

💡 下一步：/sillyspec:continue
```

### 注意
- 不修改任何文件
````
