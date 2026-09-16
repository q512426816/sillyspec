---
author: qinyi
created_at: 2026-09-16 20:12:00
scale: large
---
# 设计文档（Design）— verify 探针9：同实体守卫一致性检查

## 背景

2026-09-15 wp EHS 会话二次独立复核实证（探针8 立项同源事件）：verify 判 PASS WITH NOTES 后人工深挖 5 个 P1，其中 **doSubmit 越权**——同实体 `PolluteRpOrder` 的 `deleteOrder`（开立人∪管理员校验）、`withdraw`（同款）、`handle`（canHandle）守卫齐备，唯独 `submit` 全链无操作人校验，任何登录用户可提交他人开立单。此类「同资源 CRUD 守卫不一致」是编码式权限的典型漏洞形态：探针5 只对账 URL 存在性、探针8 只对账字段契约，**权限守卫面零机器覆盖**，完全依赖 verify 代码审查走查清单③的人工走查（EHS 里恰是走查盲区）。

## 设计目标

1. verify 探针族新增「探针9 守卫一致性」advisory：本变更改动的 .java 文件内，同实体变更方法组中**有守卫与无守卫方法并存**时产出 WARNING（含方法名与守卫信号证据）。
2. 编码式与注解式守卫信号并入同一信号集（D-001：EHS 栈是编码式，注解式作补充信号）。
3. advisory 口径起步（探针8 先例），agent 在 verify-result 逐条裁定；跑出实证再评估升硬门。

## 非目标

- 不做硬门（WARNING 不阻断）。
- 不做跨文件/跨类实体聚类（v1 单文件内聚类——跨文件实体归属静态不可靠）。
- 不做守卫语义正确性判断（只查「存在守卫调用模式」，不查校验逻辑对不对）。
- 不覆盖 .java 之外的语言（其他扩展名计数注记 skipped）。
- 不改探针 1-8 语义。

## 拆分判断

单一内聚能力（一个探针 + 一致性接线 + 测试），不拆分。

## 总体方案

### 1. 方法组聚类（`clusterMutationMethods`）

改动 .java 文件内提取方法（签名正则：`(public|private|protected)\s+[\w<>\[\],. ]+\s+(\w+)\s*\(`，方法体=签名行到下一签名/类结尾）。变更方法判定：方法名命中动词前缀集 `submit|delete|remove|withdraw|update|handle|confirm|reject|audit|save|cancel|approve`。实体名词抽取：方法名剥前缀动词后的尾段（`doSubmit`/`submitOrder`→Order；驼峰切词取名词段，首段大写保留）。**同实体组** = 同文件内实体名词相同（大小写归一）的变更方法集合；组内方法数 ≥2 才比对（单方法组 skipped）。

### 2. 守卫信号检测（`detectGuardSignals`）

方法体内（注释经掩码——复用端点提取器的 stripCommentsKeepLength 思路，在探针内实现等长掩码）检测四类信号：
- **当前用户比对**：`getCurrent|currentUser|getUserId|getLoginUser|ShiroUtil|SecurityContext|ThreadLocal` 类调用，或与 `createBy|create_by|openBy|userId` 的 `.equals(|==` 比较
- **角色判定**：`hasRole|isCompany|manager|Admin|Role\b` 出现在 if 条件形态（`if\s*\(.*信号.*\)`）或方法参数含 `manager|isAdmin` 布尔
- **能力类调用**：`canHandle|checkPerm|assert[A-Z]\w*(Perm|Auth|Owner|User)|validate.*User`
- **注解式**：方法签名前 3 行内 `@PreAuthorize|@RolesAllowed|@SaCheckPermission|@RequiresPermissions`

信号命中任一 → 该方法「有守卫」。阈值口径：单字符串子串会造成误报（如变量名含 manager）——v1 取「调用形态优先」（`xxx(` 或 `.equals(` 邻接），纯标识符出现仅作弱信号不计入（宁漏勿误，advisory 下漏检只是少提示）。

### 3. 比对与输出

组内有守卫方法与无守卫方法并存 → `inconsistentGroups: Array<{entity, guarded: string[], unguarded: string[], signals: Record<方法, 命中信号>}>`；全有/全无 → 不报。渲染段（`#### 探针 9：守卫一致性（advisory）`）逐组输出 + 口径注记（「存在性检查非语义审计；聚类启发式误报由 agent 裁定」）。facts metrics 计数三键。文件级豁免：文件首行 `// probe9-skip`。无 .java 改动文件 → 不适用注记。

### 4. 一致性抽查接线（对齐 probe8 先例）

verify-postcheck `checkProbeConsistency` 纳入 probe9 维度（WARNING 级环境敏感组）：预填段锚点正则（守卫不一致汇总行内 N 求和口径）+ facts 基线段计数对账。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/verify-probes.js | 探针9 实现：`clusterMutationMethods` / `detectGuardSignals` / `runProbe9GuardConsistency`（导出供测试）+ 渲染段 + facts metrics；fail-soft 包装（对齐探针8）。数据流：producer=runProbe9GuardConsistency（design 清单 .java 文件双根读取）→ 骨架预填段 → consumer=agent 裁定 + verify-postcheck 一致性抽查（WARNING 级） |
| 修改 | src/verify-postcheck.js | checkProbeConsistency 纳入 probe9 维度（WARNING 级，锚点正则+对账+facts 基线，对齐 probe8 接线先例） |
| 新增 | NEW:test/probe9-guard-consistency.test.mjs | 五用例（EHS doSubmit 案例缩小版 fixture，见测试与验收） |

## 接口定义

```js
// src/verify-probes.js 新增导出（既有导出面零变动）
clusterMutationMethods(sourceText)   // → Array<{entity: string, methods: Array<{name, startLine, endLine, body: string}>}>（组内 ≥2 方法才成组）
detectGuardSignals(methodBody, signatureContext) // → string[]（命中的信号类别列表；空=无守卫）
runProbe9GuardConsistency({ specBase, cwd, wtRoot, changeName })
// → { applicable, javaFileCount, groupCount, inconsistentGroups: Array<{entity, guarded, unguarded, signals}>, notes: string[] }
```

## 测试与验收

`test/probe9-guard-consistency.test.mjs` 五用例（fixture=EHS 缩小版临时仓）：

1. **不一致命中**：Java 文件含 Order 实体的 submit（无守卫）/deleteOrder（含 `userId.equals(order.getCreateBy())`）/withdrawOrder（含 canHandle 调用）→ inconsistentGroups 含 Order 组，unguarded 含 submit、guarded 含两方法及信号类别
2. **全守卫零告警**：组内三方法全部含守卫信号 → inconsistentGroups 空
3. **单方法组 skipped**：同文件只有一个变更方法 → 不成组，groupCount=0 + 注记
4. **注解式信号命中**：方法带 @PreAuthorize → 判有守卫；同组无注解方法 → 不一致命中（信号类别=注解式）
5. **非 Java 与豁免**：改动集仅 .js → 不适用注记；Java 文件首行 `// probe9-skip` → 整文件跳过

验收：五用例全绿 + npm test 全量 0 失败 + lint 过；骨架含探针9 段且不适用时注记不空段。

## 风险登记

| # | 风险 | 应对 |
|---|---|---|
| R-01 | 实体聚类启发式错组（前缀动词误判/实体名词抽取错） | 宁漏勿误（≥2 方法才成组）+ advisory 裁定兜底；错组顶多漏报或少报 |
| R-02 | 守卫信号误报（标识符恰含 manager/Admin 等词） | v1 只认调用/比较形态（弱信号不计入）；注释掩码防文档示例 |
| R-03 | 方法体提取跨签名边界错切 | 签名正则限定访问修饰符开头；fail-soft 单文件异常跳过 |
| R-04 | 大文件性能 | 只扫 design 清单 .java 文件（非全仓），单遍正则 |

## 自审（Self-Review）

- 与 D-001@v1 一致：同实体组比对 + advisory + 注解并入信号集。
- 文件清单 3 条：2 修改 + 1 NEW: 前缀；接线点真实（checkProbeConsistency probe8 先例 :3081-3094（审查校准） 同构）。
- 非目标圈住 scope（不做语义审计/不跨文件/不升硬门）。
- 生命周期契约表：不涉及 session/lease/lifecycle 关键词，省略。
