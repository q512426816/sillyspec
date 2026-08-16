### 自动探针（必须先执行）
在检查前，依次运行以下六个探针，将结果作为验证输入：

**探针 1：未实现标记扫描（仅变更文件）**
只扫描本次变更涉及的文件，不要全项目扫描——历史 TODO 与本次变更无关，徒增噪音与 token。变更文件 = design.md「文件变更清单」列出的源码文件（你已在「加载规范」步骤读取 design.md，glob 路径需展开为具体文件）：
```bash
grep -n "尚未实现\|TODO\|FIXME\|HACK\|XXX" <design 清单中的源码文件>
```
记录每个匹配的文件、行号和内容。

**探针 2：设计关键词覆盖探针**
1. 读取 design.md，从中提取所有能力关键词（如"登录"、"导出"、"批量"、"删除"、"搜索"等动作词）
2. 对每个关键词，在源码目录中 grep 确认是否有对应的实现代码：
```bash
grep -rl "<关键词>" <源码目录>/ --include="*.java" --include="*.js" --include="*.ts" --include="*.jsx" --include="*.tsx" --include="*.py"
```
3. 如果某个关键词在源码中完全没有匹配，标记为 ⚠️ 可能未实现

**探针 3：验收标准测试覆盖探针**
1. 读取变更目录下的 tasks.md，提取所有 checkbox 任务
2. 对每个 task，**递归**检查对应模块目录及其**所有子目录**下是否存在测试文件（*test*、*spec*、*Test*、*Spec*）——包括模块内 co-located 的 tests/ 目录（如 `backend/app/modules/*/tests/`），**不要只看顶层 `tests/`**，否则会把测试就在模块内部的项目误判为“无测试”
3. 没有测试文件的 task 标记为 ⚠️ 缺少测试
4. **集成盲区提示**：测试文件存在 ≠ 集成正确——路由/layout 守卫重定向、跨模块装配这类集成 bug 组件单测覆盖不到，只有集成/冒烟/E2E 才暴露。对路由/layout/跨进程装配敏感的 task，额外检查是否有集成冒烟覆盖；无则标 ⚠️ 集成层未验证（需人工或部署确认）
5. **断言有效性抽查（与 execute「测试用例设计」闭环）**：测试文件存在 ≠ 测试有效。对最能代表本次变更行为的 2-3 个核心测试做抽查：① 断言验证真实输出/副作用，不是只"不抛错"的空断言、只测 getter/setter；② 覆盖边界/异常分支，不只业务正例；③ 走公开 API 测行为，不测实现细节（重构后功能不变测试不应失败）。不达标标 ⚠️ 断言薄弱或无效（advisory：CLI 不阻断，是否 FAIL 由你诚实判定；execute 已按「测试用例设计」写的，这里只抽查核验，不重审全量）

**探针 4：决策追踪覆盖探针（如存在 decisions.md）**
1. 从 decisions.md 提取所有当前版本 D-xxx@vN
2. 检查 requirements.md 是否引用每个 D-xxx@vN，并映射到 FR-xxx
3. 检查 plan.md 或 tasks/task-NN.md 是否引用每个 FR-xxx/D-xxx@vN
4. 检查本步骤收集的实现证据是否能回指到对应 D-xxx@vN/FR-xxx
5. 任意 D-xxx@vN 无下游覆盖时标记为 ⚠️ 决策未闭环
6. 任意 P0/P1 unresolved/blocking 决策标记为 FAIL blocker

**探针 5：API Contract Parity Check（跨前后端契约对账）**
此探针仅在以下条件满足时执行：
- 存在 \.sillyspec/.runtime/contract-artifacts/ 目录（说明 execute 阶段生成了 endpoint artifact）
- 或者项目同时有 backend/ 和 frontend/ 目录

执行步骤：
1. 收集所有 provider endpoint artifacts：
   - 读取 .sillyspec/.runtime/contract-artifacts/*/endpoints.json
   - 汇总为 backend 端点清单
2. 扫描前端 API 调用：
   - 在 frontend/ 目录中搜索 apiFetch/request/axios/fetch 调用
   - 提取所有 API 路径（归一化动态参数为 {param}）
3. Diff 对账：
   - 前端调用路径在 backend 端点清单中找不到 → **❌ Missing backend endpoint**（advisory：CLI 复核后仅 warn，不硬阻断归档；但 contract gap 是真实集成缺陷，应诚实标 FAIL 并回 execute 补端点）
   - backend 端点在前端无调用 → ⚠️ Unused backend endpoint（warning，不阻断）
4. 输出对账结果表格（示例用通用占位路径，实际填本仓真实文件）：

   | 状态 | 前端调用 | 后端端点 | 文件 |
   |---|---|---|---|
   | ❌ missing | GET /api/<域>/<资源>/<param> | — | <前端调用所在文件，如 src/lib/<模块>.ts> |

如果发现 Missing backend endpoint，在验证报告中标记为 ❌ contract gap（CLI 仅 advisory 提示、不硬阻断归档；但缺口真实存在——诚实判 FAIL 并回 execute 补齐端点，勿因 CLI 不拦而放行）。

**探针 6：代码删除对账（切斯特顿栅栏护栏）**
静默删除代码是 verify 的盲区——agent 删一段它看不懂的旧代码，只要路径合规、不碰风险关键词，其他探针都不会响。用 git 事实客观对账，不要凭记忆：
1. 运行 `git diff --name-status HEAD`（本次变更已 apply 到主仓、未 commit，删除的文件在工作树消失但仍在 HEAD，显示 `D`）
2. 筛出状态以 `D` 开头的行（删除）；`R`/`C` 开头的旧路径等价删除
3. 对每个删除文件，核对 design.md「文件变更清单」声明的操作：
   - design 声明「删除」→ ✅ 合规（预期删除）
   - design 声明「新增/修改」却整文件删除 → ❌ 高风险（声明与事实矛盾）
   - design 清单未列出 → ⚠️ 未声明删除
4. 排除 `.sillyspec/` 与 `meta.json`（文档 churn 不算删除信号）
5. verify --done 时 CLI 会用同一 git 事实 advisory 复核（打印警告，不硬阻断归档）——是否 FAIL blocker 由你诚实判定，务必如实记录
