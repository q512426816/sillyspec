---
author: qinyi
created_at: 2026-09-18 07:18:20
generated_by: sillyspec-design-init
scale: large
risk_level: contract-required
---

# 设计文档（Design）— 2026-09-18-probe8-direct-compare

## 背景

2026-09-15 EHS 复盘的 5 个 P1 中，**3 个是前后端字段错位**（P1-1 网页端表单字段名≠实体名致相关方支线全灭 / P1-2 小程序缺发 reportOrgId 致开立必拒 / P1-6 reportOrgName NOT NULL 漏发致严格模式插入失败）——这类缺陷长在代码与代码的缝隙里，声明面对账（design 契约面）天然盲。归档变更 2026-09-16-cross-layer-contract-probe 建了 probe8 骨架但显式留白三个空位：①不做代码直比 ②不做 Controller 校验器提取 ③不做硬门。批次 C（v3.28.12）已交付运行时地板（smoke+覆盖矩阵），本批补静态直比面——**probe8 从「声明面对账」升级为「声明面+代码直比」双维度探针**。

## 设计目标

1. probe8 文件源从 design 清单声明面切换为 worktree diff 实际面（design 差集降 advisory）。
2. 新增代码级字段直比维度：前端 payload 构造点字段集 vs 后端实体/DTO 字段集——产出漂移嫌疑+必填漏发嫌疑两类 advisory warning。
3. Controller 必填校验器三形态机械提取（注解/参数/显式调用）。
4. 骨架渲染 direct-compare 子段+命中统计，advisory 档起步攒证（硬门升格后续独立决策）。

## 非目标

- 不做类型形状比对（字段类型/嵌套 DTO 展开比对）
- 不做前端框架 DSL 深度解析（Vue template 表达式 AST / JSX 编译级）
- 不做非 Java 后端提取（Go/Python/Node 后端——攒需求后扩展）
- 不做硬门升格（warning→error 需一轮实证假阳率<5%）
- 不动 probe8 既有 design 契约面对账（代码直比为新增维度并行存在）
- 不引入 AST 解析依赖（零依赖铁律）

## 拆分判断

批次 B 单变更不拆——三个空位（diff 源/直比/校验器）是同一探针的三个升级面，拆开则直比无源、源无直比。批次 D/E 独立后续变更。

## 总体方案

### §1 probe8 diff 源替换（D-001，Grill 修正版）

- `runProbe8PayloadParity`（verify-probes.js:386-553）文件集取数切换：新函数 `collectProbe8DiffFiles({ cwd, changeName, specBase, repoKeys })` 内部封装：
  - **主仓**：`_readWorktreeMeta`（contract-matrix.js 导出、verify-probes 已 import :34）读 worktree meta → 有 worktree 时 `git diff <baseline>..HEAD ∪ status --porcelain`（gitQuiet 数组参数，`_resolveDiffFilesForParity`（contract-matrix.js:404）**同文件同构先例**——本探针已在同一 import 链上，零新增依赖边）；产物按 `unquoteGitPath`（git-helper.js 导出，task-review.js:14 先例）归一。
  - **跨仓**：全注册仓循环双源直采（`parseRepoRegistry` 读 local.yaml → 每仓根 `git diff HEAD~1..HEAD ∪ status --porcelain`）——**复刻 `collectCrossRepoDiffRoots`（run/complete.js:1035）只读口径**（不 import run/ 目录，run→core-engine 方向按仓内惯例不反向）；**弃用 reconcileCrossRepoDeclarations 作采集器**（Grill B-2：它是声明触发对账器，未声明仓不被扫——与 D-001「声明面不可信」动机矛盾）。
  - **fallback 链三态**：worktree 可用 → diff 双源；worktree 缺失（in-place）→ 主仓 `git diff HEAD~1..HEAD ∪ status --porcelain`（**含已提交窗口**，Grill B-9 修正——porcelain 单源漏已提交面+落共享脏窗口有并行污染风险已登记 R-06）；git 全失败 → design 清单源（fail-open + 模式注记「文件源=design 清单（diff 不可用）」）。
  - **文件分类规则**（Grill B-10 补定义）：`.java` → backend；`.js/.jsx/.wxml` → frontend；`.ts/.tsx` → 按**目录启发式**裁决（`.vue` 无条件 frontend）——路径含 `src/routes|src/pages|src/components|src/models` → frontend，路径含 `controller|service|mapper|entity|dto|api` 或文件头 10 行含 `@RequestMapping|@RestController|@Service` → backend，两不中 → other（直比跳过+计数注记）；`.css/.less/.json/.md/.sql` 等 → other；`.vue` 无条件 frontend（N-2 统一）。
- **design 差集 advisory**：design 清单有但 diff 无的路径 → 注记行列出供复核（不参与对账、不阻断）。

### §2 代码级字段直比（D-002/D-006，Grill 修正版）

probe8 段尾部新增 **direct-compare 子段**，独立导出函数：

**`extractFrontendPayloadFields(filePath, content)` 导出**：
- 后缀选匹配族：`.js/.ts/.jsx/.tsx` → `formData\.[a-zA-Z]\w+` / `payload\.[a-zA-Z]\w+` / **请求调用邻近窗口 DTO 字面量键**（`extractPayloadKeys` 同款口径：请求调用行后 8 行窗口内的 `{ key:` 键名——不收全文件字面量，Grill B-5 对齐现行先例防非请求区对象键污染）/ `name="(\w+)"`；`.vue` 加 `v-model="(\w+)"` / `prop="(\w+)"`；`.wxml` 加 `value="\{\{(\w+)\}\}"` / `data-(\w+)=`
- **URL→端点关联算法**（Grill B-8 补定义）：文件内 `(?:fetch|post|put|delete|getRequest|postRequest|putRequest|deleteRequest|search)\s*\(\s*['"\`/]([^'"\`,\s]+)` 抓 URL → 归一（去 query `?...`、去首 `/api/` 前缀、去尾 `/`）→ 后端端点匹配用**词边界后缀判定**（前端归一 URL 是后端 `@RequestMapping` 完整 path 的**路径段边界后缀**——`/orders` 命中 `/api/v1/orders` 但不误命中 `/rporders`（段首对齐）；类级+方法级 mapping 拼接后按段边界后缀判定即命中）；无 URL 文件归「未关联端点」面（仅漂移对账参与，必填漏发不参与）
- 归一：lowerCamel（snake_case→camelCase）；escape hatch：文件首 5 行含 `probe8-skip` → 跳过计数

**`extractBackendFields(files)` 两趟扫描导出**（Grill B-4 签名修正——@RequestBody 类型名需跨文件解析，单文件签名不可行）：
- **第一趟**（Controller 定位）：.java 文件含 `@(?:Request|Get|Post|Put|Delete|Patch)Mapping` → 解析端点（类级 `@RequestMapping("prefix")` + 方法级 `@GetMapping("/path")` 拼接为完整 path，method 取注解动词）→ 方法签名参数提取：
  - `@RequestParam` **修正正则**（Grill B-3）：`@RequestParam\s*(?:\(([^)]*)\))?\s+(?:final\s+)?(?:\w+(?:<[^>]+>)?)\s+(\w+)` ——捕获组 2=**参数名**（最后一个 identifier，前为类型）；注解参数串（组 1）含 `required\s*=\s*false` → 该参数非必填排除；`@RequestParam\(\s*(?:value\s*=\s*)?["'](\w+)["']` 命中时参数名取注解 value
  - `@PathVariable\s+(?:\w+\s+)?(\w+)` / `@RequestBody\s+(\w+)`（类型名收集待二趟解析）
  - **必填集三形态**（D-003）：①注解 `@(?:NotNull|NotBlank|NotEmpty)` 注解行起向下 5 行窗口内首个字段声明（Grill 窗口放宽 1~3→5）；②`@RequestParam`（排除 required=false 后全部计必填——Spring 缺省 true）；③方法体前 30 行内校验调用 `StringBlankValidator\s*\(\s*["'](\w+)["']` / `Valid\.valid` 同行/上一行字段名 / `if\s*\(\s*(\w+)\s*==\s*null`
- **第二趟**（DTO/实体解析）：`@RequestBody` 类型名集 → **全仓 grep 该类定义**（`class\s+<TypeName>\b` 在 src/ 递归搜，不限于 diff 面——Grill B-7：变更不动实体时 diff 面字段集空致全量假阳）→ `private\s+\w+(?:<[^>]+>)?\s+(\w+)\s*;` 字段名集；实体 diff 面文件也直接解析（不依赖 @RequestBody 引用链）
- 非 Java 后端（分类规则判 backend 但非 .java）→ nonJavaSkip 计数
- 后端 escape hatch：同前端 `probe8-skip`（Grill 修正清单补——原仅前端有）

**`comparePayloadFields(frontendByFile, backendEndpoints, backendAllFields)` 导出（纯函数）**：
- 漂移嫌疑：前端发送字段 ∉ `backendAllFields`（= 二趟全仓 DTO/实体字段集 ∪ 一趟 Controller 方法参数名集的并集——**非仅 diff 面**，Grill B-7 修正）→ warning「字段名漂移嫌疑：`<文件:行号:字段>` 不在后端实体/DTO 字段集中——Jackson 静默丢弃可能」
- 必填漏发嫌疑：后端某端点 requiredFields ∋ 字段 ∉ 该端点关联的前端文件发送集 → warning「必填漏发嫌疑：后端必填 `<端点:字段>` 前端未发送」
- 产出 `{ driftWarnings: [{file, line, field}], missingRequiredWarnings: [{endpoint, method, field, frontendFiles}], escapeHatchCount, nonJavaSkipCount }`——**driftWarnings 含行号**（提取阶段记录首命中行，Grill 修正清单 3）

### §3 骨架渲染与 advisory 档（D-004）

- probe8 段渲染尾部追加 direct-compare 子段：命中统计行（`- direct-compare: 漂移嫌疑 N 条 / 必填漏发嫌疑 M 条 / escape hatch K 文件 / 非 Java 后端跳过 J 文件`）+ 逐条明细行（格式同 probe1 ⚠️ 行：`` `文件:行号` `` + 说明）。
- 全部 **advisory**（不阻断、不进 errors/warnings 数组，探针输出面独立渲染段）——命中统计供后续批次评估升格。

### §4 测试面（Grill 修正版）

新增 `NEW:test/probe8-direct-compare.test.mjs`（~35 断言）：
- 前端提取三后缀五形态（js formData/payload/请求邻近窗口 DTO 键/name 属性 + vue v-model/prop + wxml value 绑定/data-xxx）
- **DTO 键邻近窗口负例**（非请求区对象字面量不收——Grill B-5）
- 后端提取（实体字段 / **@RequestParam 三态：正常参数名捕获 / required=false 排除 / value 注解参数名** / @RequestBody+@PathVariable / 校验调用三模式 / 注解 5 行窗口）
- 对账两类 warning 语义（漂移含行号 / 漏发）+ escape hatch（前端+后端双侧）+ 非 Java 跳过
- diff 源 vs design 清单源 fallback 三态（worktree/in-place 含已提交窗口/design-only）
- **URL→端点关联**（归一化+后缀包含匹配+类级方法级拼接+未关联面）
- **文件分类规则**（.ts 目录裁决二态 / 两不中 other / .java→backend / .vue→frontend）
- **渲染行不误中 verify-postcheck 锚点负例断言（`- direct-compare:` 前缀行不匹配 verify-postcheck.js:2887/:2891 的 PROBE8 系字面前缀锚定正则）

既有增量：`test/probe8-payload-parity.test.mjs`（diff 源替换后既有断言适配+fallback 链）+ `test/probe8-contract-pivot.test.mjs`（如涉及渲染面变化）。预计 +40~50 断言。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/verify-probes.js | runProbe8PayloadParity diff 源切换 + collectProbe8DiffFiles/extractFrontendPayloadFields/extractBackendFields/comparePayloadFields 四导出 + 骨架 direct-compare 子段渲染。数据流：producer=diff/git 取数 → 四函数提取对账 → 探针输出面（advisory） |
| 修改 | test/probe8-payload-parity.test.mjs | diff 源替换后既有断言适配 + fallback 链断言 |
| 修改 | test/probe8-contract-pivot.test.mjs | 渲染面子段追加后断言随行（如涉及） |
| 修改 | test/check-syntax.mjs | PENDING_EXPORT_WHITELIST 条目管理（producer 先行导出豁免+task-06 接线后清理+fr-index 并行会话在途临时豁免） |
| 修改 | .sillyspec/docs/sillyspec/modules/_module-map.yaml | fr-index.js 并行会话在途产物临时补录（core-engine paths） |
| 新增 | NEW:test/probe8-direct-compare.test.mjs | 提取三后缀五形态+后端三形态+对账+fallback 断言 |

## 接口定义

```js
// src/verify-probes.js（新增导出）
export function collectProbe8DiffFiles({ cwd, changeName, specBase, repoKeys })
// → { source: 'diff'|'in-place'|'design-list', frontend: string[], backend: string[], other: string[], designOnlyPaths: string[] }

export function extractFrontendPayloadFields(filePath, content)
// → { fields: string[], fieldLines: Map<field, line>, urlsByCall: Array<{url, line}>, escapeHatch: boolean }

export function extractBackendFields(files, resolveTypeContent)  // 两趟扫描（Grill B-4 签名修正）
// files = 分类面 backend 文件集 [{path, content}]
// resolveTypeContent(typeName) → string|null（二趟全仓类定义解析回调——由调用侧传 readdirSync+grep 闭包）
// → { entityFields: string[], endpoints: Array<{path, method, requiredFields: string[], bodyFields: string[]}>,
//     escapeHatchCount: number, nonJavaSkipCount: number }

export function comparePayloadFields(frontendByFile, backendEndpoints, backendAllFields)
// → { driftWarnings: [{file, line, field}], missingRequiredWarnings: [{endpoint, method, field, frontendFiles}],
//     escapeHatchCount, nonJavaSkipCount }
```

生命周期契约：不涉及生命周期契约。

数据模型：无（纯探针逻辑，无 facts/schema/DB 变更）。

## 兼容策略（brownfield 必填）

- **非 Java 前后端变更**：direct-compare 子段渲染「跳过注记」（非 Java 后端 J 文件），零 warning 零阻断
- **无前端消费面的变更**（纯后端/纯 CLI）：子段渲染「无前端面」注记
- **design 契约面既有对账**：零改动（代码直比为新增维度并行存在）
- **escape hatch**：`probe8-skip` 文件级跳过（probe9 先例）
- **回退**：direct-compare 子段 = 探针渲染面一个 if 块（删除即回退）；diff 源 = collectProbe8DiffFiles 返回 design-list 源即回退
- **不改变**：facts schemaVersion、结论枚举、probe8 既有 design 契约面对账语义、probe1-7/9 语义

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | 前端提取正则假阳（动态字段名 obj[key]/计算属性/spread 不可枚举） | P2 | advisory 档不阻断+escape hatch；命中统计攒证（D-004） |
| R-02 | 后端必填提取假阴（自定义校验框架/AOP 切面不识别） | P2 | 三形态宽收宁多勿漏；漏报侧 advisory 可接受（运行时兜底归批次 C smoke） |
| R-03 | 前端框架 DSL 差异（React hooks/Composition API/原生 DOM） | P2 | 按后缀选匹配族+未识别模式跳过注记；核心场景（formData/payload/DTO 字面量）覆盖 |
| R-04 | diff 源在并行会话场景下不稳定（HEAD~1 语义依赖最近提交） | P3 | fallback 链三态（worktree→in-place→design-list）；diff 不可用即降级不崩 |
| R-05 | probe8 文件膨胀 | P3 | 提取函数独立区块+注释锚定；膨胀 >500 行再拆独立文件 |
| R-06 | in-place 模式 porcelain 共享脏窗口污染（并行会话文件混入分类面） | P2 | advisory 档不阻断+命中统计攒证；文件分类面可肉眼复核 |
| R-07 | 结构性全量假阳（变更不动实体 → backendAllFields 若仅 diff 面则空） | P1 | **已修**：二趟全仓 DTO/实体解析兜底（Grill B-7）——backendAllFields=全仓引用链并集 |
| R-08 | 非请求区对象键污染（宽口径 DTO 字面量键假阳） | P2 | **已修**：请求调用邻近窗口口径（Grill B-5 对齐现行先例） |

## 决策追踪

| 决策 | 覆盖点 | 状态 |
|---|---|---|
| D-001@v1 | 总体方案 §1 + FR-01 | 已覆盖 |
| D-002@v1 | 总体方案 §2 + FR-02 | 已覆盖 |
| D-003@v1 | 总体方案 §2 必填三形态 + FR-02 | 已覆盖 |
| D-004@v1 | 总体方案 §3 + FR-03 | 已覆盖 |
| D-005@v1 | 非目标 | 已覆盖 |
| D-006@v1 | 总体方案 §2 实现位置 + FR-02 | 已覆盖 |

无未解决决策；剩余风险见 R-01~R-08（R-01/R-02 攒证轮；R-07/R-08 已在 design 内修正，实现期须兑现）。

## 自审

- [x] 章节齐全（背景/设计目标/非目标/总体方案/文件变更清单/接口定义/风险登记）
- [x] frontmatter 字段齐全（author/created_at/scale/risk_level）
- [x] 引用所有当前版本 D-xxx@vN（D-001~D-006 六条全覆盖）
- [x] 生命周期关键词豁免短语已写（「不涉及生命周期契约」，紧邻格式）
- [x] UI 原型分级核对：纯 CLI 探针逻辑无界面变化——跳过（Step 5 已向用户声明且确认）
- [x] 无自审存疑项（probe8 现行代码面经归档变更+批次 C 已多次实证；三提取函数均为新增零既有签名变更）
