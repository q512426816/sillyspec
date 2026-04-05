# 目录结构

## .sillyspec/ 完整结构

```
.sillyspec/
├── STATE.md              # 当前工作状态（AI 直接读写）
├── projects/             # 子项目注册表
│   └── <name>.yaml       # 每个项目的 name/path/status
├── docs/                 # 统一文档中心
│   └── <project>/
│       ├── scan/         # 代码库扫描结果
│       ├── brainstorm/   # 头脑风暴 + 设计文档
│       ├── plan/         # 实现计划
│       ├── changes/      # 变更记录（proposal + design + tasks）
│       ├── archive/      # 归档文档
│       └── quicklog/     # 快速任务日志
├── knowledge/            # 沉淀的可复用知识
└── .runtime/
    └── progress.json     # 进度追踪文件
```

## 变更目录结构

每个变更包含三件套：

```
.sillyspec/docs/<project>/changes/<change-name>/
├── proposal.md    # 变更提案
├── design.md      # 设计文档
└── tasks.md       # 任务列表（按 Wave 分组）
```

## projects/ 注册表

每个子项目一个 YAML 文件：

```yaml
name: my-app
path: /path/to/my-app
status: active
```

## 说明

- **STATE.md** — AI 的工作记忆，记录当前阶段和下一步
- **projects/** — 工作区模式下管理多个子项目
- **docs/** — 所有文档统一存放，按项目 + 类型组织
- **knowledge/** — 从 archive 沉淀的可复用模板和经验
- **.runtime/** — 运行时数据，不需要手动编辑
