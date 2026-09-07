---
author: qinyi
created_at: 2026-09-07T08:30:00+08:00
scale: large
---

# 设计文档（Design）— 端点 before/after 基线（变更级端点增删）

## 背景

P3d 立项时实证：contract-matrix 只有 provider 完成后的 endpoints.json 事后快照（src/contract-matrix.js extractProviderArtifact :184），无变更前基线——端点增删（archify Delta 的核心内容之一）无法计算，delta.md 只能在 `backendEndpoints>0` 时提示「独立立项」（P3d After 段条件行）。本变更补齐该机制。

可用基础设施：
- `src/endpoint-extractor.js`：FastAPI/Express/Spring 端点抽取（method/path/source:line）——verify 探针 5 与 scan facts 均消费，CLI 化成熟。
- `src/archive-delta.js`（P3d）：四源 fail-soft 聚合框架，扩第五源模式明确。
- P3a reconcile 的「基线快照 × 现算对比」同构先例（baseHash + diff）。

## 设计目标

1. **基线采集**：`sillyspec endpoints baseline --change <名>`——endpoint-extractor 现算主仓端点集，落 `.runtime/endpoint-baselines/<change>.json`（幂等：已存在不覆盖，首次跑=变更前状态；含 baseCommit/generatedAt）；execute Step 3 prompt 指引 agent 跑一次。
2. **增删计算**：`diffEndpointSets(baseline, current)` 纯函数——method+path 对集合运算 → { added, removed }（changed 视为 removed+added 对）。
3. **delta 消费**：archive-delta 增第五源——归档时现算当前端点 × 基线 → delta.md「端点增删」节（有基线时替换 P3d 的「独立立项提示」条件行）。

## 非目标

- 不改 contract-matrix（provider artifacts/endpoints.json/parity 零触碰——verify 探针 5 行为不变）。
- 不做跨仓端点基线（主仓 only，与 scan facts 口径一致）。
- 不做端点 schema/请求体对比（method+path 粒度，source 仅溯源展示）。
- 不做基线的 CLI 自动钩子（worktree create 时自动拍）——prompt 指引 + 幂等命令已够（agent 忘跑则 delta 无增删节，降级注记，fail-soft）。

## 拆分判断

单 change 小型：新模块 + CLI case + prompt 一行 + delta 扩源 + 测试。

## 总体方案

### Wave 1：基线与 diff 纯函数

**src/endpoint-baseline.js 新模块**：
- `captureEndpointBaseline({ cwd, changeName, runtimeRoot })`：endpoint-extractor 扫主仓（消费其既有导出与扫描口径——读源码确认入参形态）→ `{ schemaVersion: 1, change, baseCommit: <HEAD short>, generatedAt, endpoints: [{method, path, source}] }`；写 `<runtimeRoot>/endpoint-baselines/<change>.json`——**已存在 return {written:false, reason:'exists'}**（幂等不覆盖）；fail-soft（抽取异常返回错误对象不抛）。
- `diffEndpointSets(baselineEndpoints, currentEndpoints)`：`key = METHOD normalizePath(path)` 归一——method 大写 + **normalizePath（endpoint-extractor.js:372 生态既有：`:id/{plan_id}` → `{param}` 参数归一，diffApiParity :410 已套用，Gap-2）** + 去尾斜杠 → { added, removed }；**changed（同 path 参数改名等）不配对——md 渲染呈两条独立行（Gap-3 显式声明，防实现期发明配对）**；输入 null → null。

### Wave 2：CLI + prompt 指引 + delta 第五源

- **CLI**（index.js）：`endpoints baseline --change <名> [--spec-dir] [--json]`（endpoints 已有子命令族——`endpoints extract` 先例，照其 case 结构挂兄弟分支）；--json 输出 {command,change,ok,written,count,path}。
- **prompt 指引**（src/stages/execute.js Step 3 确认 worktree 路径）：操作清单加一行「涉及后端端点的变更：跑 `sillyspec endpoints baseline --change <change-name>` 拍变更前基线（幂等，已拍过跳过）——归档时用于计算端点增删」。
- **delta 第五源**（src/archive-delta.js）：collectDeltaSources 增 `endpointBaseline`（读基线文件，fail-soft null）与现算 currentEndpoints（capture 同口径抽取，不落盘）；buildDeltaReport 的 After 段：基线+现算可得 → 「端点增删」节（added/removed 表，空则「无增删」一行）；基线缺失 → 既有「独立立项提示」条件行改为「无基线（变更未拍 baseline）」降级注记——**门控保留 backendEndpoints>0（Gap-4：无端点变更不收噪音注记）；标题沿用「### 端点基线提示」防断言面扩大（plan 审查钉死）；test/archive-delta.test.mjs:296-298 旧提示断言随本变更更新至降级口径**。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 新增 | src/endpoint-baseline.js | captureEndpointBaseline + diffEndpointSets 纯函数 |
| 修改 | src/index.js | endpoints baseline 子命令 case |
| 修改 | src/stages/execute.js | Step 3 prompt 基线指引一行 |
| 修改 | src/archive-delta.js | 第五源采集 + After 段端点增删节 |
| 修改 | test/archive-delta.test.mjs | :296-298 旧提示断言更新至降级口径（plan 审查补） |
| 新增 | test/endpoint-baseline.test.mjs | 抽取/幂等/diff 归一/降级/delta 集成断言 |

**字段数据流标注**（新产物 endpoint-baselines/<change>.json）：producer = CLI（endpoints baseline 命令，agent 按 execute Step3 指引触发）→ 归一化 = diffEndpointSets 的 key 归一（method 大写/去尾斜杠）→ consumer = archive-delta 第五源（归档时现算对比）。contract-matrix/verify 探针不消费该文件（零触碰）。

## 接口定义

```js
// src/endpoint-baseline.js
captureEndpointBaseline({ cwd, changeName, runtimeRoot }) // → { written: boolean, reason?, count?, path?, error? }
diffEndpointSets(baselineEndpoints, currentEndpoints)     // → { added: [{method,path,source}], removed: [...] } | null
// CLI: sillyspec endpoints baseline --change <名> [--spec-dir] [--json]
```

## 生命周期契约表

不涉及生命周期契约（基线快照与集合运算，无 session/lease/状态机语义）。

## 数据模型

无 DB schema 变更。新产物 endpoint-baselines/<change>.json（schemaVersion 1）。

## 兼容策略（brownfield 必填）

- 存量变更（无基线）：delta After 段降级注记（原「独立立项提示」行为被「无基线」注记替代——P3d 行为微调，明确记录）。
- 无后端端点的变更（抽取空集）：基线照拍（空集 diff 空增删，语义正确）。
- endpoints 命令族既有行为零改动（extract 子命令不动）。

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | endpoint-extractor 扫描口径与消费方不一致（scan facts vs verify 探针 5 的路径根差异） | P1 | 读两处消费代码定口径（以 scan facts 的 cwd 相对为基线口径，source 展示用）；diff 只依赖 method+path 不依赖 source 一致性 |
| R-02 | 归档时现算与基线抽取的环境差异（如未提交改动） | P2 | 现算与 capture 同口径同函数（复用不重写）；fail-soft |
| R-03 | agent 忘跑基线 → delta 无增删节 | P2 | 降级注记明确提示；下个变更起点指引仍在 |

## 决策追踪

| 决策 | 覆盖点 | 状态 |
|---|---|---|
| D-001@v1（幂等基线+第五源消费） | 总体方案全节、接口定义 | 全覆盖 |

无未解决决策。

## 自审

- 章节齐全 ✓；frontmatter ✓；中文标题 ✓；豁免短语紧邻 ✓；D-001 引用 ✓；数据流标注 ✓；原型跳过 ✓
- ⚠️ 自审存疑 1：R-01 的抽取入参形态（endpoint-extractor 导出签名）实现期以源码为准。
