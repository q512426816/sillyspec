---
author: qinyi
created_at: 2026-08-15 22:35:00
updated_at: 2026-08-16T15:49:15+08:00
status: design-draft（整合评估，供裁决）
---

# 文档债信号源整合设计稿：三源一屏 + 修复闭环

> 背景：2026-08-15 一天内落地三个文档债事实信号源 + quick 两类 hint，全部符合第六节"CLI 算事实注入"原则。本稿评估整合机会，供用户裁决。

## 一、现状盘点（四源各自为政）

| 信号源 | 位置 | 触发点 | 输出形态 | 覆盖债类型 |
|---|---|---|---|---|
| docs-debt | src/docs-debt.js | execute Wave prompt `{DOCS_DEBT}` | 一屏模块欠账（behind/untracked） | 模块卡落后源码 |
| docs check | src/docs-check.js | 手动 CLI / quick --done（docsCheckHint） | 失效 file:line 引用清单 + 建议行号 | 文档引用漂移 |
| scan-staleness | src/scan-staleness.js | brainstorm step2 `{SCAN_STALENESS}` | 一行落后事实（needs-refresh=建议核对/重扫） | 文档失效由 docs check 判 |
| docSyncHint（D-8） | src/run/shared.js | quick --done 审计 | 一行"未同步模块文档" | quick 改动零文档 |

四源共享的底层能力：git 事实读取（safeGit）、`_module-map.yaml` 解析（parseModuleMapSimple，CRLF 已修）、token/路径启发式。**但互不引用**——docs-debt 不知道 docs check 的建议行号，docsCheckHint 不用 docs-debt 的归属逻辑。

## 二、整合机会（按价值排序）

### O-1 quick docSyncHint 复用 computeDocsDebt 归属（小，推荐）

现状 docSyncHint 只判断"改了源码没动文档"二元信号，不说**哪个模块**欠了。quick --done 时调 `matchFilesToModules`（纯函数，零额外 git 调用——quick 场景 changedFiles 已在手）把欠账从"N 个文件"升级为"N 个文件 → 模块 X/Y 卡片落后"：

```
📝 文档欠账标记（D-8）：本次 3 个源码文件改动未同步任何模块文档。
   涉及模块：runtime（卡片停 43d4531，源码已推进）· stages（卡片从未提交）
```

- 规模：小（shared.js 审计内 ~15 行 + 测试）
- 风险：低（纯函数复用，quick 审计多一次 map 读）
- 价值：quick（72% 流量）的欠账信号从"有没有"升级为"欠在哪"

### O-2 [docs-debt] 块内联失效引用建议行号（中，推荐）

docs-debt 块目前只说"卡片落后 N commit"，agent 仍要自己找改哪里。docs check 的 `suggestLines`（2525a5e 刚加）已能算 token 命中行——在 computeDocsDebt 的 facts 渲染时对欠账模块的卡片 doc 跑一次 docs check 层1，把失效引用 + 建议行号内联进块：

```
  - runtime：源码 3 commit 未同步卡
    卡内失效引用：`src/db.js:17`（实际 symbol 在 23）· 2 处
```

- 规模：中（docs-debt.js 渲染层调 runDocsCheck 单文档 + suggest）
- 风险：低（advisory 链上叠 advisory；性能：每欠账模块一次单文档校验）
- 价值：agent 从"知道欠账"到"知道改哪行"——修复闭环最后一步

### O-3 统一信号总线（大，暂不推荐）

抽 `src/docs-signals/` 总线模块，四源注册 emitter，各阶段按需订阅。收益是架构纯度，成本是重构四源 + 全部调用方。**试金石检验**：这是"计算逻辑重组"不是新事实——在 O-1/O-2 落地后总线收益进一步缩小。**暂缓**，等出现第五个信号源或跨源去重需求（同一欠账被 docs-debt 和 docsCheckHint 重复报）再议。

### O-4 verify --done 汇总一屏（中）

verify 完成时（archive 前）把四源信号汇总成最终账单：本变更产生的模块卡欠账 / 修复的引用数 / 遗留 skip。给 archive 的 sync-module-docs 步提供精确工作清单。价值真实但可等 O-1/O-2 先行（它们的输出自然汇入）。

## 三、发现的缺陷（顺手登记）

| # | 缺陷 | 影响 | 归属 |
|---|---|---|---|
| F-1 | `docs check --suggest`（2525a5e）flag 未被 CLI 分支识别（无值 flag 落入 docsCheckFlags 被当文档路径报"不存在"）| 建议行号功能 CLI 主路径不可用（仅 --json 场景内联）| 并行 session 活跃工作，未抢改——待其收尾后 quick 修（分支内加 `--suggest` 单值 flag 识别）|
| F-2 | quick docsCheckHint 只扫 changedFiles 中的 .md，`docs check --suggest` 全量跑不了 | 无（by design，D-6 后续已声明"只归因本次不扫存量"）| 非缺陷 |

## 四、推荐裁决

1. **O-1 + O-2 排下一个完整流程变更**（规模合计 medium，单一主题"欠账信号从有到准"）
2. O-3 暂缓（试金石：无新事实，纯重组）
3. O-4 等 O-1/O-2 落地后评估
4. F-1 待并行 session 收尾后 quick 修
