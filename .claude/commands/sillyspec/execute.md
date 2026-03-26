## 交互规范
**当需要用户从多个选项中做出选择时，必须使用 Claude Code 内置的 AskUserQuestion 工具，将选项以参数传入。**

## 核心约束（必须遵守）
- ❌ 跳过状态检查，自行推断阶段
- ❌ 跳步执行（不允许跳过 plan 直接 execute）
- ❌ 先写代码后补测试
- ❌ 编造不存在的方法/注解/路径/类/字段
- ❌ 自行补全缺失的接口/方法（应报告给用户）
- ❌ 意外修改了计划外的文件却不报告

## 状态检查（必须先执行）

```bash
sillyspec status --json
```

- `phase: "execute"` → ✅ 继续
- 其他 phase → 提示用户 `sillyspec next`

## 执行范围
$ARGUMENTS

---

## 加载上下文

```bash
cat .sillyspec/config.yaml 2>/dev/null
```

**工作区模式：** 根据计划 Task 标注确定子项目，额外加载共享规范 + CODEBASE-OVERVIEW.md，执行前 cd 到对应子项目目录。

**单项目模式：**
```bash
PLAN=$(ls -t .sillyspec/changes/*/tasks.md 2>/dev/null | head -1); cat "$PLAN"
LATEST=$(ls -d .sillyspec/changes/*/ | grep -v archive | tail -1)
cat "$LATEST"/{tasks,design}.md 2>/dev/null
cat .sillyspec/codebase/CONVENTIONS.md 2>/dev/null
```

确认实际存在的文件，不存在的标注跳过。如果 `$ARGUMENTS` 指定范围（如 `wave-1`、`task-3`），只执行对应部分。

---

## 执行策略

用 AskUserQuestion 询问用户选择：

**1. 执行模式：**
- 串行执行 — 当前会话逐任务执行，适合简单变更
- 子代理并行 — 每个 Task 启动独立子代理，适合多任务独立变更

**2. 确认频率：**
- 每个任务确认 — 每完成一个 task 展示结果，等用户确认后继续
- 每 N 个任务确认 — 每完成 N 个 task 汇总展示，用户一次性确认
- AI 自主判断 — AI 在遇到歧义、风险、计划外变更时才询问，其余自动推进
- 全自动 — 全部自动执行，不在中途打断用户

选择子代理模式时：
1. 按计划的 Wave 分组
2. 每个 Task 启动独立子代理（不继承主 session 历史）
3. 子代理上下文：任务描述 + 相关约定 + 要修改文件和被调用类的源码

---

## 每个任务的执行流程

### 1. 先读后写

写代码前，读取相关源文件确认风格和方法签名：

```bash
# 读取 CONVENTIONS
cat .sillyspec/codebase/{CONVENTIONS,ARCHITECTURE}.md 2>/dev/null
# 读取要修改的文件和同模块参考文件
cat <要修改的文件路径>
cat <参考文件路径>
```

**调用已有方法前，grep 确认存在：**
```bash
grep -rn "public.*getById" --include="*.java" src/main/java/**/service/
```
grep 不到 → 不许调用，先查清楚或报告给用户。

### 2. TDD（强制执行，不可跳过）

#### 🔴 RED — 写失败测试

先写测试文件，再写实现代码。写代码前测试必须先存在。

**写完测试后，立即运行确认失败：**

```bash
mvn test -pl <模块> -Dtest=<测试类> 2>/dev/null || ./gradlew test --tests <测试类> 2>/dev/null || npm test -- --testPathPattern=<测试文件> 2>/dev/null || pytest <测试文件> 2>/dev/null
```

确认：
- 测试失败（不是编译错误）
- 失败原因是功能未实现（不是语法错误）

**测试直接通过？** 你在测试已有行为，重写测试。**测试编译报错？** 先修测试语法。

#### 🟢 GREEN — 写最少代码

写刚好让测试通过的最少代码。不加额外功能。

**写完后立即运行确认通过：**

```bash
mvn test -pl <模块> -Dtest=<测试类> 2>/dev/null || ./gradlew test --tests <测试类> 2>/dev/null || npm test -- --testPathPattern=<测试文件> 2>/dev/null || pytest <测试文件> 2>/dev/null
```

确认：
- 测试通过
- 其他已有测试没有因此失败
- 无编译错误、无 warnings

**编译不通过或测试失败？** 修代码，不是改测试。**其他测试被破坏？** 立即修复。

#### 🔵 REFACTOR — 清理

在测试全绿的前提下清理：提取重复、改善命名、简化逻辑。重构后重新运行测试确认仍然通过。

**TDD 中间步骤（RED→GREEN→REFACTOR）连续执行，不需要每步等用户确认。但每一步都必须运行测试命令并确认结果，不可省略。**

**测试文件必须保留**，随代码一起 commit。违反 TDD（先写代码后补测试）→ 删代码重来。

**可跳过 TDD（不需要确认）：** 纯配置（YAML/properties）、纯数据（SQL seed）、纯文档（README/注释）。

### 3. 勾选 tasks

完成后在 `.sillyspec/changes/<变更名>/tasks.md` 勾选对应 checkbox：`- [x] [YYYY-MM-DD HH:MM:SS] 任务描述`

### 4. Git commit

`git add -A` → 生成 commit message → **根据用户选择的确认频率决定是否立即确认或批量确认**。

---

## 偏差处理

遇到问题：**停 → 报告 → 等人工确认。** 代码缺失、方法不存在、计划外变更 → 先读已有代码，再问用户。

## 完成后

所有任务完成后，用 AskUserQuestion 询问用户下一步：
1. **验证** — 执行 `/sillyspec:verify` 全面验证
2. **归档** — 跳过 verify，执行 `/sillyspec:archive`
3. **继续开发** — 不结束当前阶段

```bash
sillyspec status --json && sillyspec next
```

更新 `.sillyspec/STATE.md`：阶段改为 `execute ✅` 或 `execute 🔄 (X/M)`，历史记录追加执行结果。
