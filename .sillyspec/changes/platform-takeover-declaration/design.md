# 设计文档（Design）— 平台接管声明机制

---
author: agent (Claude) + 用户
created_at: 2026-08-15
updated_at: 2026-08-15
scale: large
status: confirmed（用户已确认方案 A；Grill v2 修订完成）
---

---

## 1. 背景

SillySpec 平台模式下，项目的进度真相源在平台 specRoot。恢复链路依赖项目根两个落盘物：

1. `<cwd>/.sillyspec-platform.json`（恢复指针）
2. `<specRoot>/.runtime/platform-scan.json`（主文件）

当前 fail-closed 保护**不对称**：

| 场景 | 现状行为 | 后果 |
|---|---|---|
| 指针**存在但坏**（损坏/缺 specRoot/不可达） | `resolvePlatformSpecDir` 抛 `PointerUnreachableError`，顶层 catch 引导 + exit 1（`src/progress.js:68-101`） | ✅ fail-closed |
| 指针**该在但不在**（`platform pointer --cleanup` 误删 / 24h STALE 清理 / 项目挪目录 / 写入静默失败） | 视为"纯本地项目"静默走 `resolveSpecDir(cwd)`（`src/progress.js:71-73`） | ❌ **静默建本地进度库**，与平台库分裂，零报错 |

后者是 `sillyspec-state-split-platform-mode` 记录的分裂（本地 42 vs 平台 3 changes 零交集）的直接成因。ql-20260815-004 已消除 init→scan 窗口期断点，本变更根治"指针丢失后"的断点。

## 2. 设计目标

- G1：项目进入平台模式这一**事实**有独立于指针的持久证据（声明文件）。
- G2：指针丢失 + 声明存在 → fail-closed 报错 + 恢复引导，不静默建本地库。
- G3：纯本地项目（从未平台接入）零行为变化。
- G4：声明不随指针 24h STALE 过期——它是"项目归谁管"的事实，非"scan 会话状态"。
- G5：逃生口：显式 `--spec-dir` / `--spec-root` 不受影响（与 `PointerUnreachableError` 逃生口语义一致）。
- G6：幂等、agent 可执行、不自动删数据（doctor 修复三原则）。

## 3. 非目标

- 不做本地→平台 migration/merge（P2 另行，ROADMAP 登记项）。
- 不改 24h STALE 指针清理策略本身。
- 不做网络验证（daemon 不可达不阻断 CLI——离线可用硬约束）。
- 不保护"从未接入平台"的项目（无声明 = 无义务）。

## 4. 拆分判断

单 change 不拆分：改动收敛在 4 个源码文件（shared/progress/sync/doctor-diagnostics）+ 1 测试 + 2 文档，全部围绕一个机制（声明文件），拆开会引入中间态不一致（如先写声明后加检查 = 空声明无保护期）。走标准流程（brainstorm→plan→execute→verify→archive），非 quick（多命令入口 + 新错误类 + 诊断信号，超 3 文件）。

## 5. 总体方案

### 5.1 声明文件

路径：`<项目根>/.sillyspec-platform-managed`（与指针同目录，不进 `.sillyspec/` 不污染源码结构）

```json
{
  "managed": true,
  "specRoot": "C:/.../daemon/specs/<id>",
  "workspaceId": "ws-1",
  "declaredAt": "2026-08-15T15:00:00.000Z"
}
```

- `managed: true`：语义开关。`false`/缺字段 = 声明无效，按无声明处理。
- `specRoot`：接管时平台 specRoot 的**副本**——指针丢了也能告诉用户"你原来归哪管"，报错引导直接打印。
- **无过期机制**：声明不因时间被自动清理。### 5.2 写入点（Wave 1）

`src/run/shared.js` 的 `writePlatformPointer`（ql-20260815-004 抽出的双写 helper）扩展为**三写**：

1. `<specRoot>/.runtime/platform-scan.json`（主文件，不变）
2. `<cwd>/.sillyspec-platform.json`（恢复指针，不变）
3. `<cwd>/.sillyspec-platform-managed`（**新增**，init（active）与 scan 都写）

选此点：init / scan / 任何 run 命令带平台参数最终都收敛到 `writePlatformPointer`，一处扩展全链路生效无旁路。

### 5.3 读取点（Wave 1）——两个入口都要堵

**入口一：`resolvePlatformSpecDir`（`src/progress.js`）** 在"指针不存在"分支（现 L71-73 静默走本地）插入声明检查：

```
指针不存在 →
  声明存在且 managed=true → 抛 PlatformManagedError（fail-closed）
  声明不存在/无效 → 纯本地项目，走 resolveSpecDir(cwd)（现状不变）
```

**入口二（Grill P0 修正）：`runCommand` 指针恢复链（`src/run/command.js` L283-316）**。该链独立 `existsSync(platformPointer)` 读指针、不经 `resolvePlatformSpecDir`——指针缺失+声明存在时会静默 `resolveSpecDir(cwd)` 落本地。run/quick/scan/全部 stage 别名命令都走这条路，只堵入口一则 G2 在最高频路径失效、且与 progress/status/doctor（入口一）行为分裂。修法：恢复链在读不到指针与 platform-scan.json 后、`specBase` 兜底 `join(cwd, '.sillyspec')` 前，查声明文件——存在且 managed=true → `process.exit(1)` 并打印与 `PlatformManagedError` 相同的引导文案（此处在 CLI 层，直接 exit 与既有 fail-closed 风格一致，不抛跨层异常）。

`PlatformManagedError extends PointerUnreachableError`：**不覆写 `this.name`**（顶层 catch 按 `err?.name === 'PointerUnreachableError'` 严格字符串匹配，index.js L1790；子类改名会落通用分支打 stack noise）——错误 message 首行标注"平台接管声明"以区分。

### 5.4 删除点（Wave 2）

- `platform disconnect`（`src/sync.js`）**同时删指针与声明**（Grill P1 修正：现状 disconnect 只删 local.yaml platform 段不删指针——指针健在时 `resolvePlatformSpecDir` 仍解析平台 specRoot，"disconnect 后恢复本地"不可能达成）。断开连接的语义 = 脱离平台 = 三清（local.yaml 段 + 指针 + 声明）。
- `platform pointer --cleanup`（含 STALE）只删指针不删声明；cleanup 输出补提示"彻底脱离平台请用 platform disconnect"。

### 5.5 诊断信号（Wave 2）

doctor D2 扩展 `pointer_missing_but_managed`：声明存在+指针缺失，只读诊断项（非阻断）。

### Wave 划分

- **Wave 1（机制主体）**：三写 + 声明检查 + 测试主体——单独可验收（FR-01/02/03/05）。
- **Wave 2（退出与诊断）**：disconnect 删声明 + cleanup 提示 + doctor 信号 + 文档同步（FR-04/06 + T6）。

## 6. 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/run/shared.js | `writePlatformPointer` 扩展三写（+声明）；新增 `PLATFORM_MANAGED_FILENAME` 导出常量 + `checkPlatformManaged(cwd)` 读侧 helper（读声明、返回 {managed, specRoot} 或 null）。数据流：producer=writePlatformPointer（init/scan 调用）→ 落盘 `.sillyspec-platform-managed` → consumer=progress.js `resolvePlatformSpecDir` 与 command.js 恢复链（读侧校验）+ doctor-diagnostics.js（诊断读） |
| 修改 | src/progress.js | `resolvePlatformSpecDir` 无指针分支插入声明检查（调 checkPlatformManaged）；新增 `PlatformManagedError extends PointerUnreachableError`（不覆写 name）。数据流：producer=声明文件（shared.js 写）→ consumer=resolvePlatformSpecDir 读 `managed`/`specRoot` 字段 → 抛错文案引用 specRoot 副本 |
| 修改 | src/run/command.js | **（Grill P0）** 指针恢复链（L283-316）在两文件皆缺失、specBase 兜底本地前查 `checkPlatformManaged`，命中 → exit 1 + 引导文案。consumer=checkPlatformManaged |
| 修改 | src/sync.js | `platform disconnect` 三清：local.yaml platform 段 + 指针 `.sillyspec-platform.json` + 声明 `.sillyspec-platform-managed`（Grill P1） |
| 修改 | src/index.js | `platform pointer --cleanup` 输出补提示"彻底脱离平台请用 platform disconnect" |
| 修改 | src/doctor-diagnostics.js | D2 扩展 `pointer_missing_but_managed` 信号（调 checkPlatformManaged，诊断读 consumer） |
| 新增 | test/platform-managed-declaration.test.mjs | 七场景：三落盘/无指针+声明 fail-closed（两入口各测：resolvePlatformSpecDir 直测 + runCommand CLI 子进程）/无声明走本地/disconnect 三清/--spec-dir 逃生口/幂等 |
| 修改 | docs/sillyspec/file-lifecycle.md | 登记新运行时文件类型 |
| 修改 | docs/sillyspec/platform-interface-map.md | 指针章节补声明机制（doc-ref-check 同步） |
| 修改 | .claude/skills/sillyspec-doctor/SKILL.md（如涉及） | doctor 新诊断项说明 |

（无对外接口/DTO/事件 payload/配置键新增——声明文件是 CLI 私有落盘物，producer→consumer 均在仓内。）

## 7. 接口定义

```js
// src/run/shared.js
export const PLATFORM_MANAGED_FILENAME = '.sillyspec-platform-managed';
// writePlatformPointer(cwd, platformOpts, extra) 签名不变；行为从双写变三写
export function checkPlatformManaged(cwd)
// 读 cwd 下声明文件，返回 { managed: true, specRoot, workspaceId, declaredAt } 或 null
// （文件不存在 / JSON 损坏 / managed 非 true → 一律 null，读侧宽容不抛错）

// src/progress.js
export class PlatformManagedError extends PointerUnreachableError {
  // constructor({ declarationPath, specRoot }) —— pointerPath 字段置 declarationPath
  // ⚠️ 不覆写 this.name（顶层 catch err?.name === 'PointerUnreachableError' 严格匹配，index.js L1790）
  // message 首行"平台接管声明生效"以区分父类场景
}
// resolvePlatformSpecDir(cwd, explicitSpecDir) 签名不变；新抛 PlatformManagedError

// src/run/command.js（恢复链封堵，Grill P0）
// 指针与 platform-scan.json 皆缺失后、specBase 兜底 join(cwd,'.sillyspec') 前：
// const decl = checkPlatformManaged(cwd); if (decl) { 打印引导; process.exit(1) }
```

## 7.5 生命周期契约

不适用 lifecycle contract：本变更是静态落盘文件 + 读取时校验，不涉及 session/lease/agent_run/daemon 事件流或状态机迁移。

## 8. 数据模型

新文件 `.sillyspec-platform-managed` JSON schema（见 §5.1）。无数据库表结构变更。

## 9. 兼容策略（brownfield）

- **未配置新功能时行为不变**：无声明文件的项目（存量本地项目 + 存量平台项目指针健在）完全不受影响——声明检查只在"指针不存在"分支生效。
- **存量平台项目**：指针健在时声明从未被写也不影响（fail-closed 原路径已覆盖指针坏场景）；下次任何带平台参数的命令（scan/init/run）会补写声明，渐进覆盖。
- **回退路径**：删除声明文件即回退到现状行为（本地模式）；`platform disconnect` 是显式回退命令。
- **不改变的 API/表结构**：`writePlatformPointer` / `resolvePlatformSpecDir` 签名不变；SQLite schema 不动；`PointerUnreachableError` 既有行为不动。

## 10. 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | 测试 fixture 污染：tmpdir 旧测试项目残留声明 → 后续测试误触发 fail-closed | P1 | 测试 setup/teardown 强制清理；仿 run-tests.mjs `cleanHomePointer` 模式 |
| R-02 | 用户手动删项目根文件连声明一起删 | P2 | 声明在项目根不在 `.sillyspec/` 内（避开整删）；真删了 = 回到现状静默本地，不劣化 |
| R-03 | `pointer --cleanup` 用户本意是彻底脱离平台但只删了指针 | P2 | cleanup 输出提示 disconnect 才是彻底路径；FR-02 报错文案亦写明 |
| R-04 | 多 worktree：worktree 内 cwd 无声明、主仓有 | P2 | 声明按 cwd 查，worktree 内无声明 = 走本地，与指针行为一致，不新增分裂 |
| R-05 | 声明 specRoot 副本与平台真实路径漂移（平台迁移后） | P2 | 声明只用于报错引导不做路径解析；引导让用户重跑 scan 重建 |

## 11. 决策追踪

- D-A@v1（用户确认）：选方案 A 项目根声明文件，否决 B db 侧标记（堵不住冷启动）与 C 网络验证（违背离线可用）。
- D-B@v2（Grill 修正）：声明检查双入口（resolvePlatformSpecDir + runCommand 恢复链）——单入口会被 runCommand 独立指针读取旁路，G2 失效。
- D-C@v2（Grill 修正）：disconnect 语义 = 三清（local.yaml 段+指针+声明）；只删声明不删指针则"恢复本地"不可达。
- D-D@v2（Grill 修正）：PlatformManagedError 不覆写 name，保顶层严格字符串 catch 命中。
- D-E@v2（Grill 修正）：声明字段收敛为 managed/specRoot/workspaceId/declaredAt 四字段（删 lastSeenAt——刷新时机无强需求，少一个字段少一处漂移；proposal 同步）。

## 12. 验收标准

1. `init --spec-dir <外部> --workspace-id x` 后：声明 + 指针 + 主文件三落盘。
2. 删指针保声明 → 任意 CLI 裸调 exit 1，报错含"平台接管"+ 三选项恢复引导。
3. 无声明无指针 → 行为与现状逐字节一致。
4. `platform disconnect` → 声明删除，裸调恢复本地模式。
5. `--spec-dir <路径>` 显式传参 → 不受声明影响。
6. `npm test` 全量绿 + lint 过 + doc-ref-check 过。
