# SillySpec v2.0 — 规范驱动开发工具包

> 融合 Superpowers + OpenSpec + GSD，**14 个真实的 Claude Code slash commands**。
> 支持绿地项目和棕地项目。

## 这是什么？

不是参考文档。是 Claude Code 里的**真命令**——输入 `/sillyspec:` 就能看到。

基于三个顶级工具的**真实源码**重构：

| 来源 | 借鉴了什么 | 原版位置 |
|---|---|---|
| **Superpowers** | brainstorming skill、subagent-driven-dev、writing-plans、TDD | `skills/brainstorming/SKILL.md` 等 |
| **OpenSpec** | propose/verify/archive 变更管理、explore 思考模式 | `src/core/templates/workflows/explore.ts` |
| **GSD** | map-codebase 7 文档扫描、new-project 深度提问、HANDOFF 状态恢复 | `workflows/map-codebase.md` 等 |

## 安装

```bash
cd your-project
bash /path/to/sillyspec/scripts/init.sh
```

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

## 14 个命令

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
| `/sillyspec:resume` | GSD resume-work | 恢复工作 |
| `/sillyspec:quick` | GSD quick | 快速模式 |

## 目录结构

```
sillyspec/
├── SKILL.md                         # 全局 skill
├── commands/sillyspec/              # ⭐ 14 个 slash commands
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
│   └── quick.md                     # 快速模式
├── scripts/
│   ├── init.sh                      # 一键安装
│   ├── validate-proposal.sh         # 校验 propose 阶段输出
│   ├── validate-plan.sh             # 校验 plan 阶段输出
│   ├── validate-scan.sh             # 校验 scan 阶段输出（7 份文档）
│   └── validate-all.sh              # 综合校验，一键检查项目状态
└── README.md
```

## 校验脚本

验证 AI 生成文件是否符合规范：

```bash
# 校验 propose 阶段输出
./sillyspec/scripts/validate-proposal.sh openspec/changes/your-change

# 校验 plan 阶段输出
./sillyspec/scripts/validate-plan.sh openspec/changes/your-change

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
