---
author: qinyi
created_at: 2026-06-01T09:05:00
updated_at: 2026-08-24T00:40:00+08:00
---

# setup
> 最后更新：2026-08-23
> 最近变更：2026-08-23-adopt-harness-practices（test_strategy 枚举扩 skip/evidence-auto + 新 live 键 decisions.behind_threshold）/ 2026-08-16-scan-docs-reconcile（config-schema/local-detect 补录归属；migrate.js 归属已划 migration 卡）
> 模块路径：src/init.js, src/setup.js, src/config-schema.js, src/local-detect.js（migrate.js 归 migration 卡）

## 职责
项目初始化、工具配置安装和文档迁移 — 负责 SillySpec 的首次设置和环境准备。

## 当前设计

setup 模块由三个文件组成，分别处理 SillySpec 生命周期的不同阶段：

**init.js** 是项目初始化入口，由 `cmdInit()` 和 `getVersion()` 两个导出函数组成。cmdInit 负责在目标项目中创建 `.sillyspec/` 目录结构，检测用户使用的 AI 工具（claude/cursor/openclaw/codex/gemini/opencode），通过交互式 inquirer 选择工具，复制对应的 skills 和配置文件。getVersion 从 package.json 读取版本号。

**setup.js** 负责工具运行时的 MCP（Model Context Protocol）服务器配置和全局工具安装。cmdSetup 函数扫描可用的配置路径（Claude Code、Cursor 等），检测已安装的 MCP 工具，提供交互式安装界面。它管理三类工具：MCP_TOOLS（MCP 服务器）、DB_MCP_TOOLS（数据库相关 MCP）、GLOBAL_TOOLS（全局 CLI 工具）。

**migrate.js** 提供文档迁移功能，migrateDocs 函数处理旧版本 SillySpec 的文档结构迁移，包括项目配置 YAML → SQLite、代码库文档、知识库文档、快速日志等格式的转换。

**config-schema.js** 是 local.yaml 配置键的单一数据源（LOCAL_YAML_SCHEMA 集中全部已知键 + 生效状态 + 读取点），供 `sillyspec config schema`（人类可读树 / --json 机读）打印与 `sillyspec init` 调 renderExample() 落盘脱敏 local.yaml.example。2026-08-23 起 test_strategy 枚举扩 skip / evidence-auto（`src/config-schema.js:120`，D-005@v2：skip=真跳过不回退全量、verify 输出显式标注留审计痕迹；evidence-auto=按变更 module-impact.md 影响面推荐检查组合，缺失/不可解析降级 module 并注记；full/module 语义不变），
新增 live 键 `decisions.behind_threshold`（`src/config-schema.js:165`，决策 behind 复核阈值缺省 10，reader 为 `readDecisionRulesConfig` src/docs-check.js）；renderExample 落盘段与示例注释同步扩。

**local-detect.js** 是纯 fs 项目类型嗅探（detectLocalYaml）：不 spawn 子进程、不耗 token，几秒完成项目类型判定；只返回数据结构不写盘（create/gate 无需为此跑完整 scan），落盘由 CLI 路由 / scan.js 调用方负责。

## 对外接口（表格）

### src/init.js
| 函数/常量 | 说明 | 参数 |
|-----------|------|------|
| `getVersion()` | 从 package.json 读取 SillySpec 版本号 | — |
| `cmdInit(projectDir, options?)` | 初始化项目 — 创建目录结构、安装 skills | `projectDir, {tools?, subprojects?}` |

### src/setup.js
| 函数/常量 | 说明 | 参数 |
|-----------|------|------|
| `cmdSetup(dir, options?)` | 配置工具 — 安装 MCP 服务器、全局工具 | `dir, options?` |

### src/migrate.js
| 函数/常量 | 说明 | 参数 |
|-----------|------|------|
| `migrateDocs(projectDir)` | 迁移旧版本文档到新结构 | `projectDir` |

## 关键数据流

1. **初始化流**: cmdInit → 检测/选择工具 → 创建 .sillyspec/ 目录 → 复制 skills → 生成配置 → 写入 .gitignore
2. **工具配置流**: cmdSetup → 扫描 MCP_CONFIG_PATHS → 检测已安装工具 → 交互选择 → 写入 MCP 配置文件
3. **迁移流**: migrateDocs → 读取旧格式文件 → 转换 → 写入新位置

## 设计决策（表格）

| 决策 | 原因 | 替代方案 |
|------|------|----------|
| 交互式工具选择（inquirer） | 用户环境多样，需灵活选择 | 自动检测 |
| VALID_TOOLS 硬编码列表 | 工具类型固定，可控 | 插件式注册 |
| MCP 配置路径按工具分开存储 | 不同工具有不同的配置文件位置 | 统一配置文件 |
| skills 按工具名子目录组织 | 各工具的 skill 格式不同 | 通用 skill 格式 |
| 迁移函数独立文件 | 迁移是一次性操作，与初始化逻辑解耦 | 内联到 init |

## 依赖关系
- 内部依赖：src/progress.js（ProgressManager，用于 init 中的数据库初始化）
- 外部依赖：@inquirer/prompts（checkbox, confirm, input）、chalk、ora、fs、path、child_process、url

## 注意事项
- VALID_TOOLS 和 TOOL_LABELS 必须同步维护
- cmdInit 支持 subprojects 参数，可为 monorepo 项目批量初始化
- setup.js 中的 MCP_CONFIG_PATHS 包含了各工具的配置文件路径（如 Claude 的 .claude/settings.json）
- migrate.js 假设旧格式目录结构存在，需在调用前检查
- getVersion 依赖 package.json 位置（通过 fileURLToPath 定位）

## 变更索引（表格，初始为空）
| 日期 | 变更名 | 摘要 |
|------|--------|------|
| 2026-08-19 | ql-20260819-015-65fa | init.js 子项目 repo 探测的 git remote get-url 改 execFileSync（去 shell 注入面） |
