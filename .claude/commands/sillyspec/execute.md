## 交互规范
**当需要用户从多个选项中做出选择时，必须使用 Claude Code 内置的 AskUserQuestion 工具，将选项以参数传入。**

## 核心约束（必须遵守）
- ❌ 跳过状态检查，自行推断阶段
- ❌ 跳步执行（不允许跳过 plan 直接 execute）
- ❌ 先写代码后补测试
- ❌ "先写草稿回头再测"
- ❌ 跳过测试因为"太简单"
- ❌ 测试意外通过时不重写
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
PLAN=$(ls -t .sillyspec/changes/*/plan.md 2>/dev/null | head -1); cat "$PLAN"
LATEST=$(ls -d .sillyspec/changes/*/ | grep -v archive | tail -1)
cat "$LATEST"/{tasks,design}.md 2>/dev/null
cat .sillyspec/codebase/CONVENTIONS.md 2>/dev/null
```

### 锚定确认（必须完成）

确认实际存在的文件：
```
已读取并理解：
- [x] plan — 实现计划和执行顺序
- [x] tasks.md — 实现清单
- [x] design.md — 技术方案和文件变更
所有可用上下文已加载，开始执行。
```

如果 `$ARGUMENTS` 指定范围（如 `wave-1`、`task-3`），只执行对应部分。

---

## 执行策略

用 AskUserQuestion 询问用户选择执行模式：
1. 串行执行 — 当前会话逐任务执行，适合简单变更
2. 子代理并行 — 每个 Task 启动独立子代理，适合多任务独立变更（需要 subagent 能力）

选择子代理模式时：
1. 按计划的 Wave 分组
2. 每个 Task 启动独立子代理（不继承主 session 历史）
3. 子代理上下文：任务描述 + TDD 纪律 + 精确文件路径 + 相关约定 + **要修改文件的当前源码** + **被调用类的源码**

选择串行模式时：
当前会话逐任务串行执行，每完成一个任务展示结果并等待用户确认。

## 每个任务的 TDD 铁律

```
🔴 RED    → 先写测试，运行确认失败
🟢 GREEN  → 写最少代码让测试通过
🔵 REFACTOR → 清理，保持测试通过
✅ COMMIT  → git 提交（测试文件必须包含在提交中）
☑️ CHECK  → 勾选 tasks.md 中对应的 checkbox
```

**Git 提交：** 检查 Git 仓库 → `git add -A && git commit`。工作区模式下在子项目目录提交。跳过不可提交的情况但记录在报告中。

**勾选 tasks：** 每个 Task 完成后，**必须立即**在 `.sillyspec/changes/<变更名>/tasks.md` 中将对应 checkbox 标记为 `[x]`。这是 Task 完成的最后一步，不允许跳过。

**测试文件必须保留：** 测试是产出物，不是草稿。写完的测试文件必须保留在项目中，随代码一起 commit，不能删除。

**哪些任务可以跳过 TDD（不需要人工确认）：**
- 纯配置文件（YAML、properties、.env、JSON 配置）
- 纯数据文件（SQL seed、fixture）
- 纯文档（README、注释）

**其他情况一律走 TDD：** Service、Controller、Mapper、组件、工具类、DTO（需要验证序列化/校验逻辑时）、API 接口 — 全部先写测试。

**违反 TDD → 删掉代码从测试重新开始。没有例外。**

## 写代码前必须读取现有源码（先读后写）

**⛔ 铁律：**
- 没有读过相关源文件，不允许写任何代码
- 方法签名必须来自已有代码或 plan 中的明确定义，禁止凭空编造
- 调用已有方法时，必须先 `cat` 源文件确认方法签名（参数、返回值、异常）

```bash
cat .sillyspec/codebase/{CONVENTIONS,ARCHITECTURE}.md 2>/dev/null
```

然后读取同模块已有代码（根据语言过滤）：
```bash
# Controller/Handler/Router
find . \( -path "*/controller*" -o -path "*/handler*" -o -path "*/router*" -o -path "*/api*" \) \
  -type f \( -name "*.java" -o -name "*.ts" -o -name "*.py" -o -name "*.go" \) \
  -not -path "*/{node_modules,dist,.git,vendor,build}/*" | head -15
# Service/Manager/Repository
find . \( -name "*Service*" -o -name "*Manager*" -o -name "*UseCase*" -o -name "*Repository*" \) \
  -type f \( -name "*.java" -o -name "*.ts" -o -name "*.py" -o -name "*.go" \) \
  -not -path "*/{node_modules,dist,.git,vendor,build}/*" | head -15
```

**找不到相关代码时：**
- 棕地项目 → 报告缺失，请用户提供参考路径
- 绿地项目 → 靠 CONVENTIONS.md + ARCHITECTURE.md + brainstorm 设计方案驱动

## 两阶段审查

每个任务完成后：
- **A 规范合规：** tasks checkbox 完成？design 方案一致？测试有意义？
- **B 代码质量：** DRY、YAGNI、死代码、错误处理、CONVENTIONS.md 合规？

**3 轮审查不通过 → 提交人工处理。**

## 偏差处理

遇到问题：**停 → 报告 → 等人工确认。** 代码缺失、方法不存在、权限注解未知 → 先读已有代码确认风格，再问用户。

## 自检门控

- [ ] 完成任务与 plan 一致？
- [ ] tasks.md 所有 checkbox 都已勾选为 `[x]`？
- [ ] 未意外修改计划外文件？
- [ ] 每个任务有 git commit？
- [ ] 测试全部通过？

## 完成后

```bash
sillyspec status --json
sillyspec next
```

更新 `.sillyspec/STATE.md`：阶段改为 `execute ✅` 或 `execute 🔄 (X/M)`，历史记录追加执行结果。
