---
id: task-02
title: progress.js — resolvePlatformSpecDir 声明检查 + PlatformManagedError
title_zh: progress.js — 入口一声明检查 + PlatformManagedError
author: qinyi
created_at: 2026-08-15T15:50:00+08:00
priority: P0
depends_on: [task-01]
blocks: []
allowed_paths:
  - src/progress.js
expects_from:
  task-01:
    - contract: check-platform-managed
      needs: [managed, specRoot]
goal: |
  入口一 fail-closed：resolvePlatformSpecDir 无指针分支查声明，
  命中 → 抛 PlatformManagedError（含原 specRoot + 三选项恢复引导）。
implementation: |
  改 src/progress.js：
  1. 新增 export class PlatformManagedError extends PointerUnreachableError：
     constructor({declarationPath, specRoot})，super message 首行"平台接管声明生效"，
     pointerPath 字段置 declarationPath。
     ⚠️ 不覆写 this.name（顶层 catch err?.name === 'PointerUnreachableError' 严格字符串匹配，
     index.js 顶层；子类改名会落通用分支打 stack noise —— D-D@v2）。
  2. resolvePlatformSpecDir 的 !existsSync(pointerPath) 分支：
     const decl = checkPlatformManaged(cwd)（import 自 './run/shared.js'，该 import 已存在）；
     decl 非 null → throw new PlatformManagedError({declarationPath: join(cwd, PLATFORM_MANAGED_FILENAME), specRoot: decl.specRoot})；
     错误文案含三选项：①重跑平台 scan/init（带 --spec-root）重建指针 ②不再使用平台：sillyspec platform disconnect（删除声明）③显式 --spec-dir <路径> 临时指定。
  3. 显式 explicitSpecDir 首行短路不变（FR-05 逃生口）。
acceptance: |
  - 删指针保声明 → resolvePlatformSpecDir 抛 PlatformManagedError（name 仍为 'PointerUnreachableError'）
  - 错误 message 含"平台接管声明生效"+ 原 specRoot + 三选项
  - 无声明无指针 → 走 resolveSpecDir(cwd) 行为不变
  - 显式 --spec-dir → 不查声明直接 resolve（逃生口）
verify: |
  场景②（task-06）：tmpdir 项目 init 平台模式 → 删指针 → resolvePlatformSpecDir 直测 expect throw；
  err.name === 'PointerUnreachableError' 断言（顶层 catch 命中证明）。
constraints: |
  - 只改 src/progress.js；PointerUnreachableError 既有行为不动；只动无指针分支
---
# task-02: 入口一 fail-closed
## 目标
见 frontmatter goal（D-B@v2 双入口之一 / D-D@v2 name 约束）。
## 验收
见 frontmatter acceptance。
