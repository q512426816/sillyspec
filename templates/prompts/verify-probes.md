### 自动探针（必须先执行）

> 🔧 **先跑 CLI 机械探针（一条命令）**：`sillyspec verify-probes --change <change-name> [--init]`
> 输出已包含四个纯机械探针的结果（可直接进验证报告）：**探针 1** 未实现标记扫描（design 清单文件逐行 TODO/FIXME 命中 + 行号）、**探针 3** 测试文件递归查找（含 co-located tests/，逐 task 覆盖）、**探针 5** API 契约对账表（endpoints.json × 前端调用 diff）、**探针 6** 删除对账三态（git 事实 × design 声明）。`--init` 顺带生成 verify-result.md 九章节骨架（探针结果已预填，`<!--TODO-->` 占位替换即可）。
>
> 下列条目中，只有**半语义部分**需要你执行：探针 2（关键词提取）、探针 3.4 集成盲区标注、探针 3.5 断言有效性抽查、探针 4（决策追踪闭环判定）。CLI 已跑的部分勿重复手跑——对 CLI 输出的 warning 项做语义复核即可。

**探针 2：设计关键词覆盖探针（你执行——关键词提取是语义）**
1. 读取 design.md，从中提取所有能力关键词（如"登录"、"导出"、"批量"、"删除"、"搜索"等动作词）
2. 对每个关键词，在源码目录中 grep 确认是否有对应的实现代码：
```bash
grep -rl "<关键词>" <源码目录>/ --include="*.java" --include="*.js" --include="*.ts" --include="*.jsx" --include="*.tsx" --include="*.py"
```
3. 如果某个关键词在源码中完全没有匹配，标记为 ⚠️ 可能未实现

**探针 3 补充（CLI 已查存在性，你补语义）**
- **集成盲区提示**：测试文件存在 ≠ 集成正确——路由/layout 守卫重定向、跨模块装配这类集成 bug 组件单测覆盖不到，只有集成/冒烟/E2E 才暴露。对路由/layout/跨进程装配敏感的 task，额外检查是否有集成冒烟覆盖；无则标 ⚠️ 集成层未验证（需人工或部署确认）
- **断言有效性抽查（与 execute「测试用例设计」闭环）**：测试文件存在 ≠ 测试有效。对最能代表本次变更行为的 2-3 个核心测试做抽查：① 断言验证真实输出/副作用，不是只"不抛错"的空断言、只测 getter/setter；② 覆盖边界/异常分支，不只业务正例；③ 走公开 API 测行为，不测实现细节（重构后功能不变测试不应失败）。不达标标 ⚠️ 断言薄弱或无效（advisory：CLI 不阻断，是否 FAIL 由你诚实判定；execute 已按「测试用例设计」写的，这里只抽查核验，不重审全量）

**探针 4：决策追踪覆盖探针（如存在 decisions.md——闭环图机械，证据真伪是语义）**
1. 从 decisions.md 提取所有当前版本 D-xxx@vN
2. 检查 requirements.md 是否引用每个 D-xxx@vN，并映射到 FR-xxx
3. 检查 plan.md 或 tasks/task-NN.md 是否引用每个 FR-xxx/D-xxx@vN
4. 检查本步骤收集的实现证据是否能回指到对应 D-xxx@vN/FR-xxx
5. 任意 D-xxx@vN 无下游覆盖时标记为 ⚠️ 决策未闭环
6. 任意 P0/P1 unresolved/blocking 决策标记为 FAIL blocker

**探针 5 补充（CLI 已出对账表，你做诚实判定）**
CLI 的 missing backend endpoint 是 advisory（不硬阻断归档）——但 contract gap 是真实集成缺陷，应诚实标 FAIL 并回 execute 补端点，勿因 CLI 不拦而放行。后端 router 的端点清单可用 `sillyspec endpoints extract --change <变更名> --task <task-NN>` 重新静态提取（勿手扫装饰器）。

**探针 6 补充（CLI 已出三态判定，你做终审）**
以 git 事实为准（真实 > 声明）；CLI 的三态（合规/高风险/未声明）是机械判定，是否构成 FAIL blocker 由你诚实判定，务必如实记录——静默删除代码是 verify 的最大盲区。
