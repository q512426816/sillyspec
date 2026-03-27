## 交互规范
**当需要用户从多个选项中做出选择时，必须使用 Claude Code 内置的 AskUserQuestion 工具，将选项以参数传入。**

## 核心约束（必须遵守）
- ❌ 跳过状态检查，自行推断阶段
- ❌ 跳步执行（不允许跳过 plan 直接 execute）
- ❌ 先写代码后补测试
- ❌ 编造不存在的方法/注解/路径/类/字段
- ❌ 自行补全缺失的接口/方法（应报告 BLOCKED）
- ❌ 意外修改了计划外的文件却不报告

## 状态检查（必须先执行）

```bash
cat .sillyspec/STATE.md 2>/dev/null
```

有 STATE.md 且 phase 为 execute → 继续。无 STATE.md 或 phase 不对 → 检查是否有未完成的 tasks.md：

```bash
ls .sillyspec/changes/*/tasks.md 2>/dev/null | xargs grep -l '\- \[ \]' 2>/dev/null
```

有未完成的 tasks.md → 继续。没有 → 提示 `/sillyspec:continue`。

## 执行范围
$ARGUMENTS

---

## 加载上下文

```bash
cat .sillyspec/config.yaml 2>/dev/null
```

**工作区模式：** 根据计划 Task 标注确定子项目，额外加载共享规范 + CODEBASE-OVERVIEW.md。所有代码修改、测试运行、git commit 都在子项目目录中执行。

**加载以下文件（主代理读取，后续注入子代理）：**
```bash
PLAN=$(ls -t .sillyspec/changes/*/tasks.md 2>/dev/null | head -1); cat "$PLAN"
LATEST=$(ls -d .sillyspec/changes/*/ | grep -v archive | tail -1)
cat "$LATEST"/{tasks,design}.md 2>/dev/null
cat .sillyspec/codebase/{CONVENTIONS,ARCHITECTURE,KNOW-HOW}.md 2>/dev/null
cat .sillyspec/local.yaml 2>/dev/null
```

如果 `$ARGUMENTS` 指定范围（如 `wave-1`、`task-3`），只执行对应部分。

---

## 确认频率

用 AskUserQuestion 询问用户选择：
- **每个 Wave 确认** — 每个 Wave 完成后展示结果，等用户确认后继续下一 Wave
- **AI 自主判断** — AI 在遇到 BLOCKED 或计划外变更时才询问，其余自动推进
- **全自动** — 全部自动执行，不在中途打断用户

---

## 子代理执行（强制模式）

**所有任务通过子代理执行，主代理负责调度和记录。**

### 执行流程

1. 解析 tasks.md，按 Wave 分组
2. 同一 Wave 内的任务**并行启动**子代理，不同 Wave **串行等待**
3. 每个 Wave 完成后，根据用户选择的确认频率决定是否暂停
4. 子代理返回结果后，主代理勾选 tasks.md、更新 STATE.md

### 子代理 Prompt 模板

主代理在 dispatch 子代理前，必须准备以下 prompt（所有内容**内联**，不让子代理自己读文件）：

```
你正在执行任务：

## 任务描述
{tasks.md 中当前 task 的完整内容，包括步骤字段}

## 项目约定
{CONVENTIONS.md 全文}

## 已知坑和规律
{KNOW-HOW.md 全文}

## 项目架构
{ARCHITECTURE.md 全文}

## 构建命令
{local.yaml 中的 build 命令，如无则给默认命令}

## 工作目录
{子项目目录路径，工作区模式需要 cd 到此目录}

## 铁律（必须遵守）
1. **先读后写：** 先 cat 要修改的文件和参考文件，确认风格和方法签名后再写
2. **grep 确认：** 调用已有方法前必须 grep 确认存在，grep 不到 → 报告 BLOCKED
3. **不编造：** 不编造不存在的方法/注解/类/字段
4. **不自行补全：** 发现缺失接口/方法，不自己写，报告 BLOCKED
5. **TDD 不跳步：** 按任务步骤逐步执行，每步必须运行测试命令并确认结果
6. **测试直接通过 = 测了已有行为，重写测试**
7. **commit：** 完成后在工作目录执行 git add -A && git commit
8. **不修改计划外的文件**，如必须修改则在报告中说明

## 完成后报告（严格按此格式）

- **Status:** DONE / DONE_WITH_CONCERNS / BLOCKED
- **改动文件：** {列表}
- **测试结果：** {通过/失败/跳过及原因}
- **Commit:** {hash 或 "无"}
- **问题：** {BLOCKED 原因 / DONE_WITH_CONCERNS 描述 / 无}
```

### 子代理结果处理

子代理返回后，主代理：

1. **DONE** → 勾选 tasks.md，记录精确到秒的时间戳
2. **DONE_WITH_CONCERNS** → 勾选 tasks.md，记录问题到报告
3. **BLOCKED** → 不勾选，报告给用户，AskUserQuestion 三选一：
   - 重试（重新 dispatch 同一任务）
   - 跳过（勾选并标注 SKIPPED）
   - 停止（暂停执行，用户处理后继续）

---

## 完成后

所有任务完成后，用 AskUserQuestion 询问用户下一步：
1. **验证** — 执行 `/sillyspec:verify` 全面验证
2. **归档** — 跳过 verify，执行 `/sillyspec:archive`
3. **继续开发** — 不结束当前阶段

更新 `.sillyspec/STATE.md`：阶段改为 `execute ✅` 或 `execute 🔄 (X/M)`，历史记录追加执行结果（含精确到秒的时间戳）。
