---
name: sillyspec:scan
description: 用于扫描项目代码库，生成架构文档、代码约定、目录结构等。适合用户说"扫描项目、分析代码库、生成文档、scan"。产出 7 份扫描文档 + 模块映射。
---

## 何时使用

- 用户说"扫描项目、分析代码库、生成文档、scan"
- 棕地项目首次接入 sillyspec，生成架构/约定/结构等基础文档
- 产出 7 份 scan 文档（PROJECT/ARCHITECTURE/CONVENTIONS/STRUCTURE/INTEGRATIONS/TESTING/CONCERNS）+ 模块映射

## 多变更说明

scan 是辅助阶段，通常不需要 `--change`。但项目有多个活跃变更时，所有 `sillyspec run` 命令加 `--change <变更名>` 可指定操作目标。

## 步骤生命周期（所有阶段通用）

> `sillyspec scan` 是 `sillyspec run scan` 的顶层别名，两者等价。

```bash
sillyspec run scan                             # 输出当前步骤 prompt
sillyspec run scan --done --output "摘要"      # 完成当前步骤
sillyspec run scan --status                    # 查看阶段进度
sillyspec run scan --skip                      # 跳过可选步骤
sillyspec run scan --reset                     # 重置阶段（从头开始）
```

## 通用参数（所有阶段适用）

| 参数 | 说明 |
|---|---|
| `--spec-dir <path>` | 指定规范目录（默认 `<项目>/.sillyspec`） |
| `--non-interactive` | CI/脚本下禁用交互式 prompt |
| `--skip-approval` | 跳过阶段转换/审批检查（不能跳产物校验 gate——review.json/文档产物硬校验仍在） |

## scan 特有参数

| 参数 | 说明 |
|---|---|
| `--quick` | 强制 quick profile（快速接入，仅 4 份核心文档，0 子代理） |
| `--standard` | 强制 standard profile（压缩步骤，最多 1 子代理） |
| `--deep` | 强制 deep profile（完整流程，不按规模裁剪） |
| `--force-rescan` | 覆盖已有 scan 文档的保护（默认覆盖需 source_commit/updated_at 匹配） |
| `--diff` | 增量漂移清单：`sillyspec scan diff`（或 `--diff` flag）算 source_commit..HEAD 的 A/D/M/R 四分类漂移，按 module-map paths 归模块，agent 据此定点补文档而非全量重扫（2026-08-16） |
| `--incremental` | 显式请求增量模式（2026-11-14）：探测不可行时警告留痕+回退全量，不 exit 非 0 |
| `--force-incremental` | 越过软门（漂移 >100 文件 / 落后 >200 commit 默认建议全量）强制增量，warnings 留痕 |

### 增量模式（2026-11-14，默认自动判定）

scan 启动时 CLI 在入口层自动探测（quick/standard/deep 三档统一生效）：仓内有就绪 CodeGraph 索引（`.sillyspec-codegraph/`）且 scan 基线可用时**自动走增量路径**——启动输出「⚡ 增量路径」行（受影响模块清单/篇章重生成与跳过/对账未归属数，原因一次给全），计划落盘 `.sillyspec/.runtime/scan-incremental-plan.json`；四生成步骤按条件前缀注入段只处理受影响面（`docsToSkip` 篇章零触碰，模块映射增量更新，模块卡覆盖等待豁免），收口统一推进基线至 HEAD（增量后 staleness 判定 fresh）。对账报告 `docs/<project>/scan/_module-map-audit.md` 列出索引全量文件中未归属任何模块 paths 的盲区文件。

增量不可行（未装 CodeGraph/无索引/无基线/非祖先基线/quick 浅文档/软门超限）自动回退现行全量 scan——一行原因留痕，零行为回归。模块归属语义决策不做：索引只供结构事实，unmapped 新文件归属由 agent 补扫时判断。

### scanProfile（显式选择优先，否则按规模自动裁剪）

可用 `--quick` / `--standard` / `--deep` **显式指定 profile**（三档互斥，优先于自动判定）。
不带 flag 时 CLI 按源码规模自动选择：

| profile | 触发条件 | 行为 |
|---|---|---|
| quick | `--quick` 或 ≤30 文件 且 ≤80KB 且 ≤3 项目 | 3 步，0 子代理，4 份核心文档 |
| standard | `--standard` 或 ≤200 文件 且 ≤800KB | 压缩步骤，最多 1 子代理 |
| deep | `--deep` 或 大项目 | 完整流程 |

> **平台快速接入**：对大项目用 `sillyspec run scan --quick`（含平台参数 `--spec-root`/`--workspace-id`/`--scan-run-id`）只生成 4 份核心文档完成接入，后续 `sillyspec run scan --deep` 覆盖升级为完整 7 份。quick 文档 frontmatter 标 `scan_depth: quick`，深度扫描识别后允许覆盖。

### post-check

scan 完成时 CLI **按 profile 校验文档齐全**：quick 模式只要求 4 份核心文档（PROJECT/ARCHITECTURE/CONVENTIONS/STRUCTURE），standard/deep 要求完整 7 份。缺失会设状态为 `failed_post_check`，阻断进入主流程下游（brainstorm/plan 等），需修复后重跑 scan。quick 模式带一条 informational warning（`quick_profile_notice`），状态落 `completed_with_warnings`，不阻断完成。

## 阶段流转

```
(项目起点) → scan → brainstorm
```

scan 完成后，运行 `sillyspec run brainstorm "<需求>"` 开始具体变更的设计。

## 铁律

- **必须用 exec 工具（shell）执行 CLI，不要自己编造流程**
- 只做当前步骤 prompt 描述的操作，不跳过
- scan 文档写入 `{DOCS_ROOT}/scan/`（平台模式用占位符路径，不写裸 `.sillyspec/`）
- 完成后立即 `--done`，不跳过

## 用户指令
$ARGUMENTS
