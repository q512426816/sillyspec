# SillySpec v2.2 — 规范驱动开发工具包

> 融合 Superpowers + OpenSpec + GSD，**16 个命令**，从"你说要啥"到"代码能跑"的完整流程。
> Claude Code / Cursor / Codex / OpenCode / OpenClaw 都能用。
>
> 📖 **在线文档**：https://sillyspec.ppdmq.top/

## 安装

**macOS / Linux：**
```bash
curl -fsSL https://raw.githubusercontent.com/q512426816/sillyspec/main/scripts/init.sh | bash
```

**Windows PowerShell：**
```powershell
powershell -c "irm https://raw.githubusercontent.com/q512426816/sillyspec/main/install.ps1 | iex"
```

就这一行，装完就能用。

### 支持的 AI 工具

| 工具 | `--tool` 参数 | 输出目录 | 格式 |
|---|---|---|---|
| Claude Code (commands) | `claude` | `.claude/commands/sillyspec/` | slash commands |
| Claude Code (skills) | `claude_skills` | `.claude/skills/sillyspec-<name>/` | SKILL.md |
| Cursor | `cursor` | `.cursor/commands/` | custom commands |
| Codex | `codex` | `~/.agents/skills/sillyspec-<name>/` | SKILL.md |
| OpenCode | `opencode` | `.opencode/skills/sillyspec-<name>/` | SKILL.md |
| OpenClaw | `openclaw` | `.openclaw/skills/sillyspec-<name>/` | SKILL.md |

> 💡 现有 Claude Code commands 用户不受影响，16 个原始命令文件保持不变。

安装后重新打开终端，启动 Claude Code：

```bash
claude --dangerously-skip-permissions
```

> 💡 **推荐使用跳过权限模式。** SillySpec 的命令会频繁执行 `git commit`、文件读写、校验脚本等操作，停下来 50 次批准会失去意义。这是 GSD 和 OpenSpec 的预期使用方式。

## 入口选择

```
绿地项目（空目录）：/sillyspec:init
棕地项目（有代码）：/sillyspec:scan
随时自由思考：      /sillyspec:explore "想法"
```

## 完整工作流

```
绿地：init → brainstorm → propose → plan → execute → verify → archive
棕地：scan → brainstorm → propose → plan → execute → verify → archive
```

### 也可以跳过

- 小 bug：`/sillyspec:quick "修复 xxx"`
- 不确定要做什么：`/sillyspec:explore "想法"`
- 中断恢复：`/sillyspec:resume`
- 不知道下一步：`/sillyspec:continue`

## 15 个命令

| 命令 | 来源 | 用途 |
|---|---|---|
| `/sillyspec:init` | GSD new-project | 绿地项目：深度提问→需求→路线图 |
| `/sillyspec:scan` | GSD map-codebase | 棕地项目：生成 7 份代码库文档 |
| `/sillyspec:explore` | OpenSpec explore | 自由思考：画图、讨论、调研 |
| `/sillyspec:brainstorm` | Superpowers brainstorming | 需求探索：逐个提问→设计方案 |
| `/sillyspec:propose` | OpenSpec propose | 生成规范：proposal+design+tasks |
| `/sillyspec:plan` | Superpowers writing-plans | 实现计划：精确文件路径+代码 |
| `/sillyspec:execute` | Superpowers subagent-dev | TDD 执行：子代理并行+两阶段审查 |
| `/sillyspec:verify` | OpenSpec verify | 验证：对照规范+测试套件 |
| `/sillyspec:archive` | OpenSpec archive | 归档：规范沉淀 |
| `/sillyspec:status` | GSD progress | 查看进度 |
| `/sillyspec:continue` | GSD next | 自动下一步 |
| `/sillyspec:handoff` | GSD pause-work | 保存状态 |
| `/sillyspec:export` | SillySpec | 导出成功方案为可复用模板 |
| `/sillyspec:resume` | GSD resume-work | 恢复工作 |
| `/sillyspec:quick` | GSD quick | 快速模式 |
| `/sillyspec:workspace` | SillySpec | 工作区管理：多项目子项目管理 |

## 可靠性保障

SillySpec 不仅仅是 prompt，还有硬校验：

- **锚定确认** — propose/plan/execute/verify 执行前必须逐个确认读过规范文件
- **Hard Gate 自检** — 关键命令生成文件后强制自检格式，不通过则修正
- **校验脚本** — shell 脚本可自动化验证 AI 输出（validate-proposal/plan/scan/all）
- **归档确认** — archive 操作前展示内容等待用户确认

## 目录结构

```
sillyspec/
├── SKILL.md                         # 全局 skill
├── commands/sillyspec/              # ⭐ 16 个 slash commands（Claude Code 原始文件，不动）
├── templates/                       # 🆕 16 个纯 prompt 模板（工具无关）
├── adapters/                        # 🆕 适配器定义（多工具格式转换）
│   └── adapters.sh
│   ├── init.md                      # 绿地入口
│   ├── scan.md                      # 棕地扫描
│   ├── explore.md                   # 自由思考
│   ├── brainstorm.md                # 需求探索
│   ├── propose.md                   # 规范生成
│   ├── plan.md                      # 实现计划
│   ├── execute.md                   # TDD 执行
│   ├── verify.md                    # 验证
│   ├── archive.md                   # 归档
│   ├── status.md                    # 进度
│   ├── continue.md                  # 自动推进
│   ├── handoff.md                   # 状态保存
│   ├── resume.md                    # 恢复
│   ├── quick.md                     # 快速模式
│   └── export.md                    # 模板导出
├── scripts/
│   ├── init.sh                      # 一键安装
│   ├── validate-proposal.sh         # 校验 propose 阶段输出
│   ├── validate-plan.sh             # 校验 plan 阶段输出
│   ├── validate-scan.sh             # 校验 scan 阶段输出（7 份文档）
│   └── validate-all.sh              # 综合校验，一键检查项目状态
├── workspace.md                     # 工作区管理命令
├── 操作文档.md                       # 详细操作指南
└── README.md
```

## 校验脚本

验证 AI 生成文件是否符合规范：

```bash
# 校验 propose 阶段输出
./sillyspec/scripts/validate-proposal.sh .sillyspec/changes/your-change

# 校验 plan 阶段输出
./sillyspec/scripts/validate-plan.sh .sillyspec/changes/your-change

# 校验 scan 阶段输出（7 份文档）
./sillyspec/scripts/validate-scan.sh .planning/codebase

# 综合校验，一键检查当前项目状态
./sillyspec/scripts/validate-all.sh
```

## 致谢

- [Superpowers](https://github.com/obra/superpowers) — 工程纪律
- [OpenSpec](https://github.com/Fission-AI/OpenSpec) — 需求管理
- [GSD](https://github.com/gsd-build/get-shit-done) — 上下文工程

## License

MIT
