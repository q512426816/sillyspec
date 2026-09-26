---
author: qinyi
created_at: 2026-08-16T21:08:20+08:00
updated_at: 2026-08-16T21:08:20+08:00
---

# 需求规格（Requirements）

## 角色

| 角色 | 说明 |
|---|---|
| 维护 agent | 跑 `sillyspec scan diff` 获取漂移清单，按清单定点补文档 |
| scan-diff 命令 | CLI 纯算漂移清单（只读，零 token） |
| 既有机制 | scan-staleness（提示）/ docs-check（引用校验）/ module-map v2（归模块） |

## 功能需求

### FR-01: scan diff 四分类漂移清单
Given scan 文档有 source_commit 且源码有漂移
When 跑 `sillyspec scan diff`
Then 输出新增（A→缺文档）/删除（D→多文档）/变更重命名（M/R/C→过时）/未归模块（unmapped）四分类清单，归模块（matchFilesToModules）

### FR-02: 默认基线 source_commit
Given scan 文档 frontmatter 有 source_commit
When 不指定 --base
Then 用 source_commit 作 diff 基线；无 source_commit → 提示绿地/旧版退出

### FR-03: --base 守卫
Given 用户指定 --base <commit>
When commit 无效或非当前分支祖先
Then isAncestor 守卫拦截：无效 → 报错；非祖先 → 明确警告（防静默全树 diff）

### FR-04: --report 落盘
Given 用户加 --report
When scan diff 计算完成
Then 落盘 specBase/docs/<project>/scan/scan-diff-report.md（与 scan 文档同目录）

### FR-05: 接线与旁路
Given `sillyspec scan diff`（裸 token）
When index.js case 'scan' 拦截 filteredArgs[1]==='diff'
Then 转发 scan-diff，**跳过 triggerPullActiveChange**（纯只读不触发网络 pull）；`run scan --diff` 等价路径经 command.js flag

### FR-06: 无漂移与聚合
Given 无漂移
When scan diff 完成
Then 输出"scan 文档与源码一致（0 漂移）"退出 0；有漂移缺省按模块聚合计数 + --full 展开

## 非功能需求

- 兼容性：复用 parseSourceCommit/matchFilesToModules/safeGit，零新依赖；Windows 路径 POSIX 归一
- 可回退：新命令无副作用（纯只读），回退=移除入口
- 可测试：computeScanDiff 纯函数（git 依赖可 mock）+ CLI 集成
- 约束：diff 分支不触发网络 pull；默认范围 = module-map paths 覆盖集（非 src/-only）

## 决策覆盖矩阵

无 decisions.md（Grill 无 P0/P1，P2 精修项已直接吸收进 design.md）
